begin;
create table if not exists public.ffh_income_settings(staff_id text not null references public.ffh_profiles(staff_id),month text not null check(month ~ '^\d{4}-\d{2}$'),actual_target numeric not null default 50000 check(actual_target>=50000),planning_target numeric not null default 50000 check(planning_target>=0),basic numeric not null default 0 check(basic>=0),fuel numeric not null default 0 check(fuel>=0),house_rent numeric not null default 0 check(house_rent>=0),sku_targets jsonb not null default '[]',manager_rule jsonb not null default '{}',updated_by text not null,updated_at timestamptz not null default now(),primary key(staff_id,month));
create table if not exists public.ffh_income_approvers(staff_id text primary key references public.ffh_profiles(staff_id),granted_by text not null,created_at timestamptz not null default now());
create table if not exists public.ffh_income_entries(id uuid primary key default gen_random_uuid(),staff_id text not null references public.ffh_profiles(staff_id),entry_date date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,kind text not null check(kind in ('Incentive','Penalty')),amount numeric not null check(amount>0),reason text not null check(length(trim(reason)) between 1 and 2000),created_by text not null references public.ffh_profiles(staff_id),created_at timestamptz not null default now(),status text not null default 'Pending' check(status in ('Pending','Approved','Rejected','Reversed')),approved_by text,approved_at timestamptz,reversed_by text,reversed_at timestamptz,reversal_reason text,legacy_id text unique);
create index if not exists ffh_income_entries_staff_date on public.ffh_income_entries(staff_id,entry_date desc);
create table if not exists public.ffh_income_events(id bigint generated always as identity primary key,entry_id uuid not null references public.ffh_income_entries(id),action text not null,actor text not null,reason text not null,created_at timestamptz not null default now());
create table if not exists public.ffh_reward_offers(id uuid primary key default gen_random_uuid(),title text not null,assigned_to text not null,start_date date not null,end_date date not null,groups jsonb not null,poster_url text,active boolean not null default true,created_by text not null,created_at timestamptz not null default now(),check(end_date>=start_date));
-- Preserve cloud adjustments once; never erase their reasons.
insert into public.ffh_income_entries(staff_id,entry_date,kind,amount,reason,created_by,status,approved_by,approved_at,legacy_id)
select case when a.sr_id='MANAGER' then 'M21954' else a.sr_id end,coalesce(a.adjustment_date,a.created_at::date),case when a.kind='Penalty' then 'Penalty' else 'Incentive' end,a.amount,coalesce(nullif(a.reason,''),'Legacy adjustment')||' · Given by: '||coalesce(a.given_by,''),'M21954','Approved','M21954',a.created_at,a.id
from public.ffh_adjustments a where a.amount>0 and exists(select 1 from public.ffh_profiles p where p.staff_id=case when a.sr_id='MANAGER' then 'M21954' else a.sr_id end) on conflict(legacy_id) do nothing;
insert into public.ffh_income_events(entry_id,action,actor,reason) select e.id,'Migrated','M21954','Preserved pre-existing cloud adjustment' from public.ffh_income_entries e where legacy_id is not null and not exists(select 1 from public.ffh_income_events v where v.entry_id=e.id);
revoke insert,update,delete on public.ffh_adjustments from authenticated,anon;
-- Mutation goes through one authenticated, atomic state machine.
alter table public.ffh_income_settings enable row level security;
alter table public.ffh_income_approvers enable row level security;
alter table public.ffh_income_entries enable row level security;
alter table public.ffh_income_events enable row level security;
alter table public.ffh_reward_offers enable row level security;
create policy ffh_income_settings_read on public.ffh_income_settings for select to authenticated using(public.ffh_staff_view(staff_id));
create policy ffh_income_approvers_read on public.ffh_income_approvers for select to authenticated using(public.ffh_my_staff_id() is not null);
create policy ffh_income_entries_read on public.ffh_income_entries for select to authenticated using(public.ffh_my_staff_id() is not null);
create policy ffh_income_events_read on public.ffh_income_events for select to authenticated using(public.ffh_my_staff_id() is not null);
create policy ffh_reward_offers_read on public.ffh_reward_offers for select to authenticated using(assigned_to='ALL' or public.ffh_staff_view(assigned_to));
grant select on public.ffh_income_settings,public.ffh_income_approvers,public.ffh_income_entries,public.ffh_income_events,public.ffh_reward_offers to authenticated;
revoke insert,update,delete on public.ffh_income_settings,public.ffh_income_approvers,public.ffh_income_entries,public.ffh_income_events,public.ffh_reward_offers from authenticated,anon;
create or replace function ffh_private.earnings_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();target text;mid uuid;row public.ffh_income_entries%rowtype;reason_text text;can_approve boolean;d date;g jsonb;startd date;endd date;settings jsonb;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved login required' using errcode='42501';end if;
 can_approve:=public.ffh_owner() or exists(select 1 from public.ffh_income_approvers where staff_id=sid);
 if action='state' then
 return jsonb_build_object('can_approve',can_approve,'settings',coalesce((select jsonb_agg(to_jsonb(x)) from public.ffh_income_settings x where public.ffh_staff_view(staff_id)),'[]'::jsonb),'offers',coalesce((select jsonb_agg(to_jsonb(x)) from public.ffh_reward_offers x where assigned_to='ALL' or public.ffh_staff_view(assigned_to)),'[]'::jsonb),'entries',coalesce((select jsonb_agg(to_jsonb(x) order by created_at desc) from public.ffh_income_entries x),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(x) order by created_at) from public.ffh_income_events x),'[]'::jsonb),'approvers',coalesce((select jsonb_agg(staff_id) from public.ffh_income_approvers),'[]'::jsonb));
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
 if not public.ffh_can_manage() then raise exception 'Offer publisher access required' using errcode='42501';end if;
 target:=coalesce(payload->>'assigned_to','ALL');if target<>'ALL' and not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) then raise exception 'Invalid recipient';end if;
 startd:=(payload->>'start_date')::date;endd:=(payload->>'end_date')::date;
 if endd<startd or endd<(now() at time zone 'Asia/Kuala_Lumpur')::date or length(trim(coalesce(payload->>'title','')))=0 or jsonb_typeof(payload->'groups')<>'array' or jsonb_array_length(payload->'groups')=0 then raise exception 'Invalid offer dates or groups';end if;
 for g in select value from jsonb_array_elements(payload->'groups') loop
 if coalesce(g->>'mode','') not in ('sales','single','combo') or coalesce((g->>'target')::numeric,0)<=0 or coalesce((g->>'reward')::numeric,0)<=0 or (g->>'mode'='single' and jsonb_array_length(g->'skus')<>1) or (g->>'mode'='combo' and jsonb_array_length(g->'skus')<2) then raise exception 'Invalid offer rule';end if;
 end loop;
 insert into public.ffh_reward_offers(title,assigned_to,start_date,end_date,groups,poster_url,created_by) values(payload->>'title',target,startd,endd,payload->'groups',nullif(payload->>'poster_url',''),sid) returning id into mid;
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select p.staff_id,'incentive','New incentive · '||(payload->>'title'),'Offer active '||startd||' to '||endd,now(),'scheduled',sid,'offer:'||mid||':'||p.staff_id from public.ffh_profiles p where active and login_approved and (target='ALL' or staff_id=target);
 return jsonb_build_object('id',mid);
 elsif action='propose' then
 target:=payload->>'staff_id';reason_text:=trim(payload->>'reason');d:=coalesce(nullif(payload->>'entry_date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date);
 if not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) or d>(now() at time zone 'Asia/Kuala_Lumpur')::date or reason_text is null then raise exception 'Invalid staff, date or reason';end if;
 if (select count(*) from public.ffh_income_entries where created_by=sid and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many requests; retry later';end if;
 insert into public.ffh_income_entries(staff_id,entry_date,kind,amount,reason,created_by) values(target,d,payload->>'kind',(payload->>'amount')::numeric,reason_text,sid) returning * into row;
 insert into public.ffh_income_events(entry_id,action,actor,reason) values(row.id,'Proposed',sid,reason_text);
 elsif action in ('approve','reject','reverse') then
 select * into row from public.ffh_income_entries where id=(payload->>'id')::uuid for update;
 if not found then raise exception 'Entry not found';end if;
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
 from public.ffh_profiles p where p.active and p.login_approved and (p.staff_id in (row.staff_id,row.created_by,'M21954') or exists(select 1 from public.ffh_income_approvers a where a.staff_id=p.staff_id)) on conflict(source_key) where source_key is not null do nothing;
 return to_jsonb(row);
end $$;
revoke all on function ffh_private.earnings_action(text,jsonb) from public,anon;grant execute on function ffh_private.earnings_action(text,jsonb) to authenticated;
create or replace function public.ffh_earnings(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.earnings_action(action,payload)$$;
revoke all on function public.ffh_earnings(text,jsonb) from public,anon;grant execute on function public.ffh_earnings(text,jsonb) to authenticated;
-- Actual delivery timestamp prevents later backdated sales qualifying for expired offers.
create or replace function ffh_private.delivery_clock() returns trigger language plpgsql set search_path='' as $$begin
 if new.status='Delivered' and (TG_OP='INSERT' or old.status is distinct from 'Delivered') then new.delivered_at:=clock_timestamp();elsif TG_OP='UPDATE' then new.delivered_at:=old.delivered_at;end if;return new;end$$;
create trigger ffh_delivery_clock before insert or update on public.ffh_sales for each row execute function ffh_private.delivery_clock();
-- All active notices are visible, even if a specific person is assigned.
alter table public.ffh_briefings add column if not exists cover_url text;
drop policy ffh_briefings_read on public.ffh_briefings;
create policy ffh_briefings_read on public.ffh_briefings for select to authenticated using(public.ffh_my_staff_id() is not null and (public.ffh_owner() or (active and (kind='notice' or 'ALL'=any(recipients) or public.ffh_my_staff_id()=any(recipients)))));
create or replace function ffh_private.briefing_notify() returns trigger language plpgsql security definer set search_path='' as $$declare person record;begin
 if TG_OP='UPDATE' and to_jsonb(new)-'updated_at'=to_jsonb(old)-'updated_at' then return new;end if;
 update public.ffh_notification_jobs set status='cancelled' where source_key like 'briefing-time:'||new.id||':%' and status='scheduled';
 if not new.active then return new;end if;
 for person in select staff_id from public.ffh_profiles where active and login_approved and (new.kind='notice' or 'ALL'=any(new.recipients) or staff_id=any(new.recipients)) loop
 insert into public.ffh_notification_jobs(recipient,type,title,body,status,created_by,source_key)
 values(person.staff_id,new.kind,new.title,new.description,'scheduled',new.created_by,'briefing:'||new.id||':'||person.staff_id||':'||new.updated_at) on conflict(source_key) where source_key is not null do nothing;
 if new.starts_at>now() then insert into public.ffh_notification_jobs(recipient,type,title,body,status,scheduled_at,created_by,source_key) values(person.staff_id,new.kind,'Reminder · '||new.title,new.description,'scheduled',new.starts_at,new.created_by,'briefing-time:'||new.id||':'||person.staff_id||':'||new.starts_at) on conflict(source_key) where source_key is not null do update set status='scheduled',title=excluded.title,body=excluded.body;end if;
 end loop;return new;end$$;
revoke all on function ffh_private.briefing_notify() from public,anon,authenticated;
drop trigger ffh_briefing_notify on public.ffh_briefings;
create trigger ffh_briefing_notify after insert or update on public.ffh_briefings for each row execute function ffh_private.briefing_notify();
alter table public.ffh_tasks add column if not exists remind_at timestamptz;
create or replace function ffh_private.task_timed_reminder() returns trigger language plpgsql security definer set search_path='' as $$begin
 if TG_OP='UPDATE' and new.remind_at is not distinct from old.remind_at and new.status is not distinct from old.status then return new;end if;
 update public.ffh_notification_jobs set status='cancelled' where source_key like 'task-time:'||new.id||':%' and status='scheduled';
 if new.remind_at is not null and new.status not in ('Done','Pending Review') then insert into public.ffh_notification_jobs(recipient,type,title,body,status,scheduled_at,created_by,source_key) values(new.assigned_to,'task','Task reminder · '||new.title,new.description,'scheduled',new.remind_at,new.given_by_id,'task-time:'||new.id||':'||new.remind_at) on conflict(source_key) where source_key is not null do update set status='scheduled';end if;return new;end$$;
revoke all on function ffh_private.task_timed_reminder() from public,anon,authenticated;
create trigger ffh_task_timed_reminder after insert or update on public.ffh_tasks for each row execute function ffh_private.task_timed_reminder();
-- Execution is only accepted while the campaign is active in Malaysia time.
create or replace function ffh_private.campaign_window() returns trigger language plpgsql security definer set search_path='' as $$declare c public.ffh_campaigns%rowtype;d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin
 select * into c from public.ffh_campaigns where id=new.campaign_id;
 if not found or not c.active or d<c.start_date or d>c.end_date or new.execution_date<>d or c.execution_mode='view' then raise exception 'Campaign not active for submission';end if;
 if c.assigned_to<>'ALL' and c.assigned_to<>new.sr_id then raise exception 'Campaign not assigned to this staff';end if;return new;end$$;
revoke all on function ffh_private.campaign_window() from public,anon,authenticated;
create trigger ffh_campaign_window before insert or update on public.ffh_campaign_executions for each row execute function ffh_private.campaign_window();
-- Realtime remains a convenience; 15 second polling also refreshes the ledger.
do $$declare t text;begin foreach t in array array['ffh_income_settings','ffh_income_entries','ffh_income_events','ffh_income_approvers','ffh_reward_offers','ffh_briefings'] loop if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;end loop;end$$;
commit;
