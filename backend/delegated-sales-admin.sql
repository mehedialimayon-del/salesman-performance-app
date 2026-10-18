-- A delegated administrator never becomes the immutable root owner.
create or replace function ffh_private.is_administrator() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.ffh_profiles p where p.auth_user_id=auth.uid() and p.active and p.login_approved and (p.staff_id='M21954' or (p.owner_access and p.can_manage)))
$$;
revoke all on function ffh_private.is_administrator() from public,anon;
grant execute on function ffh_private.is_administrator() to authenticated,service_role;
create or replace function public.ffh_owner() returns boolean language sql stable security invoker set search_path='' as $$select ffh_private.is_administrator()$$;
create or replace function public.ffh_profile_security_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if auth.uid() is null or ffh_private.is_owner() then return new;end if;
 if old.staff_id='M21954' or new.staff_id='M21954' then raise exception 'Ayon owner account is protected' using errcode='42501';end if;
 if ffh_private.is_administrator() and old.staff_id<>public.ffh_my_staff_id() then
  if new.staff_id is distinct from old.staff_id or new.auth_user_id is distinct from old.auth_user_id or new.owner_access is distinct from old.owner_access then raise exception 'Only Ayon changes administrator authority or login identity' using errcode='42501';end if;
  return new;
 end if;
 if (to_jsonb(new)-array['full_name','photo_url','contact_email','must_change_password','updated_at']) is distinct from (to_jsonb(old)-array['full_name','photo_url','contact_email','must_change_password','updated_at']) then raise exception 'Only Ayon changes your account permissions' using errcode='42501';end if;return new;
end$$;
-- This guard applies even when another permissive RLS policy or SECURITY DEFINER RPC allows a write.
create or replace function ffh_private.protect_root_records() returns trigger language plpgsql security definer set search_path='' as $$
declare b jsonb; a jsonb; r jsonb; k text; sid text:=public.ffh_my_staff_id();begin
 if auth.uid() is null or ffh_private.is_owner() then if TG_OP='DELETE' then return old;else return new;end if;end if;
 if TG_OP<>'INSERT' then b:=to_jsonb(old);end if;if TG_OP<>'DELETE' then a:=to_jsonb(new);end if;
 for r in select value from jsonb_array_elements(jsonb_build_array(b,a)) where value<>'null'::jsonb loop
  foreach k in array array['staff_id','sr_id','assigned_to','owner_staff_id','viewer_staff_id'] loop
   if r->>k='M21954' then raise exception 'Ayon owner records are protected' using errcode='42501';end if;
  end loop;
  if TG_TABLE_NAME in ('ffh_zone_access','ffh_access_grants') and r->>'staff_id'=sid then raise exception 'Only Ayon changes administrator own access' using errcode='42501';end if;
  if TG_TABLE_NAME='ffh_profiles' and TG_OP='INSERT' and coalesce((r->>'owner_access')::boolean,false) then raise exception 'Only Ayon delegates administrator authority' using errcode='42501';end if;
 end loop;
 if TG_OP='DELETE' then return old;else return new;end if;
end$$;
revoke all on function ffh_private.protect_root_records() from public,anon,authenticated;
do $$declare t text;begin for t in select distinct event_object_table from information_schema.triggers where trigger_schema='public' and trigger_name='ffh_change_audit' loop
 execute format('create trigger ffh_protect_root before insert or update or delete on public.%I for each row execute function ffh_private.protect_root_records()',t);
end loop;end$$;

