begin;
select set_config('request.jwt.claims','{}',true);
-- No live delivery: generated jobs, preferences and fixtures are rolled back together.
alter table public.ffh_sales disable trigger ffh_sales_attendance;
insert into public.ffh_zones(id,name,active) values('QA_PUSH_A','QA Push A',true),('QA_PUSH_B','QA Push B',true);
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,active,login_approved,can_manage,can_sell,monthly_target)
values('QA_PUSH_MANAGER','QA Push Manager','MANAGER','QA_PUSH_A','00000000-0000-0000-0000-000000006001',true,true,true,false,50000),
('QA_PUSH_SR_A','QA Push SR A','SR','QA_PUSH_A','00000000-0000-0000-0000-000000006002',true,true,false,true,50000),
('QA_PUSH_SR_B','QA Push SR B','SR','QA_PUSH_B','00000000-0000-0000-0000-000000006003',true,true,false,true,50000);
insert into public.ffh_outlets(sr_id,outlet_code,outlet_name,category,total_sku,active) values('QA_PUSH_SR_A','A1','QA Sold','QA',10,true),('QA_PUSH_SR_A','A0','QA Zero','QA',10,true),('QA_PUSH_SR_B','B1','QA Other','QA',10,true);
insert into public.ffh_sales(id,sr_id,sale_date,outlet_code,outlet_name,category,sku,qty,price,order_amount,delivered_amount,status) values
('QA_PUSH_SALE_A','QA_PUSH_SR_A',(now() at time zone 'Asia/Kuala_Lumpur')::date,'A1','QA Sold','QA','QA SKU',2,10,20,20,'Delivered'),
('QA_PUSH_SALE_B','QA_PUSH_SR_B',(now() at time zone 'Asia/Kuala_Lumpur')::date,'B1','QA Other','QA','QA SKU',9,10,90,90,'Delivered');
update public.ffh_notification_preferences set morning_enabled=true,morning_time=date_trunc('minute',now() at time zone 'Asia/Kuala_Lumpur')::time,evening_enabled=false where id=1;
select public.ffh_generate_daily_notifications();
select public.ffh_generate_daily_notifications();
do $$declare r jsonb;d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin
 r:=ffh_private.sales_focus_payload('QA_PUSH_SR_A',d);if (r->>'delivered')::numeric<>20 or (r->>'target')::numeric<>50000 or (r->>'outlets')::int<>2 or (r->>'zero')::int<>1 then raise exception 'Individual SR A report wrong';end if;
 r:=ffh_private.sales_focus_payload('QA_PUSH_SR_B',d);if (r->>'delivered')::numeric<>90 or (r->>'outlets')::int<>1 or (r->>'zero')::int<>0 then raise exception 'Individual SR B report wrong';end if;
 r:=ffh_private.sales_focus_payload('QA_PUSH_MANAGER',d);if (r->>'delivered')::numeric<>20 or jsonb_array_length(r->'people')<>1 then raise exception 'Manager report escapes team';end if;
 r:=ffh_private.sales_focus_payload('M21954',d);if not exists(select 1 from jsonb_array_elements(r->'people') x where x->>'staff_id'='QA_PUSH_SR_B') then raise exception 'Owner company report incomplete';end if;
 if (select count(*) from public.ffh_notification_jobs where source_key='morning-v2:'||d||':QA_PUSH_SR_A' and recipient='QA_PUSH_SR_A' and body like '%Delivered RM 20.00%' and body like '%Shortfall RM 49980.00%')<>1 then raise exception 'SR job not individual or duplicate';end if;
 if not exists(select 1 from public.ffh_notification_jobs where source_key='morning-v2:'||d||':QA_PUSH_MANAGER' and recipient='QA_PUSH_MANAGER' and body like '%Delivered RM 20.00%' and body like '%Outlets 2%') then raise exception 'Manager summary incorrect';end if;
 if not exists(select 1 from public.ffh_notification_jobs where source_key='morning-sr-copy:'||d||':QA_PUSH_SR_B' and recipient='M21954' and body like '%Delivered RM 90.00%') then raise exception 'Owner individual copy missing';end if;
 if exists(select 1 from public.ffh_notification_jobs where source_key='morning-sr-copy:'||d||':QA_PUSH_SR_B' and recipient<>'M21954') then raise exception 'Owner copy leaked';end if;
end$$;
set local role authenticated;
do $$begin
 begin perform public.ffh_notification_focus_report('QA_PUSH_SR_B');raise exception 'Report RPC callable by ordinary client';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
select 'PASS SR own figures, manager assigned zone totals, owner company totals and individual SR copies, idempotency and service-only recipient reports; no notifications sent or fixtures retained' as result;
