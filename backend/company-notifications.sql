begin;
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
commit;
