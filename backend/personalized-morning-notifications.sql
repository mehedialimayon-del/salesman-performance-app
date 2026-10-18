-- Compute the report separately for each viewer on the server, independent of the device's selected SR.
begin;
create or replace function ffh_private.sales_focus_payload(viewer text,report_day date) returns jsonb
language sql stable security definer set search_path='' as $$
 with team as (
 select p.staff_id,p.full_name,coalesce(i.actual_target,p.monthly_target,0) as target
 from public.ffh_profiles p left join public.ffh_income_settings i on i.staff_id=p.staff_id and i.month=to_char(report_day,'YYYY-MM')
 where p.active and p.login_approved and p.can_sell and ffh_private.viewer_scope(viewer,p.staff_id)),
 people as (
 select t.*,
 coalesce((select sum(s.delivered_amount) from public.ffh_sales s where s.sr_id=t.staff_id and s.status='Delivered' and s.sale_date between date_trunc('month',report_day)::date and report_day),0) as delivered,
 (select count(*) from public.ffh_outlets o where o.sr_id=t.staff_id and o.active) as outlets,
 (select count(*) from public.ffh_outlets o where o.sr_id=t.staff_id and o.active and not exists(select 1 from public.ffh_sales s where s.sr_id=o.sr_id and s.outlet_code=o.outlet_code and s.status='Delivered' and s.delivered_amount>0 and s.sale_date between date_trunc('month',report_day)::date and report_day)) as zero,
 (select count(*) from public.ffh_tasks x where x.assigned_to in (t.staff_id,'ALL') and x.status not in ('Done','Completed','Cancelled','Pending Review')) as pending_tasks
 from team t),
 report as (
 select coalesce(sum(target),0) as target,coalesce(sum(delivered),0) as delivered,coalesce(sum(outlets),0) as outlets,coalesce(sum(zero),0) as zero,
 (select count(*) from public.ffh_tasks x where x.status not in ('Done','Completed','Cancelled','Pending Review') and (x.assigned_to='ALL' or x.assigned_to in(select staff_id from team) or x.assigned_to=viewer)) as pending_tasks
 from people)
 select jsonb_build_object('target',r.target,'delivered',r.delivered,'shortfall',greatest(r.target-r.delivered,0),'outlets',r.outlets,'zero',r.zero,'pending_tasks',r.pending_tasks,
 'body','MTD '||to_char(report_day,'YYYY-MM')||' | Target RM '||round(r.target,2)||' | Delivered RM '||round(r.delivered,2)||' | Shortfall RM '||round(greatest(r.target-r.delivered,0),2)||' | Outlets '||r.outlets||' | Zero outlets '||r.zero||' | Pending tasks '||r.pending_tasks,
 'people',coalesce((select jsonb_agg(jsonb_build_object('staff_id',p.staff_id,'full_name',p.full_name,'target',p.target,'delivered',p.delivered,'shortfall',greatest(p.target-p.delivered,0),'outlets',p.outlets,'zero',p.zero,
 'body',p.full_name||' ('||p.staff_id||') | Target RM '||round(p.target,2)||' | Delivered RM '||round(p.delivered,2)||' | Shortfall RM '||round(greatest(p.target-p.delivered,0),2)||' | Outlets '||p.outlets||' | Zero outlets '||p.zero||' | Pending tasks '||p.pending_tasks) order by p.staff_id) from people p),'[]'::jsonb)) from report r
$$;
revoke all on function ffh_private.sales_focus_payload(text,date) from public,anon,authenticated;
grant execute on function ffh_private.sales_focus_payload(text,date) to service_role;
create or replace function ffh_private.daily_notifications() returns integer language plpgsql security definer set search_path='' as $$
declare local_now timestamp:=now() at time zone 'Asia/Kuala_Lumpur';day date:=local_now::date;hm time:=date_trunc('minute',local_now)::time;
 pref public.ffh_notification_preferences%rowtype;r record;offr record;g jsonb;amt numeric;goal numeric;zero_count int;task_count int;progress numeric;msg text;report jsonb;person jsonb;inserted int;total int:=0;begin
 select * into pref from public.ffh_notification_preferences where id=1;if not found then return 0;end if;
 if pref.morning_enabled and hm=pref.morning_time then
 for r in select staff_id,full_name,can_manage,can_sell from public.ffh_profiles where active and login_approved and (can_manage or can_sell) loop
 report:=ffh_private.sales_focus_payload(r.staff_id,day);msg:=r.full_name||' | '||case when r.staff_id='M21954' then 'Company scope' when r.can_manage then 'Permitted team / zones' else 'Personal scope' end||' | '||(report->>'body');
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key) values(r.staff_id,case when r.can_manage then 'manager-summary' else 'morning' end,case when r.can_manage then 'Your permitted zones · Sales focus' else 'Your sales focus' end,msg,now(),'scheduled','SYSTEM','morning-v2:'||day||':'||r.staff_id) on conflict(source_key) where source_key is not null do nothing;
 get diagnostics inserted=row_count;total:=total+inserted;
 -- Ayon receives the individual SR reports too. Each SR still receives only their own report.
 if r.staff_id='M21954' then
 for person in select value from jsonb_array_elements(report->'people') loop
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 values(r.staff_id,'manager-summary','SR report · '||(person->>'full_name'),person->>'body',now(),'scheduled','SYSTEM','morning-sr-copy:'||day||':'||(person->>'staff_id'))
 on conflict(source_key) where source_key is not null do nothing;get diagnostics inserted=row_count;total:=total+inserted;
 end loop;end if;
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

create or replace function public.ffh_notification_focus_report(viewer text) returns jsonb language sql security invoker set search_path='' as $$select ffh_private.sales_focus_payload(viewer,(now() at time zone 'Asia/Kuala_Lumpur')::date)$$;
revoke all on function public.ffh_notification_focus_report(text) from public,anon,authenticated;
grant execute on function public.ffh_notification_focus_report(text) to service_role;
update public.ffh_notification_preferences set morning_enabled=true,morning_time='08:30' where id=1;
commit;
