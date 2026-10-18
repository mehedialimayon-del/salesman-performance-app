-- Company scope and independent permissions. Existing staff IDs remain immutable.
begin;
alter table public.ffh_profiles add column if not exists designation text not null default 'SR';
alter table public.ffh_profiles add column if not exists manager_id text references public.ffh_profiles(staff_id);
alter table public.ffh_profiles add column if not exists team_name text not null default '';
alter table public.ffh_profiles add column if not exists route_name text not null default '';
alter table public.ffh_profiles add column if not exists business_title text not null default '';
alter table public.ffh_profiles add column if not exists access_all_zones boolean not null default false;
alter table public.ffh_profiles add column if not exists accessible_zones text[] not null default '{}';
update public.ffh_profiles set designation=coalesce(nullif(business_title,''),role) where designation='SR' and role='MANAGER';
create table if not exists public.ffh_zone_access(staff_id text not null references public.ffh_profiles(staff_id),zone_id text not null,primary key(staff_id,zone_id));
insert into public.ffh_zone_access(staff_id,zone_id) select p.staff_id,z from public.ffh_profiles p cross join lateral unnest(case when p.access_all_zones then array['*'] else p.accessible_zones end) z on conflict do nothing;
alter table public.ffh_zone_access enable row level security;
grant select on public.ffh_zone_access to authenticated;
grant all on public.ffh_zone_access to service_role;
alter table public.ffh_access_grants add column if not exists can_upload boolean not null default false;
alter table public.ffh_access_grants add column if not exists can_delete boolean not null default false;
-- Never reinterpret a previously delegated edit permission as delete permission.
create table if not exists ffh_private.change_history(
 id bigint generated always as identity primary key, occurred_at timestamptz not null default clock_timestamp(),
 actor text,actor_name text,actor_zone text,table_name text not null,operation text not null,
 row_key jsonb not null,before_data jsonb,after_data jsonb,transaction_id bigint not null default txid_current());
create index if not exists ffh_history_month on ffh_private.change_history(occurred_at desc);
create table if not exists ffh_private.trash(
 id bigint generated always as identity primary key,table_name text not null,row_key jsonb not null,row_data jsonb,
 deleted_by text,deleted_at timestamptz not null default clock_timestamp(),status text not null default 'Deleted',
 resolved_at timestamptz,transaction_id bigint not null default txid_current());
create table if not exists public.ffh_change_requests(
 id uuid primary key default gen_random_uuid(),staff_id text not null,action text not null check(action in ('edit','delete')),
 module text not null,record_id text not null,reason text not null,status text not null default 'Pending',
 created_at timestamptz not null default now(),reviewed_by text,reviewed_at timestamptz);
alter table public.ffh_change_requests enable row level security;
grant select,insert on public.ffh_change_requests to authenticated;grant all on public.ffh_change_requests to service_role;
alter table ffh_private.change_history enable row level security;
alter table ffh_private.trash enable row level security;
revoke all on ffh_private.change_history,ffh_private.trash from public,anon,authenticated;

create or replace function ffh_private.is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.ffh_profiles p where p.auth_user_id=auth.uid() and p.staff_id='M21954' and p.active and p.login_approved)
$$;
create or replace function ffh_private.zone_visible(z text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.ffh_profiles p where p.auth_user_id=auth.uid() and p.active and p.login_approved and
 (p.staff_id='M21954' or (p.can_manage and (p.zone_id=z or exists(select 1 from public.ffh_zone_access a where a.staff_id=p.staff_id and a.zone_id in (z,'*'))))))
