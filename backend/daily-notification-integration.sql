
create or replace function ffh_private.daily_delivered(ids text[],from_day date,to_day date,combine_zones boolean) returns numeric language sql stable security definer set search_path='' as $$
with controls as(select u.* from public.ffh_daily_updates u where combine_zones and u.entry_scope='zone' and u.sale_date between from_day and to_day and exists(select 1 from public.ffh_profiles p where p.active and p.can_sell and p.staff_id=any(ids) and p.zone_id=u.zone_id) and not exists(select 1 from public.ffh_profiles p where p.active and p.can_sell and p.zone_id=u.zone_id and not(p.staff_id=any(ids)))),
values_by_staff as(select u.staff_id,u.zone_id,u.sale_date,u.delivered_amount from public.ffh_daily_updates u where u.entry_scope='staff' and u.staff_id=any(ids) and u.sale_date between from_day and to_day
union all select s.sr_id,p.zone_id,coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date),s.delivered_amount from public.ffh_sales s join public.ffh_profiles p on p.staff_id=s.sr_id where s.sr_id=any(ids) and s.status='Delivered' and coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date) between from_day and to_day and not exists(select 1 from public.ffh_daily_updates u where u.entry_scope='staff' and u.staff_id=s.sr_id and u.sale_date=coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date)))
select coalesce((select sum(v.delivered_amount) from values_by_staff v where not exists(select 1 from controls c where c.zone_id=v.zone_id and c.sale_date=v.sale_date)),0)+coalesce((select sum(delivered_amount) from controls),0)
$$;
revoke all on function ffh_private.daily_delivered(text[],date,date,boolean) from public,anon,authenticated;
create or replace function ffh_private.sales_focus_payload(viewer text,report_day date) returns jsonb language sql stable security definer set search_path='' as $$
with team as(select p.staff_id,p.full_name,coalesce(i.actual_target,p.monthly_target,0) target from public.ffh_profiles p left join public.ffh_income_settings i on i.staff_id=p.staff_id and i.month=to_char(report_day,'YYYY-MM') where p.active and p.login_approved and p.can_sell and ffh_private.viewer_scope(viewer,p.staff_id)),
people as(select t.*,ffh_private.daily_delivered(array[t.staff_id],date_trunc('month',report_day)::date,report_day,false) delivered,
(select count(*) from public.ffh_outlets o where o.sr_id=t.staff_id and o.active) outlets,
(select count(*) from public.ffh_outlets o where o.sr_id=t.staff_id and o.active and not exists(select 1 from public.ffh_sales s where s.sr_id=o.sr_id and s.outlet_code=o.outlet_code and s.status='Delivered' and s.delivered_amount>0 and coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date) between date_trunc('month',report_day)::date and report_day) and not exists(select 1 from public.ffh_daily_updates u cross join lateral jsonb_array_elements(u.outlet_lines) l where u.entry_scope='staff' and u.staff_id=o.sr_id and (l->>'code'=o.outlet_code or lower(trim(l->>'name'))=lower(trim(o.outlet_name))) and (l->>'delivered_amount')::numeric>0 and u.sale_date between date_trunc('month',report_day)::date and report_day)) zero,
(select count(*) from public.ffh_tasks x where x.assigned_to in(t.staff_id,'ALL') and x.status not in('Done','Completed','Cancelled','Pending Review')) pending_tasks from team t),
report as(select coalesce(sum(target),0) target,ffh_private.daily_delivered(array(select staff_id from team),date_trunc('month',report_day)::date,report_day,exists(select 1 from public.ffh_profiles where staff_id=viewer and can_manage)) delivered,coalesce(sum(outlets),0) outlets,coalesce(sum(zero),0) zero,
(select count(*) from public.ffh_tasks x where x.status not in('Done','Completed','Cancelled','Pending Review') and(x.assigned_to='ALL' or x.assigned_to in(select staff_id from team) or x.assigned_to=viewer)) pending_tasks from people)
select jsonb_build_object('target',r.target,'delivered',r.delivered,'shortfall',greatest(r.target-r.delivered,0),'outlets',r.outlets,'zero',r.zero,'pending_tasks',r.pending_tasks,
'body','MTD '||to_char(report_day,'YYYY-MM')||' | Target RM '||round(r.target,2)||' | Delivered RM '||round(r.delivered,2)||' | Shortfall RM '||round(greatest(r.target-r.delivered,0),2)||' | Outlets '||r.outlets||' | Zero outlets '||r.zero||' | Pending tasks '||r.pending_tasks,
'people',coalesce((select jsonb_agg(jsonb_build_object('staff_id',p.staff_id,'full_name',p.full_name,'target',p.target,'delivered',p.delivered,'shortfall',greatest(p.target-p.delivered,0),'outlets',p.outlets,'zero',p.zero,'body',p.full_name||' ('||p.staff_id||') | Target RM '||round(p.target,2)||' | Delivered RM '||round(p.delivered,2)||' | Shortfall RM '||round(greatest(p.target-p.delivered,0),2)||' | Outlets '||p.outlets||' | Zero outlets '||p.zero||' | Pending tasks '||p.pending_tasks) order by p.staff_id) from people p),'[]'::jsonb)) from report r
$$;
revoke all on function ffh_private.sales_focus_payload(text,date) from public,anon,authenticated;
grant execute on function ffh_private.sales_focus_payload(text,date) to service_role;
CREATE OR REPLACE FUNCTION ffh_private.daily_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 perform ffh_private.reward_daily_nudges(r.staff_id,null,false);
 end loop;end if;
 if pref.evening_enabled and hm=pref.evening_time then
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select staff_id,'evening','Meeting & next-day plan','Prepare for the 20:30 meeting. Review your permitted scope, pending tasks and next-day route.',now(),'scheduled','SYSTEM','evening-v2:'||day||':'||staff_id from public.ffh_profiles where active and login_approved
 on conflict(source_key) where source_key is not null do nothing;get diagnostics inserted=row_count;total:=total+inserted;end if;
 return total;end$function$;


