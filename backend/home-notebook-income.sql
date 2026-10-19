begin;
alter table public.ffh_change_requests add column if not exists reviewer_staff_id text references public.ffh_profiles(staff_id);
create table if not exists public.ffh_home_messages(
 id uuid primary key default gen_random_uuid(),message text not null check(length(trim(message)) between 1 and 1000),
 start_date date not null,end_date date not null,text_color text not null default '#ffffff' check(text_color ~ '^#[0-9a-fA-F]{6}$'),
 active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_date>=start_date));
alter table public.ffh_home_messages enable row level security;
revoke all on public.ffh_home_messages from public,anon,authenticated;
grant select,insert,update,delete on public.ffh_home_messages to authenticated;
grant all on public.ffh_home_messages to service_role;
create policy ffh_home_read on public.ffh_home_messages for select to authenticated using(public.ffh_my_staff_id() is not null);
create policy ffh_home_insert on public.ffh_home_messages for insert to authenticated with check(ffh_private.is_owner());
create policy ffh_home_update on public.ffh_home_messages for update to authenticated using(ffh_private.is_owner()) with check(ffh_private.is_owner());
create policy ffh_home_delete on public.ffh_home_messages for delete to authenticated using(ffh_private.is_owner());
create trigger ffh_change_audit after insert or update or delete on public.ffh_home_messages for each row execute function ffh_private.capture_change('settings');
create table if not exists public.ffh_private_notebook(
 id uuid primary key default gen_random_uuid(),owner_staff_id text not null references public.ffh_profiles(staff_id),
 briefing_id uuid references public.ffh_briefings(id) on delete set null,note_date date not null,folder text not null check(length(folder) between 1 and 120),
 title text not null check(length(title) between 1 and 200),notes text not null check(length(notes)<=30000),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index ffh_notebook_owner_date on public.ffh_private_notebook(owner_staff_id,note_date desc);
alter table public.ffh_private_notebook enable row level security;
revoke all on public.ffh_private_notebook from public,anon,authenticated;
grant select,insert,update,delete on public.ffh_private_notebook to authenticated;grant all on public.ffh_private_notebook to service_role;
create policy ffh_notebook_read on public.ffh_private_notebook for select to authenticated using(owner_staff_id=public.ffh_my_staff_id());
create policy ffh_notebook_insert on public.ffh_private_notebook for insert to authenticated with check(owner_staff_id=public.ffh_my_staff_id());
create policy ffh_notebook_update on public.ffh_private_notebook for update to authenticated using(owner_staff_id=public.ffh_my_staff_id()) with check(owner_staff_id=public.ffh_my_staff_id());
create policy ffh_notebook_delete on public.ffh_private_notebook for delete to authenticated using(owner_staff_id=public.ffh_my_staff_id());
-- Preserve saved private minutes without copying them into any shared content.
insert into public.ffh_private_notebook(owner_staff_id,briefing_id,note_date,folder,title,notes,created_at,updated_at)
select m.owner_staff_id,m.briefing_id,m.minute_date,coalesce(nullif(left(b.title,120),''),'Meetings'),'Meeting minutes',m.notes,m.updated_at,m.updated_at
from public.ffh_dated_minutes m join public.ffh_briefings b on b.id=m.briefing_id where length(trim(m.notes))>0;
-- Personal salary is narrower than general zone-wide sales visibility.
create or replace function ffh_private.income_visible(target text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (ffh_private.is_owner() or target=public.ffh_my_staff_id() or exists(
 select 1 from public.ffh_profiles me join public.ffh_profiles p on p.staff_id=target
 where me.auth_user_id=auth.uid() and me.active and me.login_approved and me.can_manage and not p.can_manage and ffh_private.staff_visible(target)))
$$;
revoke all on function ffh_private.income_visible(text) from public,anon;grant execute on function ffh_private.income_visible(text) to authenticated,service_role;
create policy ffh_salary_private on public.ffh_income_settings as restrictive for select to authenticated using(ffh_private.income_visible(staff_id));
create policy ffh_ledger_private on public.ffh_income_entries as restrictive for select to authenticated using(ffh_private.income_visible(staff_id));
-- An exact sub-permission overrides an inherited module grant.
create or replace function ffh_private.allowed(feature text,verb text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (ffh_private.is_owner() or exists(
 select 1 from public.ffh_profiles p join lateral (
 select g.* from public.ffh_access_grants g where g.staff_id=p.staff_id and (g.module=feature or (feature like 'income_%' and g.module='income') or (feature<>'kb' and g.module='*'))
 order by case when g.module=feature then 0 when g.module='*' then 2 else 1 end limit 1) g on true
 where p.auth_user_id=auth.uid() and p.active and p.login_approved and case verb when 'edit' then g.can_edit when 'upload' then g.can_upload when 'delete' then g.can_delete else false end))
$$;
CREATE OR REPLACE FUNCTION ffh_private.governance(action text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid text:=public.ffh_my_staff_id();own boolean:=ffh_private.is_administrator();root_owner boolean:=ffh_private.is_owner();target text;z text;g jsonb;item ffh_private.trash%rowtype;m text;cols text;rec jsonb;affected int;perm text;begin
 if auth.uid() is null or sid is null then raise exception 'Active login required' using errcode='42501';end if;
 if action='state' then return jsonb_build_object('owner',root_owner,'administrator',own,
 'my_manager',(select jsonb_build_object('staff_id',m.staff_id,'full_name',m.full_name,'contact_email',m.contact_email,'zone_id',m.zone_id) from public.ffh_profiles me join public.ffh_profiles m on m.staff_id=me.manager_id where me.staff_id=sid and m.active and m.login_approved),
 'profiles',coalesce((select jsonb_agg(to_jsonb(p)-'auth_user_id') from public.ffh_profiles p where public.ffh_staff_view(p.staff_id)),'[]'),
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
 return jsonb_build_object('can_approve',can_approve,'settings',coalesce((select jsonb_agg(to_jsonb(x)) from public.ffh_income_settings x where ffh_private.income_visible(staff_id)),'[]'::jsonb),'offers',coalesce((select jsonb_agg(to_jsonb(x)) from public.ffh_reward_offers x where assigned_to='ALL' or public.ffh_staff_view(assigned_to)),'[]'::jsonb),'entries',coalesce((select jsonb_agg(to_jsonb(x) order by created_at desc) from public.ffh_income_entries x where ffh_private.income_visible(x.staff_id)),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(x) order by created_at) from public.ffh_income_events x where exists(select 1 from public.ffh_income_entries e where e.id=x.entry_id and ffh_private.income_visible(e.staff_id))),'[]'::jsonb),'approvers',coalesce((select jsonb_agg(staff_id) from public.ffh_income_approvers),'[]'::jsonb));
 elsif action='grant' then
 if not public.ffh_owner() then raise exception 'Owner alone grants approval access' using errcode='42501';end if;
 target:=payload->>'staff_id';if not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) then raise exception 'Invalid staff';end if;
 if (payload->>'enabled')::boolean then insert into public.ffh_income_approvers values(target,sid,now()) on conflict(staff_id) do nothing;else delete from public.ffh_income_approvers where staff_id=target;end if;
 return jsonb_build_object('ok',true);
 elsif action='settings' then
 target:=payload->>'staff_id';if not ffh_private.income_visible(target) then raise exception 'Income is private' using errcode='42501';end if;
 select to_jsonb(x) into settings from public.ffh_income_settings x where x.staff_id=target and x.month=payload->>'month';
 if ((coalesce(payload->'basic','0') is distinct from coalesce(settings->'basic','0')) or (coalesce(payload->'fuel','0') is distinct from coalesce(settings->'fuel','0')) or (coalesce(payload->'house_rent','0') is distinct from coalesce(settings->'house_rent','0')) or ((coalesce(payload->'manager_rule','{}')-array['commission','commissionMode','salesCommissionRate','growthCommissionRate']) is distinct from (coalesce(settings->'manager_rule','{}')-array['commission','commissionMode','salesCommissionRate','growthCommissionRate']))) and not ffh_private.allowed('income_salary','edit') then raise exception 'Salary edit permission required' using errcode='42501';end if;
 if (coalesce(payload->'actual_target','0') is distinct from coalesce(settings->'actual_target','0') or coalesce(payload->'planning_target','0') is distinct from coalesce(settings->'planning_target','0') or coalesce(payload->'sku_targets','[]') is distinct from coalesce(settings->'sku_targets','[]')) and not ffh_private.allowed('income_targets','edit') then raise exception 'Target edit permission required' using errcode='42501';end if;
 if jsonb_build_array(payload#>'{manager_rule,commission}',payload#>'{manager_rule,commissionMode}',payload#>'{manager_rule,salesCommissionRate}',payload#>'{manager_rule,growthCommissionRate}') is distinct from jsonb_build_array(settings#>'{manager_rule,commission}',settings#>'{manager_rule,commissionMode}',settings#>'{manager_rule,salesCommissionRate}',settings#>'{manager_rule,growthCommissionRate}') and not ffh_private.allowed('income_commission','edit') then raise exception 'Commission edit permission required' using errcode='42501';end if;
 if not (ffh_private.allowed('income_salary','edit') or ffh_private.allowed('income_targets','edit') or ffh_private.allowed('income_commission','edit')) then raise exception 'Monthly setup edit permission required' using errcode='42501';end if;
 if payload#>'{manager_rule,commission}' is not null then
 g:=payload#>'{manager_rule,commission}';if jsonb_typeof(g)<>'object' or not(g ?& array['lowerLimit','upperLimit','lowerRate','middleRate','upperRate']) then raise exception 'All commission category fields are required';end if;
 if (g->>'lowerLimit')::numeric<0 or (g->>'upperLimit')::numeric<=(g->>'lowerLimit')::numeric or (g->>'lowerRate')::numeric not between 0 and 100 or (g->>'middleRate')::numeric not between 0 and 100 or (g->>'upperRate')::numeric not between 0 and 100 then raise exception 'Invalid three-category commission rule';end if;
 end if;
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
 target:=payload->>'staff_id';if not ffh_private.allowed(case when payload->>'kind'='Penalty' then 'income_penalties' else 'income_incentives' end,'edit') then raise exception 'Adjustment issue permission required' using errcode='42501';end if;reason_text:=trim(payload->>'reason');d:=coalesce(nullif(payload->>'entry_date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date);
 if not public.ffh_staff_view(target) then raise exception 'Recipient outside permitted zones';end if;
 if not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) or d>(now() at time zone 'Asia/Kuala_Lumpur')::date or reason_text is null then raise exception 'Invalid staff, date or reason';end if;
 if (select count(*) from public.ffh_income_entries where created_by=sid and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many requests; retry later';end if;
 insert into public.ffh_income_entries(staff_id,entry_date,kind,amount,reason,created_by) values(target,d,payload->>'kind',(payload->>'amount')::numeric,reason_text,sid) returning * into row;
 insert into public.ffh_income_events(entry_id,action,actor,reason) values(row.id,'Proposed',sid,reason_text);
 if can_approve then update public.ffh_income_entries set status='Approved',approved_by=sid,approved_at=now() where id=row.id returning * into row;
 insert into public.ffh_income_events(entry_id,action,actor,reason) values(row.id,'Approved',sid,reason_text);end if;
 elsif action in ('approve','reject','reverse') then
 select * into row from public.ffh_income_entries where id=(payload->>'id')::uuid for update;
 if not found or not ffh_private.income_visible(row.staff_id) then raise exception 'Entry not found in your scope';end if;
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
end $function$

;
create or replace function ffh_private.board_write_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return new;end if;
 if tg_table_name='ffh_shared_content' then if new.content_key='incentive_hub_cover' and not ffh_private.allowed('cpo','edit') then raise exception 'CPO cover edit access required' using errcode='42501';end if;end if;
 if tg_table_name='ffh_briefings' and not exists(select 1 from public.ffh_profiles p where p.staff_id=public.ffh_my_staff_id() and p.can_manage and ffh_private.allowed('briefings','edit')) then raise exception 'SR accounts can only read notices' using errcode='42501';end if;
 return new;
end$$;
revoke all on function ffh_private.board_write_guard() from public,anon,authenticated;
create trigger ffh_board_guard before insert or update on public.ffh_shared_content for each row execute function ffh_private.board_write_guard();
create trigger ffh_board_guard before insert or update on public.ffh_briefings for each row execute function ffh_private.board_write_guard();
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='ffh_home_messages' and schemaname='public') then alter publication supabase_realtime add table public.ffh_home_messages;end if;
end$$;
CREATE OR REPLACE FUNCTION public.ffh_shared_read(content text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
select (content='incentive_hub_cover' and ffh_my_staff_id() is not null) or ffh_owner() or (ffh_my_staff_id() is not null and (content='ai_knowledge' or (content not like 'zone:%' and ffh_current_zone()='PRIMARY') or split_part(content,':',2)=ffh_current_zone()));
$function$

;
CREATE OR REPLACE FUNCTION public.ffh_shared_edit(content text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select case when content='incentive_hub_cover' then public.ffh_module_edit('cpo') when content='ai_knowledge' then public.ffh_module_edit('kb') else public.ffh_owner() or (public.ffh_shared_read(content) and public.ffh_module_edit(case when content like '%cpo_campaigns' then 'cpo' else 'settings' end)) end
$function$

;
commit;
