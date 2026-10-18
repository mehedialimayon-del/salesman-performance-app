create table if not exists public.ffh_catalogue_tombstones(id text primary key,item_code text not null default '',created_at timestamptz not null default now());
alter table public.ffh_catalogue_tombstones enable row level security;
grant select on public.ffh_catalogue_tombstones to authenticated;
create policy ffh_catalogue_tombstones_read on public.ffh_catalogue_tombstones for select to authenticated using(public.ffh_my_staff_id() is not null);
create or replace function ffh_private.capture_change() returns trigger language plpgsql security definer set search_path='' as $$
 declare b jsonb; a jsonb; r jsonb; k jsonb; sid text; nm text; z text; feature text:=TG_ARGV[0]; subject text;
 begin
 b:=case when TG_OP<>'INSERT' then to_jsonb(old) end; a:=case when TG_OP<>'DELETE' then to_jsonb(new) end;r:=coalesce(a,b);
 select staff_id,full_name,zone_id into sid,nm,z from public.ffh_profiles where auth_user_id=auth.uid() and active and login_approved;
 select jsonb_object_agg(att.attname,r->att.attname) into k from pg_catalog.pg_index ix join pg_catalog.pg_attribute att on att.attrelid=ix.indrelid and att.attnum=any(ix.indkey) where ix.indrelid=TG_RELID and ix.indisprimary;
 if k is null then raise exception 'Audited record needs primary key';end if;
 subject:=coalesce(r->>'sr_id',r->>'staff_id',r->>'assigned_to',r->>'owner_staff_id');
 if TG_OP='DELETE' and auth.uid() is not null then
  if sid is null or not ffh_private.allowed(feature,'delete') or (subject is not null and subject<>'ALL' and not ffh_private.staff_visible(subject)) then raise exception 'Delete permission required; request owner approval' using errcode='42501';end if;
  if TG_TABLE_NAME='ffh_profiles' and r->>'staff_id'='M21954' then raise exception 'Owner cannot be deleted';end if;
 end if;
 if TG_OP='UPDATE' and b=a then return new;end if;
 if TG_TABLE_NAME in ('ffh_catalogue_products','ffh_catalogue_categories','ffh_briefings','ffh_reward_offers') and TG_OP='UPDATE' and b->>'active'='true' and a->>'active'='false' then
  if auth.uid() is not null and not ffh_private.allowed(feature,'delete') then raise exception 'Delete permission required' using errcode='42501';end if;
  insert into ffh_private.trash(table_name,row_key,row_data,deleted_by) values(TG_TABLE_NAME,k,b||jsonb_build_object('_soft_delete',true,'_deleted_after',a),sid);
 end if;
 insert into ffh_private.change_history(actor,actor_name,actor_zone,table_name,operation,row_key,before_data,after_data) values(sid,nm,z,TG_TABLE_NAME,TG_OP,k,b,a);
 if TG_OP='DELETE' then insert into ffh_private.trash(table_name,row_key,row_data,deleted_by) values(TG_TABLE_NAME,k,b,sid);return old;end if;
 return new;
 end $$;