$$;
create or replace function ffh_private.allowed(feature text,verb text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (ffh_private.is_owner() or exists(select 1 from public.ffh_profiles p join public.ffh_access_grants g on g.staff_id=p.staff_id
 where p.auth_user_id=auth.uid() and p.active and p.login_approved and g.module in (feature,'*') and
 case verb when 'edit' then g.can_edit when 'upload' then g.can_upload when 'delete' then g.can_delete else false end))
$$;
create or replace function public.ffh_owner() returns boolean language sql stable security invoker set search_path='' as $$select ffh_private.is_owner()$$;
create or replace function public.ffh_module_edit(feature text) returns boolean language sql stable security invoker set search_path='' as $$select ffh_private.allowed(feature,'edit')$$;
create or replace function ffh_private.staff_visible(target text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (ffh_private.is_owner() or target=public.ffh_my_staff_id() or exists(select 1 from public.ffh_profiles p where p.staff_id=target and ffh_private.zone_visible(p.zone_id)))
$$;
create or replace function public.ffh_staff_view(target_staff text) returns boolean language sql stable security invoker set search_path='' as $$select ffh_private.staff_visible(target_staff)$$;
create or replace function public.ffh_staff_edit(target_staff text,feature text) returns boolean language sql stable security invoker set search_path='' as $$select ffh_private.allowed(feature,'edit') and ffh_private.staff_visible(target_staff)$$;
create policy ffh_zone_access_read on public.ffh_zone_access for select to authenticated using(ffh_private.is_owner() or staff_id=public.ffh_my_staff_id());
create policy ffh_changes_read on public.ffh_change_requests for select to authenticated using(ffh_private.is_owner() or staff_id=public.ffh_my_staff_id());
create policy ffh_changes_create on public.ffh_change_requests for insert to authenticated with check(staff_id=public.ffh_my_staff_id() and status='Pending' and reviewed_by is null and reviewed_at is null);
-- Restrictive predicates also apply to older permissive policies.
create policy ffh_income_scoped on public.ffh_income_entries as restrictive for select to authenticated using(public.ffh_staff_view(staff_id));
create policy ffh_events_scoped on public.ffh_income_events as restrictive for select to authenticated using(exists(select 1 from public.ffh_income_entries e where e.id=entry_id));
create policy ffh_notifications_scoped on public.ffh_notification_inbox as restrictive for select to authenticated using(public.ffh_staff_view(staff_id));

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
create or replace function ffh_private.delete_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();r jsonb:=to_jsonb(old);subject text;begin
 if auth.uid() is null then return old;end if;
 subject:=coalesce(r->>'sr_id',r->>'staff_id',r->>'assigned_to',r->>'owner_staff_id');
 if sid is null or not ffh_private.allowed(TG_ARGV[0],'delete') or (subject is not null and subject<>'ALL' and not ffh_private.staff_visible(subject)) then raise exception 'Delete permission required; request owner approval' using errcode='42501';end if;
 if TG_TABLE_NAME='ffh_profiles' and r->>'staff_id'='M21954' then raise exception 'Owner cannot be deleted';end if;return old;
end$$;
-- Log every business edit, not the high-volume device heartbeat/GPS stream.
do $$declare t text; f text;begin
 for t,f in select * from (values
 ('ffh_profiles','accounts'),('ffh_zones','accounts'),('ffh_zone_access','accounts'),('ffh_access_grants','accounts'),
 ('ffh_sales','sales'),('ffh_outlets','outlets'),('ffh_routes','routes'),('ffh_tasks','tasks'),
 ('ffh_campaigns','cpo'),('ffh_campaign_executions','cpo'),('ffh_shared_content','settings'),
 ('ffh_catalogue_products','catalogue'),('ffh_catalogue_categories','catalogue'),('ffh_proposals','proposals'),
 ('ffh_income_settings','income'),('ffh_income_entries','income'),('ffh_reward_offers','income'),('ffh_adjustments','income'),
 ('ffh_briefings','briefings'),('ffh_ai_knowledge','kb'),('ffh_settings','settings'),('ffh_favorite_lists','catalogue'),
 ('ffh_change_requests','accounts'),('ffh_claims','claims'),('ffh_claim_lines','claims'),('ffh_meeting_minutes','briefings'),('ffh_dated_minutes','briefings')) v(t,f)
 loop execute format('create trigger ffh_change_audit after insert or update or delete on public.%I for each row execute function ffh_private.capture_change(%L)',t,f);
 execute format('create trigger ffh_delete_guard before delete on public.%I for each row execute function ffh_private.delete_guard(%L)',t,f);
 end loop;
end$$;
create or replace function ffh_private.governance(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();own boolean:=ffh_private.is_owner();target text;z text;g jsonb;item ffh_private.trash%rowtype;m text;cols text;rec jsonb;affected int;perm text;begin
 if auth.uid() is null or sid is null then raise exception 'Active login required' using errcode='42501';end if;
 if action='state' then return jsonb_build_object('owner',own,
 'profiles',coalesce((select jsonb_agg(to_jsonb(p)-'auth_user_id') from public.ffh_profiles p where public.ffh_staff_view(p.staff_id)),'[]'),
 'zones',coalesce((select jsonb_agg(to_jsonb(zone_row)) from public.ffh_zones zone_row where ffh_private.zone_visible(zone_row.id)),'[]'),
 'zone_access',coalesce((select jsonb_agg(to_jsonb(a)) from public.ffh_zone_access a where own or a.staff_id=sid),'[]'),
 'grants',coalesce((select jsonb_agg(to_jsonb(grant_row)) from public.ffh_access_grants grant_row where own or grant_row.staff_id=sid),'[]'),
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
create or replace function public.ffh_governance(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.governance(action,payload)$$;
do $$declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ffh_private' and p.proname in ('is_owner','zone_visible','allowed','staff_visible','governance') loop execute format('revoke all on function %s from public,anon',f);execute format('grant execute on function %s to authenticated,service_role',f);end loop;end$$;
revoke all on function public.ffh_governance(text,jsonb) from public,anon;grant execute on function public.ffh_governance(text,jsonb) to authenticated;
revoke all on function ffh_private.capture_change(),ffh_private.delete_guard() from public,anon,authenticated;
-- Owner is management-only. Historic sales remain owned by their original staff ID.
update public.ffh_profiles set can_sell=false,designation='MANAGER' where staff_id='M21954';
commit;
