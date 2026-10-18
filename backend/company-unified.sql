-- Company scope and independent permissions. Existing staff IDs remain immutable.

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
  if item.row_data->>'_shared_item'='true' then
   select sc.payload into rec from public.ffh_shared_content sc where sc.content_key=item.row_data->>'content_key' for update;
   if exists(select 1 from jsonb_array_elements(coalesce(rec,'[]')) c where c->>'id'=item.row_key->>'item_id') then raise exception 'A record with this ID already exists';end if;
   perform public.ffh_publish_campaigns(coalesce(rec,'[]')||jsonb_build_array(item.row_data->'item'));
  else
  perform set_config('ffh.restore_trash_id',item.id::text,true);
  execute format('insert into public.%I select (jsonb_populate_record(null::public.%I,$1)).*',item.table_name,item.table_name) using item.row_data;
  end if;
  update ffh_private.trash set status='Restored',resolved_at=now() where id=item.id;
 else update ffh_private.trash set status='Purged',row_data=null,resolved_at=now() where table_name=item.table_name and row_key=item.row_key;
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


CREATE OR REPLACE FUNCTION ffh_private.publish_campaigns_legacy(campaigns jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare old_payload jsonb; staff text;
begin
 if auth.uid() is null or not public.ffh_module_edit('cpo') then raise exception 'Manager access required' using errcode='42501'; end if;
 if campaigns is null or jsonb_typeof(campaigns)<>'array' then raise exception 'Campaign list must be an array'; end if;
 select staff_id into staff from public.ffh_profiles where auth_user_id=auth.uid() and active;
 select payload into old_payload from public.ffh_shared_content where content_key='cpo_campaigns' for update;
 if exists(select 1 from jsonb_array_elements(campaigns) c where coalesce(c->>'id','')='' or coalesce(c->>'title','')='' or (c->>'type') not in ('CPO','Promotion')
 or coalesce(c->>'executionMode','proof') not in ('proof','view')
 or nullif(c->>'endDate','')::date < coalesce(nullif(c->>'startDate','')::date,nullif(c->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date)) then raise exception 'Invalid campaign details or dates'; end if;
 insert into public.ffh_campaigns(id,title,campaign_type,execution_mode,assigned_to,outlet_category,product,poster_url,start_date,end_date,active,updated_at)
 select c->>'id',c->>'title',c->>'type',coalesce(c->>'executionMode','proof'),coalesce(nullif(c->>'sr',''),'ALL'),coalesce(nullif(c->>'category',''),'ALL'),coalesce(c->>'product',''),coalesce(c->>'image',''),
 coalesce(nullif(c->>'startDate','')::date,nullif(c->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date),
 coalesce(nullif(c->>'endDate','')::date,nullif(c->>'startDate','')::date,nullif(c->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date),coalesce((c->>'active')::boolean,true),now()
 from jsonb_array_elements(campaigns) c
 on conflict(id) do update set title=excluded.title,campaign_type=excluded.campaign_type,execution_mode=excluded.execution_mode,assigned_to=excluded.assigned_to,outlet_category=excluded.outlet_category,product=excluded.product,poster_url=excluded.poster_url,start_date=excluded.start_date,end_date=excluded.end_date,active=excluded.active,updated_at=excluded.updated_at;
 update public.ffh_campaigns set active=false,updated_at=now()
 where id in (select c->>'id' from jsonb_array_elements(coalesce(old_payload,'[]'::jsonb)) c)
 and id not in (select c->>'id' from jsonb_array_elements(campaigns) c);
 insert into public.ffh_shared_content(content_key,payload,updated_at,updated_by) values('cpo_campaigns',campaigns,now(),staff)
 on conflict(content_key) do update set payload=excluded.payload,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end $function$;

revoke all on function ffh_private.publish_campaigns_legacy(jsonb) from public,anon,authenticated;
alter table public.ffh_campaigns add column if not exists zone_ids text[] not null default '{}';
create or replace function ffh_private.campaign_visible(c jsonb) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and public.ffh_my_staff_id() is not null and (public.ffh_owner() or
(case when coalesce(c->>'sr','ALL')='ALL' then
(coalesce(jsonb_array_length(c->'zoneIds'),0)=0 or exists(select 1 from jsonb_array_elements_text(c->'zoneIds') z where ffh_private.zone_visible(z) or z=public.ffh_current_zone()))
else public.ffh_staff_view(c->>'sr') end))$$;
create or replace function ffh_private.campaign_state() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce((select jsonb_agg(c) from public.ffh_shared_content s cross join lateral jsonb_array_elements(s.payload) c where s.content_key='cpo_campaigns' and ffh_private.campaign_visible(c)),'[]'::jsonb)$$;
create or replace function public.ffh_campaign_state() returns jsonb language sql security invoker set search_path='' as $$select ffh_private.campaign_state()$$;
create policy ffh_campaign_zone_read on public.ffh_campaigns as restrictive for select to authenticated using(public.ffh_my_staff_id() is not null and (public.ffh_owner() or ((assigned_to='ALL' or public.ffh_staff_view(assigned_to)) and (cardinality(zone_ids)=0 or exists(select 1 from unnest(zone_ids) z where ffh_private.zone_visible(z) or z=public.ffh_current_zone())))));
create policy ffh_shared_campaign_private on public.ffh_shared_content as restrictive for select to authenticated using(content_key<>'cpo_campaigns' or public.ffh_owner());
create or replace function ffh_private.publish_campaigns(campaigns jsonb) returns void language plpgsql security definer set search_path='' as $$
declare own boolean:=public.ffh_owner();old_list jsonb;merged jsonb:='[]';c jsonb;prev jsonb;zone_list jsonb;begin
 if auth.uid() is null or not public.ffh_module_edit('cpo') then raise exception 'Campaign edit permission required' using errcode='42501';end if;
 if jsonb_typeof(campaigns)<>'array' then raise exception 'Campaign array required';end if;
 select payload into old_list from public.ffh_shared_content where content_key='cpo_campaigns' for update;
 select coalesce(jsonb_agg(id),'[]') into zone_list from public.ffh_zones where active and ffh_private.zone_visible(id);
 for c in select value from jsonb_array_elements(campaigns) loop
  select value into prev from jsonb_array_elements(coalesce(old_list,'[]')) where value->>'id'=c->>'id';
  if not own then
   if prev is not null and (not ffh_private.campaign_visible(prev) or (prev->>'sr'='ALL' and coalesce(jsonb_array_length(prev->'zoneIds'),0)=0)) and c<>prev then raise exception 'Campaign affects zones outside your scope';end if;
   if c->>'sr'='ALL' then
    if prev is null then c:=jsonb_set(c,'{zoneIds}',zone_list);
    elsif c<>prev and exists(select 1 from jsonb_array_elements_text(coalesce(c->'zoneIds','[]')) z where not ffh_private.zone_visible(z)) then raise exception 'Campaign zone outside your scope';end if;
   elsif not public.ffh_staff_view(c->>'sr') then raise exception 'Campaign recipient outside your scope';end if;
  end if;
  merged:=merged||jsonb_build_array(c);
 end loop;
 for c in select value from jsonb_array_elements(coalesce(old_list,'[]')) loop
  if not exists(select 1 from jsonb_array_elements(campaigns) n where n->>'id'=c->>'id') then
   if not ffh_private.campaign_visible(c) then merged:=merged||jsonb_build_array(c);
   elsif not ffh_private.allowed('cpo','delete') or (not own and c->>'sr'='ALL' and coalesce(jsonb_array_length(c->'zoneIds'),0)=0) then raise exception 'Campaign delete permission required' using errcode='42501';end if;
  end if;
 end loop;
 perform ffh_private.publish_campaigns_legacy(merged);
 update public.ffh_campaigns t set zone_ids=array(select jsonb_array_elements_text(jc.value->'zoneIds')) from jsonb_array_elements(merged) jc(value) where t.id=jc.value->>'id';
end$$;
create or replace function public.ffh_publish_campaigns(campaigns jsonb) returns void language sql security invoker set search_path='' as $$select ffh_private.publish_campaigns(campaigns)$$;
create or replace function ffh_private.shared_item_trash() returns trigger language plpgsql security definer set search_path='' as $$
declare c jsonb;sid text:=public.ffh_my_staff_id();begin
 if old.content_key<>'cpo_campaigns' or jsonb_typeof(old.payload)<>'array' then return new;end if;
 for c in select value from jsonb_array_elements(old.payload) loop
 if not exists(select 1 from jsonb_array_elements(new.payload) n where n->>'id'=c->>'id') then
  if auth.uid() is not null and not ffh_private.allowed('cpo','delete') then raise exception 'Campaign delete permission required' using errcode='42501';end if;
  insert into ffh_private.trash(table_name,row_key,row_data,deleted_by) values('ffh_shared_content',jsonb_build_object('content_key',old.content_key,'item_id',c->>'id'),jsonb_build_object('_shared_item',true,'content_key',old.content_key,'item',c),sid);
 end if;end loop;return new;end$$;
create trigger ffh_shared_item_trash before update on public.ffh_shared_content for each row execute function ffh_private.shared_item_trash();
revoke all on function ffh_private.shared_item_trash() from public,anon,authenticated;
do $$declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ffh_private' and p.proname in ('campaign_state','publish_campaigns','campaign_visible') loop execute format('revoke all on function %s from public,anon',f);execute format('grant execute on function %s to authenticated',f);end loop;end$$;
revoke all on function public.ffh_campaign_state() from public,anon;grant execute on function public.ffh_campaign_state() to authenticated;


CREATE OR REPLACE FUNCTION ffh_private.earnings_action(action text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid text:=public.ffh_my_staff_id();target text;mid uuid;row public.ffh_income_entries%rowtype;reason_text text;can_approve boolean;d date;g jsonb;startd date;endd date;settings jsonb;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved login required' using errcode='42501';end if;
 can_approve:=public.ffh_owner() or exists(select 1 from public.ffh_income_approvers where staff_id=sid);
 if action='state' then
 return jsonb_build_object('can_approve',can_approve,'settings',coalesce((select jsonb_agg(to_jsonb(x)) from public.ffh_income_settings x where public.ffh_staff_view(staff_id)),'[]'::jsonb),'offers',coalesce((select jsonb_agg(to_jsonb(x)) from public.ffh_reward_offers x where assigned_to='ALL' or public.ffh_staff_view(assigned_to)),'[]'::jsonb),'entries',coalesce((select jsonb_agg(to_jsonb(x) order by created_at desc) from public.ffh_income_entries x where public.ffh_staff_view(x.staff_id)),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(x) order by created_at) from public.ffh_income_events x where exists(select 1 from public.ffh_income_entries e where e.id=x.entry_id and public.ffh_staff_view(e.staff_id))),'[]'::jsonb),'approvers',coalesce((select jsonb_agg(staff_id) from public.ffh_income_approvers),'[]'::jsonb));
 elsif action='grant' then
 if not public.ffh_owner() then raise exception 'Owner alone grants approval access' using errcode='42501';end if;
 target:=payload->>'staff_id';if not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) then raise exception 'Invalid staff';end if;
 if (payload->>'enabled')::boolean then insert into public.ffh_income_approvers values(target,sid,now()) on conflict(staff_id) do nothing;else delete from public.ffh_income_approvers where staff_id=target;end if;
 return jsonb_build_object('ok',true);
 elsif action='settings' then
 target:=payload->>'staff_id';if not public.ffh_staff_edit(target,'income') then raise exception 'Income edit access required' using errcode='42501';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(payload->'sku_targets','[]')) x where coalesce(x->>'sku','')='' or coalesce((x->>'target')::numeric,0)<=0) then raise exception 'Invalid SKU target';end if;
 insert into public.ffh_income_settings(staff_id,month,actual_target,planning_target,basic,fuel,house_rent,sku_targets,manager_rule,updated_by)
 values(target,payload->>'month',(payload->>'actual_target')::numeric,(payload->>'planning_target')::numeric,coalesce((payload->>'basic')::numeric,0),coalesce((payload->>'fuel')::numeric,0),coalesce((payload->>'house_rent')::numeric,0),coalesce(payload->'sku_targets','[]'),coalesce(payload->'manager_rule','{}'),sid)
 on conflict(staff_id,month) do update set actual_target=excluded.actual_target,planning_target=excluded.planning_target,basic=excluded.basic,fuel=excluded.fuel,house_rent=excluded.house_rent,sku_targets=excluded.sku_targets,manager_rule=excluded.manager_rule,updated_by=sid,updated_at=now();
 return jsonb_build_object('ok',true);
 elsif action='offer' then
 if not public.ffh_module_edit('income') then raise exception 'Offer publisher access required' using errcode='42501';end if;
 target:=coalesce(payload->>'assigned_to','ALL');if target<>'ALL' and not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) then raise exception 'Invalid recipient';end if;
 if target='ALL' and not public.ffh_owner() then raise exception 'Use scoped company offer publishing';end if;if target<>'ALL' and not public.ffh_staff_view(target) then raise exception 'Recipient outside permitted zones';end if;
 startd:=(payload->>'start_date')::date;endd:=(payload->>'end_date')::date;
 if endd<startd or endd<(now() at time zone 'Asia/Kuala_Lumpur')::date or length(trim(coalesce(payload->>'title','')))=0 or jsonb_typeof(payload->'groups')<>'array' or jsonb_array_length(payload->'groups')=0 then raise exception 'Invalid offer dates or groups';end if;
 for g in select value from jsonb_array_elements(payload->'groups') loop
 if coalesce(g->>'basis','delivered') not in ('delivered','order') or coalesce(g->>'period','window') not in ('daily','window') then raise exception 'Invalid sales basis or reward period';end if;
 if coalesce(g->>'mode','') not in ('sales','single','combo','orders','outlets') or coalesce((g->>'target')::numeric,0)<=0 or coalesce((g->>'reward')::numeric,0)<=0 or (g->>'mode'='single' and jsonb_array_length(g->'skus')<>1) or (g->>'mode'='combo' and jsonb_array_length(g->'skus')<2) then raise exception 'Invalid offer rule';end if;
 end loop;
 insert into public.ffh_reward_offers(title,assigned_to,start_date,end_date,groups,poster_url,created_by) values(payload->>'title',target,startd,endd,payload->'groups',nullif(payload->>'poster_url',''),sid) returning id into mid;
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select p.staff_id,'incentive','New incentive · '||(payload->>'title'),'Offer active '||startd||' to '||endd,now(),'scheduled',sid,'offer:'||mid||':'||p.staff_id from public.ffh_profiles p where active and login_approved and (target='ALL' or staff_id=target);
 return jsonb_build_object('id',mid);
 elsif action='propose' then
 target:=payload->>'staff_id';reason_text:=trim(payload->>'reason');d:=coalesce(nullif(payload->>'entry_date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date);
 if not public.ffh_staff_view(target) then raise exception 'Recipient outside permitted zones';end if;
 if not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) or d>(now() at time zone 'Asia/Kuala_Lumpur')::date or reason_text is null then raise exception 'Invalid staff, date or reason';end if;
 if (select count(*) from public.ffh_income_entries where created_by=sid and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many requests; retry later';end if;
 insert into public.ffh_income_entries(staff_id,entry_date,kind,amount,reason,created_by) values(target,d,payload->>'kind',(payload->>'amount')::numeric,reason_text,sid) returning * into row;
 insert into public.ffh_income_events(entry_id,action,actor,reason) values(row.id,'Proposed',sid,reason_text);
 elsif action in ('approve','reject','reverse') then
 select * into row from public.ffh_income_entries where id=(payload->>'id')::uuid for update;
 if not found or not public.ffh_staff_view(row.staff_id) then raise exception 'Entry not found in your scope';end if;
 reason_text:=trim(payload->>'reason');if reason_text is null or length(reason_text) not between 1 and 2000 then raise exception 'Reason is required';end if;
 if action='reverse' then
 if row.created_by<>sid then raise exception 'Only the issuer may refund/withdraw' using errcode='42501';end if;
 if row.status not in ('Pending','Approved') then raise exception 'Entry already closed';end if;
 update public.ffh_income_entries set status='Reversed',reversed_by=sid,reversed_at=now(),reversal_reason=reason_text where id=row.id returning * into row;
 else
 if not can_approve then raise exception 'Owner or delegated approver required' using errcode='42501';end if;
 if row.status<>'Pending' then raise exception 'Entry already reviewed';end if;
 update public.ffh_income_entries set status=case when action='approve' then 'Approved' else 'Rejected' end,approved_by=sid,approved_at=now() where id=row.id returning * into row;
 end if;
 insert into public.ffh_income_events(entry_id,action,actor,reason) values(row.id,initcap(action),sid,reason_text);
 else raise exception 'Unknown earnings action';end if;
 -- Everyone sees notices/adjustment history; affected staff + approvers get push.
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select distinct p.staff_id,'notice',row.kind||' · '||row.status,row.staff_id||' · RM '||row.amount||' · '||coalesce(reason_text,row.reason),now(),'scheduled',sid,'income:'||row.id||':'||row.status||':'||p.staff_id
 from public.ffh_profiles p where p.active and p.login_approved and (p.staff_id in (row.staff_id,row.created_by,'M21954') or exists(select 1 from public.ffh_income_approvers a where a.staff_id=p.staff_id) or (p.can_manage and (p.zone_id=(select zone_id from public.ffh_profiles where staff_id=row.staff_id) or exists(select 1 from public.ffh_zone_access za where za.staff_id=p.staff_id and za.zone_id in ('*',(select zone_id from public.ffh_profiles where staff_id=row.staff_id)))))) on conflict(source_key) where source_key is not null do nothing;
 return to_jsonb(row);
end $function$;

create or replace function ffh_private.scoped_earnings(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();p record;ids jsonb:='[]';r jsonb;begin
 if auth.uid() is null or sid is null then raise exception 'Active login required';end if;
 if action='offer' and payload->>'assigned_to'='ALL' and not public.ffh_owner() then
 if not public.ffh_module_edit('income') then raise exception 'Income edit permission required';end if;
 for p in select staff_id from public.ffh_profiles where active and login_approved and public.ffh_staff_view(staff_id) loop
 r:=ffh_private.earnings_action(action,jsonb_set(payload,'{assigned_to}',to_jsonb(p.staff_id)));ids:=ids||jsonb_build_array(r);end loop;return ids;
 end if;return ffh_private.earnings_action(action,payload);end$$;
revoke all on function ffh_private.scoped_earnings(text,jsonb) from public,anon;grant execute on function ffh_private.scoped_earnings(text,jsonb) to authenticated;
create or replace function public.ffh_earnings(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.scoped_earnings(action,payload)$$;


create or replace function ffh_private.viewer_scope(viewer text,target text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ffh_profiles v join public.ffh_profiles t on t.staff_id=target where v.staff_id=viewer and v.active and v.login_approved and
 (v.staff_id=target or v.staff_id='M21954' or (v.can_manage and (v.zone_id=t.zone_id or exists(select 1 from public.ffh_zone_access z where z.staff_id=v.staff_id and z.zone_id in ('*',t.zone_id))))))
$$;
create or replace function ffh_private.daily_notifications() returns integer language plpgsql security definer set search_path='' as $$
declare local_now timestamp:=now() at time zone 'Asia/Kuala_Lumpur';day date:=local_now::date;hm time:=date_trunc('minute',local_now)::time;
 pref public.ffh_notification_preferences%rowtype;r record;offr record;g jsonb;amt numeric;goal numeric;zero_count int;task_count int;progress numeric;msg text;inserted int;total int:=0;begin
 select * into pref from public.ffh_notification_preferences where id=1;if not found then return 0;end if;
 if pref.morning_enabled and hm=pref.morning_time then
 for r in select staff_id,full_name,can_manage,can_sell from public.ffh_profiles where active and login_approved and (can_manage or can_sell) loop
 select coalesce(sum(s.delivered_amount),0) into amt from public.ffh_sales s where s.status='Delivered' and s.sale_date between date_trunc('month',day)::date and day
 and (case when r.can_manage then ffh_private.viewer_scope(r.staff_id,s.sr_id) else s.sr_id=r.staff_id end);
 select coalesce(sum(coalesce(i.actual_target,p.monthly_target)),0) into goal from public.ffh_profiles p left join public.ffh_income_settings i on i.staff_id=p.staff_id and i.month=to_char(day,'YYYY-MM') where p.active and p.can_sell and (case when r.can_manage then ffh_private.viewer_scope(r.staff_id,p.staff_id) else p.staff_id=r.staff_id end);
 select count(*) into zero_count from public.ffh_outlets o where o.active and (case when r.can_manage then ffh_private.viewer_scope(r.staff_id,o.sr_id) else o.sr_id=r.staff_id end) and not exists(select 1 from public.ffh_sales s where s.sr_id=o.sr_id and s.outlet_code=o.outlet_code and s.status='Delivered' and s.sale_date between date_trunc('month',day)::date and day and s.delivered_amount>0);
 select count(*) into task_count from public.ffh_tasks t where t.status not in ('Done','Completed') and (t.assigned_to='ALL' or (case when r.can_manage then ffh_private.viewer_scope(r.staff_id,t.assigned_to) else t.assigned_to=r.staff_id end));
 msg:='Target RM '||round(goal,2)||' | Delivered RM '||round(amt,2)||' | Shortfall RM '||round(greatest(goal-amt,0),2)||' | Zero outlets '||zero_count||' | Pending tasks '||task_count;
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key) values(r.staff_id,case when r.can_manage then 'manager-summary' else 'morning' end,case when r.can_manage then 'Your permitted zones · Sales focus' else 'Your sales focus' end,msg,now(),'scheduled','SYSTEM','morning-v2:'||day||':'||r.staff_id) on conflict(source_key) where source_key is not null do nothing;
 get diagnostics inserted=row_count;total:=total+inserted;
 -- Each person gets their own live incentive gap; managers get the scoped team summary above.
 if r.can_sell then
 for offr in select * from public.ffh_reward_offers where active and day between start_date and end_date and assigned_to in ('ALL',r.staff_id) loop
 for g in select value from jsonb_array_elements(offr.groups) loop
 select case when g->>'mode'='orders' then count(distinct s.id)::numeric when g->>'mode'='outlets' then count(distinct s.outlet_code)::numeric else coalesce(sum(case when g->>'mode'='sales' then case when coalesce(g->>'basis','delivered')='order' then s.order_amount else s.delivered_amount end else s.qty end),0) end into progress
 from public.ffh_sales s where s.sr_id=r.staff_id and s.status not in ('Cancelled','Rejected') and (coalesce(g->>'basis','delivered')='order' or s.status='Delivered')
 and (case when coalesce(g->>'basis','delivered')='order' then (s.created_at at time zone 'Asia/Kuala_Lumpur')::date else coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date) end) between case when g->>'period'='daily' then day else offr.start_date end and least(day,offr.end_date)
 and (g->>'mode' not in ('single','combo') or g->'skus' ? s.sku);
 msg:=offr.title||' · '||coalesce(g->>'name','Incentive')||' | Progress '||round(progress,2)||' / '||(g->>'target')||' | Remaining '||greatest((g->>'target')::numeric-progress,0)||' | Reward RM '||(g->>'reward')||' | Ends '||offr.end_date;
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key) values(r.staff_id,'incentive','Your incentive progress',msg,now(),'scheduled','SYSTEM','incentive-gap:'||day||':'||r.staff_id||':'||offr.id||':'||md5(g::text)) on conflict(source_key) where source_key is not null do nothing;
 end loop;end loop;end if;
 end loop;end if;
 if pref.evening_enabled and hm=pref.evening_time then
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select staff_id,'evening','Meeting & next-day plan','Prepare for the 20:30 meeting. Review your permitted scope, pending tasks and next-day route.',now(),'scheduled','SYSTEM','evening-v2:'||day||':'||staff_id from public.ffh_profiles where active and login_approved
 on conflict(source_key) where source_key is not null do nothing;get diagnostics inserted=row_count;total:=total+inserted;end if;
 return total;end$$;
create or replace function public.ffh_generate_daily_notifications() returns integer language sql security invoker set search_path='' as $$select ffh_private.daily_notifications()$$;
revoke all on function ffh_private.viewer_scope(text,text),ffh_private.daily_notifications() from public,anon,authenticated;
grant execute on function ffh_private.daily_notifications() to service_role;
revoke all on function public.ffh_generate_daily_notifications() from public,anon,authenticated;grant execute on function public.ffh_generate_daily_notifications() to service_role;


create or replace function ffh_private.assignment_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();p text;begin
 if auth.uid() is null then return new;end if;
 if TG_TABLE_NAME='ffh_briefings' then
 if not public.ffh_module_edit('briefings') then raise exception 'Notice / meeting edit permission required';end if;
 if 'ALL'=any(new.recipients) and not public.ffh_owner() then
  new.recipients:=array(select staff_id from public.ffh_profiles where active and login_approved and public.ffh_staff_view(staff_id));
 end if;
 foreach p in array new.recipients loop if p<>'ALL' and not public.ffh_staff_view(p) then raise exception 'Recipient outside permitted zones';end if;end loop;
 elsif TG_TABLE_NAME='ffh_notification_jobs' then
 if new.created_by<>sid then raise exception 'Notification sender mismatch';end if;
 if new.recipient='ALL' and not public.ffh_owner() then raise exception 'Expand the permitted recipients before sending';end if;
 if new.recipient<>'ALL' and not public.ffh_staff_view(new.recipient) then raise exception 'Recipient outside permitted zones';end if;
 end if;return new;end$$;
create trigger ffh_briefing_assignment_guard before insert or update on public.ffh_briefings for each row execute function ffh_private.assignment_guard();
create policy ffh_scoped_notification_create on public.ffh_notification_jobs for insert to authenticated with check(created_by=public.ffh_my_staff_id() and status='scheduled' and recipient<>'ALL' and public.ffh_staff_view(recipient) and (public.ffh_module_edit('notifications') or public.ffh_module_edit('tasks') or public.ffh_module_edit('income')));
revoke all on function ffh_private.assignment_guard() from public,anon,authenticated;
create policy ffh_briefing_scope on public.ffh_briefings as restrictive for select to authenticated using(public.ffh_owner() or 'ALL'=any(recipients) or public.ffh_my_staff_id()=any(recipients) or exists(select 1 from unnest(recipients) p where public.ffh_staff_view(p)));
create policy ffh_proposal_delegated_create on public.ffh_proposals for insert to authenticated with check(public.ffh_module_edit('proposals'));
create policy ffh_proposal_delegated_update on public.ffh_proposals for update to authenticated using(public.ffh_module_edit('proposals')) with check(public.ffh_module_edit('proposals'));
create policy ffh_proposal_delegated_delete on public.ffh_proposals for delete to authenticated using(ffh_private.allowed('proposals','delete'));
create or replace function ffh_private.asset_upload_allowed(object_name text) returns boolean language sql stable security invoker set search_path='' as $$
 select public.ffh_owner() or
 (split_part(object_name,'/',1)='profiles' and split_part(object_name,'/',2)=lower(public.ffh_my_staff_id())) or
 (split_part(object_name,'/',1)='campaigns' and split_part(object_name,'/',2)='executions' and split_part(object_name,'/',4)=lower(public.ffh_my_staff_id())) or
 ffh_private.allowed(case split_part(object_name,'/',1) when 'campaigns' then 'cpo' when 'incentives' then 'income' when 'catalogue' then 'catalogue' when 'proposals' then 'proposals' when 'briefings' then 'briefings' else 'settings' end,'upload')
$$;
create policy ffh_asset_upload_permission on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'ffh-public' or ffh_private.asset_upload_allowed(name));
create policy ffh_asset_update_permission on storage.objects as restrictive for update to authenticated using(bucket_id<>'ffh-public' or ffh_private.asset_upload_allowed(name)) with check(bucket_id<>'ffh-public' or ffh_private.asset_upload_allowed(name));
revoke all on function ffh_private.asset_upload_allowed(text) from public,anon;grant execute on function ffh_private.asset_upload_allowed(text) to authenticated;
CREATE OR REPLACE FUNCTION ffh_private.briefing_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare person record;begin
 if TG_OP='UPDATE' and to_jsonb(new)-'updated_at'=to_jsonb(old)-'updated_at' then return new;end if;
 update public.ffh_notification_jobs set status='cancelled' where source_key like 'briefing-time:'||new.id||':%' and status='scheduled';
 if not new.active then return new;end if;
 for person in select staff_id from public.ffh_profiles where active and login_approved and ('ALL'=any(new.recipients) or staff_id=any(new.recipients)) loop
 insert into public.ffh_notification_jobs(recipient,type,title,body,status,created_by,source_key)
 values(person.staff_id,new.kind,new.title,new.description,'scheduled',new.created_by,'briefing:'||new.id||':'||person.staff_id||':'||new.updated_at) on conflict(source_key) where source_key is not null do nothing;
 if new.starts_at>now() then insert into public.ffh_notification_jobs(recipient,type,title,body,status,scheduled_at,created_by,source_key) values(person.staff_id,new.kind,'Reminder · '||new.title,new.description,'scheduled',new.starts_at,new.created_by,'briefing-time:'||new.id||':'||person.staff_id||':'||new.starts_at) on conflict(source_key) where source_key is not null do update set status='scheduled',title=excluded.title,body=excluded.body;end if;
 end loop;return new;end$function$;