create or replace function ffh_private.governance(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();own boolean:=ffh_private.is_owner();target text;z text;g jsonb;item ffh_private.trash%rowtype;m text;cols text;rec jsonb;affected int;perm text;begin
 if auth.uid() is null or sid is null then raise exception 'Active login required' using errcode='42501';end if;
 if action='state' then return jsonb_build_object('owner',own,
 'profiles',coalesce((select jsonb_agg(to_jsonb(p)-'auth_user_id') from public.ffh_profiles p where public.ffh_staff_view(p.staff_id)),'[]'),
 'zones',coalesce((select jsonb_agg(to_jsonb(z)) from public.ffh_zones z where ffh_private.zone_visible(z.id)),'[]'),
 'zone_access',coalesce((select jsonb_agg(to_jsonb(a)) from public.ffh_zone_access a where own or a.staff_id=sid),'[]'),
 'grants',coalesce((select jsonb_agg(to_jsonb(g)) from public.ffh_access_grants g where own or g.staff_id=sid),'[]'),
 'requests',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from public.ffh_change_requests q where own or q.staff_id=sid),'[]'),
 'outlets',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'sr_id',o.sr_id,'outlet_name',o.outlet_name,'outlet_code',o.outlet_code,'active',o.active)) from public.ffh_outlets o where own or public.ffh_staff_view(o.sr_id)),'[]'));
 elsif action='save_access' then
 if not own then raise exception 'Only Ayon changes access' using errcode='42501';end if;
 target:=payload->>'staff_id';if target='M21954' or not exists(select 1 from public.ffh_profiles where staff_id=target) then raise exception 'Invalid target';end if;
 if jsonb_typeof(payload->'zones')<>'array' or jsonb_typeof(payload->'grants')<>'array' then raise exception 'Zones and permissions required';end if;
 if exists(select 1 from jsonb_array_elements_text(payload->'zones') v where v<>'*' and not exists(select 1 from public.ffh_zones z where z.id=v)) then raise exception 'Unknown zone';end if;
 if coalesce(payload->>'manager_id','')<>'' and not exists(select 1 from public.ffh_profiles p where p.staff_id=payload->>'manager_id' and p.can_manage and p.staff_id<>target and p.active and p.zone_id=(select zone_id from public.ffh_profiles where staff_id=target)) then raise exception 'Choose an active manager in the home zone';end if;
 if payload->>'designation' not in ('SR','MANAGER','SALES_ADMIN','HEAD_OF_SALES','MD','ACCOUNTS') then raise exception 'Invalid designation';end if;
 delete from public.ffh_zone_access where staff_id=target;
 insert into public.ffh_zone_access select target,v from (select distinct jsonb_array_elements_text(payload->'zones') v) x;
 delete from public.ffh_access_grants where staff_id=target;
 for g in select value from jsonb_array_elements(payload->'grants') loop
 perm:=g->>'module';if perm not in ('*','accounts_create','accounts_edit','accounts','catalogue','outlets','routes','sales','tasks','cpo','income','kb','briefings','settings','proposals','claims','notifications') then raise exception 'Unknown module';end if;
 insert into public.ffh_access_grants(staff_id,module,can_edit,can_upload,can_delete) values(target,perm,coalesce((g->>'can_edit')::boolean,false),coalesce((g->>'can_upload')::boolean,false),coalesce((g->>'can_delete')::boolean,false));end loop;
 update public.ffh_profiles set designation=payload->>'designation',manager_id=nullif(payload->>'manager_id',''),team_name=coalesce(payload->>'team_name',''),route_name=coalesce(payload->>'route_name',''),business_title=payload->>'designation',access_all_zones=(payload->'zones' ? '*'),accessible_zones=array(select jsonb_array_elements_text(payload->'zones')),owner_access=false where staff_id=target;
 return jsonb_build_object('saved',true);
 elsif action='history' then
 if not own then raise exception 'Only Ayon can view change history' using errcode='42501';end if;
 m:=payload->>'month';if m !~ '^\d{4}-\d{2}$' then raise exception 'Choose a month';end if;
 return coalesce((select jsonb_agg(to_jsonb(a) order by a.id desc) from (select * from ffh_private.change_history where occurred_at>= (m||'-01')::date::timestamp at time zone 'Asia/Kuala_Lumpur' and occurred_at< ((m||'-01')::date+interval '1 month')::timestamp at time zone 'Asia/Kuala_Lumpur' and (own or actor=sid) order by id desc limit least(greatest(coalesce((payload->>'limit')::int,1000),1),1000) offset greatest(coalesce((payload->>'offset')::int,0),0)) a),'[]');
 elsif action='trash' then if not own then raise exception 'Only Ayon can view Trash Bin' using errcode='42501';end if; return coalesce((select jsonb_agg(to_jsonb(t)-'row_data' order by t.id desc) from ffh_private.trash t where t.status='Deleted' and (own or t.deleted_by=sid)),'[]');
 elsif action in ('restore','purge') then
 select * into item from ffh_private.trash where id=(payload->>'id')::bigint and status='Deleted' for update;
 if not found or not own then raise exception 'Owner approval required' using errcode='42501';end if;
 if action='restore' then
  -- Original keys are inserted; a collision fails rather than overwriting newer work.
  if item.row_data->>'_soft_delete'='true' then
   execute format('select to_jsonb(t) from public.%I t where to_jsonb(t) @> $1 for update',item.table_name) into rec using item.row_key;
   if rec is null or (rec-'updated_at') is distinct from ((item.row_data->'_deleted_after')-'updated_at') then raise exception 'Record changed after removal; restore would overwrite newer work';end if;
   select string_agg(quote_ident(attname),',') into cols from pg_catalog.pg_attribute where attrelid=('public.'||quote_ident(item.table_name))::regclass and attnum>0 and not attisdropped and attgenerated='' and attidentity='';
   perform set_config('ffh.restore_trash_id',item.id::text,true);
   execute format('update public.%I t set (%s)=(select %s from jsonb_populate_record(null::public.%I,$1)) where to_jsonb(t) @> $2',item.table_name,cols,cols,item.table_name) using item.row_data-'_soft_delete'-'_deleted_after',item.row_key;
  elsif item.row_data->>'_shared_item'='true' then
   select sc.payload into rec from public.ffh_shared_content sc where sc.content_key=item.row_data->>'content_key' for update;
   if exists(select 1 from jsonb_array_elements(coalesce(rec,'[]')) c where c->>'id'=item.row_key->>'item_id') then raise exception 'A record with this ID already exists';end if;
   perform public.ffh_publish_campaigns(coalesce(rec,'[]')||jsonb_build_array(item.row_data->'item'));
  else
  perform set_config('ffh.restore_trash_id',item.id::text,true);
  execute format('insert into public.%I select (jsonb_populate_record(null::public.%I,$1)).*',item.table_name,item.table_name) using item.row_data;
  end if;
  update ffh_private.trash set status='Restored',resolved_at=now() where id=item.id;
 else
  if item.row_data->>'_soft_delete'='true' then
   execute format('select to_jsonb(t) from public.%I t where to_jsonb(t) @> $1 for update',item.table_name) into rec using item.row_key;
   if rec is null or (rec-'updated_at') is distinct from ((item.row_data->'_deleted_after')-'updated_at') then raise exception 'Record changed after removal; cannot purge newer work';end if;
   if item.table_name='ffh_catalogue_products' then insert into public.ffh_catalogue_tombstones(id,item_code) values(item.row_key->>'id',coalesce(rec->>'item_code','')) on conflict(id) do nothing;end if;
   execute format('delete from public.%I t where to_jsonb(t) @> $1',item.table_name) using item.row_key;
  end if;
  update ffh_private.trash set status='Purged',row_data=null,resolved_at=now() where table_name=item.table_name and row_key=item.row_key;
  -- Keep who/when/what metadata, erase recoverable business values.
  update ffh_private.change_history set before_data=null,after_data=null where table_name=item.table_name and row_key=item.row_key;
 end if;
 insert into ffh_private.change_history(actor,actor_name,actor_zone,table_name,operation,row_key) select sid,full_name,zone_id,item.table_name,upper(action),item.row_key from public.ffh_profiles where staff_id=sid;
 return jsonb_build_object('saved',true);
 elsif action='request' then
 if coalesce(payload->>'reason','')='' or payload->>'action' not in ('edit','delete') then raise exception 'Action and reason required';end if;
 insert into public.ffh_change_requests(staff_id,action,module,record_id,reason) values(sid,payload->>'action',payload->>'module',payload->>'record_id',payload->>'reason');
 return jsonb_build_object('saved',true);
 elsif action='review_request' then
 if not own then raise exception 'Owner required';end if;
 if payload->>'status' not in ('Approved','Rejected') then raise exception 'Invalid review';end if;
 update public.ffh_change_requests set status=payload->>'status',reviewed_by=sid,reviewed_at=now() where id=(payload->>'id')::uuid and status='Pending';return jsonb_build_object('saved',true);
 elsif action='transfer_route' then
 if not own then raise exception 'Owner required';end if;
 target:=payload->>'to';if not exists(select 1 from public.ffh_profiles where staff_id=target and can_sell and active) or target=payload->>'from' then raise exception 'Choose an active SR recipient';end if;
 insert into public.ffh_outlets(sr_id,outlet_code,outlet_name,category,total_sku,active,source,assigned_at)
 select target,outlet_code,outlet_name,category,total_sku,true,'owner route transfer',now() from public.ffh_outlets where sr_id=payload->>'from' and active
 on conflict(sr_id,outlet_code) do update set active=true,outlet_name=excluded.outlet_name,category=excluded.category,total_sku=excluded.total_sku,updated_at=now();
 update public.ffh_outlets set active=false,updated_at=now() where sr_id=payload->>'from';
 update public.ffh_profiles set can_sell=false where staff_id=payload->>'from';return jsonb_build_object('saved',true);
 else raise exception 'Unknown management action';end if;
end$$;
