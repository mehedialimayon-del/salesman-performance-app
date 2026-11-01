-- Owner-controlled Head Office account, independent of other delegated admins.
create or replace function ffh_private.protect_head_office() returns trigger
language plpgsql security definer set search_path='' as $$
declare a jsonb; b jsonb; begin
 if TG_OP<>'DELETE' then a:=to_jsonb(new);end if;
 if TG_OP<>'INSERT' then b:=to_jsonb(old);end if;
 if coalesce(a->>'staff_id','')='PERVES_HIRA' or coalesce(b->>'staff_id','')='PERVES_HIRA' then
  if auth.uid() is not null and not ffh_private.is_owner() then
   raise exception 'Only Ayon changes Perves Hira Head Office account and access' using errcode='42501';
  end if;
  if TG_TABLE_NAME='ffh_access_grants' and a->>'module'='kb' and
    (coalesce((a->>'can_edit')::boolean,false) or coalesce((a->>'can_upload')::boolean,false) or coalesce((a->>'can_delete')::boolean,false)) then
   raise exception 'AI_BASE editing is disabled for Head Office' using errcode='42501';
  end if;
 end if;
 if TG_OP='DELETE' then return old;else return new;end if;
end$$;
revoke all on function ffh_private.protect_head_office() from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['ffh_profiles','ffh_zone_access','ffh_access_grants'] loop
 execute format('create trigger ffh_head_office_owner before insert or update or delete on public.%I for each row execute function ffh_private.protect_head_office()',t);
end loop;end$$;

-- Inactive zones disappear from Head Office scope immediately on the server.
create or replace function ffh_private.zone_visible(z text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.ffh_profiles p
 where p.auth_user_id=auth.uid() and p.active and p.login_approved and
 (p.staff_id='M21954' or (p.can_manage and
 (p.staff_id<>'PERVES_HIRA' or exists(select 1 from public.ffh_zones zone where zone.id=z and zone.active)) and
 (p.zone_id=z or exists(select 1 from public.ffh_zone_access a where a.staff_id=p.staff_id and a.zone_id in (z,'*'))))))
$$;

CREATE OR REPLACE FUNCTION ffh_private.allowed(feature text, verb text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and (ffh_private.is_owner() or exists(
 select 1 from public.ffh_profiles p join lateral (
 select g.* from public.ffh_access_grants g where g.staff_id=p.staff_id and (g.module=feature or (feature like 'income_%' and g.module='income') or (feature<>'kb' and g.module='*'))
 order by case when g.module=feature then 0 when g.module='*' then 2 else 1 end limit 1) g on true
 where p.auth_user_id=auth.uid() and (p.staff_id<>'PERVES_HIRA' or feature<>'kb') and p.active and p.login_approved and case verb when 'edit' then g.can_edit when 'upload' then g.can_upload when 'delete' then g.can_delete else false end))
$function$
;
CREATE OR REPLACE FUNCTION ffh_private.governance(action text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid text:=public.ffh_my_staff_id();own boolean:=ffh_private.is_administrator();root_owner boolean:=ffh_private.is_owner();target text;z text;g jsonb;item ffh_private.trash%rowtype;m text;cols text;rec jsonb;affected int;perm text;begin
 if auth.uid() is null or sid is null then raise exception 'Active login required' using errcode='42501';end if;
 if action='set_zone_active' then
 if not root_owner then raise exception 'Only Ayon activates zones' using errcode='42501';end if;
 z:=payload->>'zone_id';
 update public.ffh_zones set active=(payload->>'active')::boolean where id=z;
 if not found then raise exception 'Unknown zone';end if;
 return jsonb_build_object('saved',true);
 elsif action='head_office_activity' then
 if not root_owner and sid<>'PERVES_HIRA' then raise exception 'Head Office access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(a)-array['before_data','after_data'] order by a.id desc) from
 (select * from ffh_private.change_history h where h.table_name in ('ffh_sales','ffh_tasks','ffh_routes','ffh_campaigns','ffh_campaign_executions','ffh_outlets','ffh_briefings','ffh_claims','ffh_claim_lines','ffh_adjustments','ffh_income_entries')
 and (root_owner or ffh_private.staff_visible(h.actor)) order by h.id desc limit 100) a),'[]');
 elsif action='state' then return jsonb_build_object('owner',root_owner,'administrator',own,
 'my_manager',(select jsonb_build_object('staff_id',m.staff_id,'full_name',m.full_name,'contact_email',m.contact_email,'zone_id',m.zone_id) from public.ffh_profiles me join public.ffh_profiles m on m.staff_id=me.manager_id where me.staff_id=sid and m.active and m.login_approved),
 'profiles',coalesce((select jsonb_agg((to_jsonb(p)-'auth_user_id')||jsonb_build_object('has_login',p.auth_user_id is not null)) from public.ffh_profiles p where public.ffh_staff_view(p.staff_id)),'[]'),
 'zones',coalesce((select jsonb_agg(to_jsonb(zone_row)) from public.ffh_zones zone_row where ffh_private.zone_visible(zone_row.id)),'[]'),
 'zone_access',coalesce((select jsonb_agg(to_jsonb(a)) from public.ffh_zone_access a where own or a.staff_id=sid),'[]'),
 'grants',coalesce((select jsonb_agg(to_jsonb(grant_row)) from public.ffh_access_grants grant_row where own or grant_row.staff_id=sid),'[]'),
 'requests',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from public.ffh_change_requests q where own or q.staff_id=sid or (q.module='sales' and (q.reviewer_staff_id is null or q.reviewer_staff_id=sid) and ffh_private.staff_visible(q.staff_id) and exists(select 1 from public.ffh_profiles me where me.staff_id=sid and me.can_manage))),'[]'),
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
 delete from public.ffh_access_grants where staff_id=target and (root_owner or module<>'kb');
 for g in select value from jsonb_array_elements(payload->'grants') loop
 perm:=g->>'module';if perm='kb' and not root_owner then raise exception 'Only Ayon changes AI_ACCESS' using errcode='42501';end if;if perm not in ('*','accounts_create','accounts_edit','accounts','catalogue','outlets','routes','sales','tasks','cpo','income','kb','briefings','settings','proposals','claims','notifications','contacts','income_salary','income_targets','income_commission','income_incentives','income_penalties') then raise exception 'Unknown module';end if;
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
 if payload->>'module'='sales' and coalesce(payload->>'reviewer_staff_id','M21954')<>'M21954' and not exists(select 1 from public.ffh_profiles m join public.ffh_profiles me on me.staff_id=sid where m.staff_id=payload->>'reviewer_staff_id' and m.can_manage and m.active and m.login_approved and (m.staff_id=me.manager_id or m.zone_id=me.zone_id)) then raise exception 'Choose the owner or your zonal manager';end if;
 insert into public.ffh_change_requests(staff_id,action,module,record_id,reason,reviewer_staff_id) values(sid,payload->>'action',payload->>'module',payload->>'record_id',payload->>'reason',coalesce(nullif(payload->>'reviewer_staff_id',''),'M21954'));
 return jsonb_build_object('saved',true);
 elsif action='review_request' then
 if not own and not exists(select 1 from public.ffh_change_requests q join public.ffh_profiles me on me.staff_id=sid where q.id=(payload->>'id')::uuid and me.can_manage and q.module='sales' and (q.reviewer_staff_id is null or q.reviewer_staff_id=sid) and ffh_private.staff_visible(q.staff_id) and ffh_private.allowed('sales',q.action)) then raise exception 'Owner or permitted zonal manager required';end if;
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
end$function$
;