CREATE OR REPLACE FUNCTION ffh_private.governance(action text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid text:=public.ffh_my_staff_id();own boolean:=ffh_private.is_administrator();root_owner boolean:=ffh_private.is_owner();target text;z text;g jsonb;item ffh_private.trash%rowtype;m text;cols text;rec jsonb;affected int;perm text;begin
 if auth.uid() is null or sid is null then raise exception 'Active login required' using errcode='42501';end if;
 if action='state' then return jsonb_build_object('owner',root_owner,'administrator',own,
 'profiles',coalesce((select jsonb_agg(to_jsonb(p)-'auth_user_id') from public.ffh_profiles p where public.ffh_staff_view(p.staff_id)),'[]'),
 'zones',coalesce((select jsonb_agg(to_jsonb(zone_row)) from public.ffh_zones zone_row where ffh_private.zone_visible(zone_row.id)),'[]'),
 'zone_access',coalesce((select jsonb_agg(to_jsonb(a)) from public.ffh_zone_access a where own or a.staff_id=sid),'[]'),
 'grants',coalesce((select jsonb_agg(to_jsonb(grant_row)) from public.ffh_access_grants grant_row where own or grant_row.staff_id=sid),'[]'),
 'requests',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from public.ffh_change_requests q where own or q.staff_id=sid),'[]'),
 'outlets',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'sr_id',o.sr_id,'outlet_name',o.outlet_name,'outlet_code',o.outlet_code,'active',o.active,'total_sku',o.total_sku)) from public.ffh_outlets o where own or public.ffh_staff_view(o.sr_id)),'[]'));
 elsif action='save_access' then
 if not own then raise exception 'Only Ayon changes access' using errcode='42501';end if;
 target:=payload->>'staff_id';if not root_owner and target=sid then raise exception 'Only Ayon changes administrator own access' using errcode='42501';end if;if target='M21954' or not exists(select 1 from public.ffh_profiles where staff_id=target) then raise exception 'Invalid target';end if;
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
 update public.ffh_profiles set designation=payload->>'designation',manager_id=nullif(payload->>'manager_id',''),team_name=coalesce(payload->>'team_name',''),route_name=coalesce(payload->>'route_name',''),business_title=payload->>'designation',access_all_zones=(payload->'zones' ? '*'),accessible_zones=array(select jsonb_array_elements_text(payload->'zones')),owner_access=case when root_owner and payload ? 'administrator' then (payload->>'administrator')::boolean else owner_access end where staff_id=target;
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
 if not root_owner and (payload->>'from'='M21954' or payload->>'to'='M21954') then raise exception 'Owner route is protected' using errcode='42501';end if;target:=payload->>'to';if not exists(select 1 from public.ffh_profiles where staff_id=target and can_sell and active) or target=payload->>'from' then raise exception 'Choose an active SR recipient';end if;
 insert into public.ffh_outlets(sr_id,outlet_code,outlet_name,category,total_sku,active,source,assigned_at)
 select target,outlet_code,outlet_name,category,total_sku,true,'owner route transfer',now() from public.ffh_outlets where sr_id=payload->>'from' and active
 on conflict(sr_id,outlet_code) do update set active=true,outlet_name=excluded.outlet_name,category=excluded.category,total_sku=excluded.total_sku,updated_at=now();
 update public.ffh_outlets set active=false,updated_at=now() where sr_id=payload->>'from';
 update public.ffh_profiles set can_sell=false where staff_id=payload->>'from';return jsonb_build_object('saved',true);
 else raise exception 'Unknown management action';end if;
end$function$;

-- Directory remains company-wide; delegated administrators can edit everyone except Ayon's own entry.
create policy contacts_administrator_update on public.ffh_contacts for update to authenticated
using(ffh_private.is_administrator()) with check(ffh_private.is_administrator());
create or replace function ffh_private.protect_owner_contact() returns trigger language plpgsql security definer set search_path='' as $$
declare entry jsonb;owner_name text;begin
 if auth.uid() is null or ffh_private.is_owner() then return new;end if;
 select lower(full_name) into owner_name from public.ffh_profiles where staff_id='M21954';
 for entry in select value from jsonb_array_elements(old.contacts) where value->>'staff_id'='M21954' or lower(trim(value->>'name'))=owner_name loop
  if not exists(select 1 from jsonb_array_elements(new.contacts) n where n=entry) then raise exception 'Ayon owner contact is protected' using errcode='42501';end if;
 end loop;return new;
end$$;
revoke all on function ffh_private.protect_owner_contact() from public,anon,authenticated;
create trigger ffh_protect_owner_contact before update on public.ffh_contacts for each row execute function ffh_private.protect_owner_contact();
