begin;
CREATE OR REPLACE FUNCTION ffh_private.reward_daily_nudges(affected_staff text DEFAULT NULL::text, affected_zone text DEFAULT NULL::text, all_staff boolean DEFAULT true)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.ffh_reward_offers%rowtype;p record;g jsonb;idx integer;got numeric;gap numeric;unit text;key text;body text;n integer:=0;today date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;period_key text;
begin
 for o in select * from public.ffh_reward_offers where active and today between start_date and end_date loop
 for p in select * from public.ffh_profiles where ffh_private.reward_recipient(o.audience,o.assigned_to,staff_id) and(all_staff or staff_id=affected_staff or(o.audience->>'kind'='team' and(zone_id=affected_zone or staff_id='M21954' or owner_access or exists(select 1 from public.ffh_zone_access z where z.staff_id=ffh_profiles.staff_id and z.zone_id in ('*',affected_zone))))) loop
 idx:=0;for g in select value from jsonb_array_elements(o.groups) loop
 got:=ffh_private.reward_measure(o,g,p.staff_id,coalesce(g->>'period','window')='daily');gap:=greatest(0,(g->>'target')::numeric-got);unit:=case g->>'mode' when 'sales' then 'RM' when 'orders' then 'POs' when 'outlets' then 'outlets' else 'cartons' end;
 period_key:=case when gap=0 and coalesce(g->>'period','window')<>'daily' then o.start_date::text else today::text end;
 key:='reward-progress:'||o.id||':'||o.version||':'||idx||':'||p.staff_id||':'||period_key||':'||case when gap=0 then 'earned' else 'remaining:'||gap::text end;
 body:=case when gap=0 then 'Target achieved. RM '||(g->>'reward')||' incentive · '||coalesce(g->>'name',o.title) else 'Only '||gap||' '||unit||' remaining to earn RM '||(g->>'reward')||'. Do not miss this opportunity.' end;
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key) values(p.staff_id,'incentive',o.title,body,now(),'scheduled',o.created_by,key) on conflict(source_key) where source_key is not null do nothing;
 idx:=idx+1;n:=n+1;
 end loop;end loop;end loop;return n;
end$function$;
commit;