create or replace function ffh_private.is_restore(t text,r jsonb) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.ffh_owner() and exists(select 1 from ffh_private.trash x where x.id::text=current_setting('ffh.restore_trash_id',true) and x.table_name=t and x.status='Deleted' and x.row_key <@ r)
$$;
revoke all on function ffh_private.is_restore(text,jsonb) from public,anon;grant execute on function ffh_private.is_restore(text,jsonb) to authenticated;
CREATE OR REPLACE FUNCTION ffh_private.campaign_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.ffh_campaigns%rowtype;d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin if ffh_private.is_restore(TG_TABLE_NAME,to_jsonb(new)) then return new;end if;
 select * into c from public.ffh_campaigns where id=new.campaign_id;
 if not found or not c.active or d<c.start_date or d>c.end_date or new.execution_date<>d or c.execution_mode='view' then raise exception 'Campaign not active for submission';end if;
 if c.assigned_to<>'ALL' and c.assigned_to<>new.sr_id then raise exception 'Campaign not assigned to this staff';end if;return new;end$function$;
CREATE OR REPLACE FUNCTION ffh_private.delivery_clock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$declare d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin if ffh_private.is_restore(TG_TABLE_NAME,to_jsonb(new)) then return new;end if;
 if TG_OP='UPDATE' and old.status='Delivered' and (new.sale_date,new.sku,new.qty,new.delivered_amount,new.status) is distinct from (old.sale_date,old.sku,old.qty,old.delivered_amount,old.status) and (
 exists(select 1 from public.ffh_reward_offers o where o.active and (o.assigned_to='ALL' or o.assigned_to=old.sr_id) and old.sale_date between o.start_date and o.end_date and o.end_date<d) or exists(select 1 from public.ffh_campaigns o where o.active and (o.assigned_to='ALL' or o.assigned_to=old.sr_id) and old.sale_date between o.start_date and o.end_date and o.end_date<d)) then raise exception 'Closed offer sales are locked; use an approved adjustment for corrections';end if;
 if new.status='Delivered' and (TG_OP='INSERT' or old.status is distinct from 'Delivered') then new.delivered_at:=clock_timestamp();elsif TG_OP='UPDATE' then new.delivered_at:=old.delivered_at;end if;return new;end$function$;
CREATE OR REPLACE FUNCTION ffh_private.require_daily_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin if ffh_private.is_restore(TG_TABLE_NAME,to_jsonb(new)) then return new;end if; if auth.uid() is not null and not exists(select 1 from public.ffh_attendance where staff_id=public.ffh_my_staff_id() and duty_date=(now() at time zone 'Asia/Kuala_Lumpur')::date) then raise exception 'Daily attendance required before work updates' using errcode='42501'; end if; return new; end $function$;

create policy ffh_sales_delete_permission on public.ffh_sales for delete to authenticated using(ffh_private.allowed('sales','delete') and public.ffh_staff_view(sr_id));
create policy ffh_outlets_delete_permission on public.ffh_outlets for delete to authenticated using(ffh_private.allowed('outlets','delete') and public.ffh_staff_view(sr_id));
create policy ffh_routes_delete_permission on public.ffh_routes for delete to authenticated using(ffh_private.allowed('routes','delete') and public.ffh_staff_view(sr_id));
create policy ffh_tasks_delete_permission on public.ffh_tasks for delete to authenticated using(ffh_private.allowed('tasks','delete') and public.ffh_staff_view(assigned_to));

create or replace function ffh_private.sales_correction_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or ffh_private.is_restore(TG_TABLE_NAME,to_jsonb(new)) then return new;end if;
 if (new.sr_id,new.sale_date,new.outlet_code,new.outlet_name,new.category,new.sku,new.qty,new.price,new.order_amount,new.remarks) is distinct from (old.sr_id,old.sale_date,old.outlet_code,old.outlet_name,old.category,old.sku,old.qty,old.price,old.order_amount,old.remarks) or (old.status='Delivered' and (new.delivered_amount,new.status) is distinct from (old.delivered_amount,old.status)) then
 if not public.ffh_staff_edit(old.sr_id,'sales') or not public.ffh_staff_view(new.sr_id) then raise exception 'Sales correction permission required' using errcode='42501';end if;
 end if;return new;
end$$;
revoke all on function ffh_private.sales_correction_guard() from public,anon,authenticated;
create trigger ffh_sales_correction_guard before update on public.ffh_sales for each row execute function ffh_private.sales_correction_guard();
-- Include directory changes in the same immutable owner history.
create trigger ffh_change_audit after insert or update or delete on public.ffh_contacts for each row execute function ffh_private.capture_change('settings');
