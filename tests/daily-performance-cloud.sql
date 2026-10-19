-- Append after backend/daily-performance.sql inside ONE outer rollback transaction.
select set_config('request.jwt.claims','{}',true);
insert into public.ffh_zones(id,name) values('QA_PERF_A','QA performance A'),('QA_PERF_B','QA performance B');
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,can_manage,can_sell,active,login_approved,monthly_target)
select 'QA_PERF_S'||i,'QA daily SR '||i,'SR',case when i<=10 then 'QA_PERF_A' else 'QA_PERF_B' end,('00000000-0000-0000-0000-'||lpad((9600+i)::text,12,'0'))::uuid,false,true,true,true,50000 from generate_series(1,11)i;
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,can_manage,can_sell,active,login_approved,monthly_target) values('QA_PERF_M','QA daily manager','MANAGER','QA_PERF_A','00000000-0000-0000-0000-000000009700',true,false,true,true,0);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare r jsonb;d text:=(now() at time zone 'Asia/Kuala_Lumpur')::date::text;begin
r:=public.ffh_reward_campaign('save',jsonb_build_object('title','QA own combined juice','start_date',d,'end_date',d,'audience',jsonb_build_object('kind','staff','staff_ids',jsonb_build_array('QA_PERF_S1'),'zone_ids',jsonb_build_array('QA_PERF_A')),'groups','[{"name":"Combined juice","mode":"combo","skus":["QA Mango A","QA Mango B"],"basis":"order","period":"window","target":10,"reward":50}]'::jsonb));perform set_config('qa.own_offer',r->>'id',true);
r:=public.ffh_reward_campaign('save',jsonb_build_object('title','QA manager team cartons','start_date',d,'end_date',d,'audience',jsonb_build_object('kind','team','staff_ids',jsonb_build_array('QA_PERF_M'),'zone_ids',jsonb_build_array('QA_PERF_A')),'groups','[{"name":"Team juice","mode":"combo","skus":["QA Mango A","QA Mango B"],"basis":"delivered","period":"window","target":15,"reward":70}]'::jsonb));perform set_config('qa.team_offer',r->>'id',true);
begin perform public.ffh_reward_campaign('save','{"title":"Bad audience","start_date":"2026-10-01","end_date":"2026-10-31","groups":[{"mode":"sales","target":1,"reward":1}]}');raise exception 'Missing audience allowed';exception when others then if sqlerrm='Missing audience allowed' then raise;end if;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009601","role":"authenticated"}',true);
set local role authenticated;
do $$declare r jsonb;p jsonb;d text:=(now() at time zone 'Asia/Kuala_Lumpur')::date::text;begin
if exists(select 1 from public.ffh_reward_offers where id=current_setting('qa.team_offer')::uuid) then raise exception 'SR sees private manager campaign';end if;
if not exists(select 1 from public.ffh_reward_offers where id=current_setting('qa.own_offer')::uuid) then raise exception 'Assigned SR cannot see offer';end if;
if not(public.ffh_daily_sales('products','{"staff_id":"QA_PERF_S1"}') ? 'QA Mango A') then raise exception 'Active campaign SKU missing';end if;
p:=jsonb_build_object('submission_id','00000000-0000-0000-0000-000000009801','entry_scope','staff','staff_id','QA_PERF_S1','sale_date',d,'expected_version',0,'order_amount',1000,'delivered_amount',600,'order_count',6,'delivered_count',3,'order_cartons',12,'delivered_cartons',6,'product_lines','[{"sku":"QA Mango A","order_qty":7,"delivered_qty":4},{"sku":"QA Mango B","order_qty":5,"delivered_qty":2}]'::jsonb,'outlet_lines','[{"name":"QA outlet","code":"","order_count":6,"order_amount":1000,"delivered_amount":600}]'::jsonb);
r:=public.ffh_daily_sales('save',p);if r->>'version'<>'1' then raise exception 'Initial save not version 1';end if;
r:=public.ffh_daily_sales('save',p);if r->>'duplicate'<>'true' then raise exception 'Retry not idempotent';end if;
p:=p||jsonb_build_object('submission_id','00000000-0000-0000-0000-000000009802','expected_version',1,'order_amount',1100,'order_cartons',14,'product_lines','[{"sku":"QA Mango A","order_qty":9,"delivered_qty":4},{"sku":"QA Mango B","order_qty":5,"delivered_qty":2}]'::jsonb);
r:=public.ffh_daily_sales('save',p);if r->>'version'<>'2' then raise exception 'Update did not replace same day';end if;
if (select count(*) from public.ffh_daily_updates where staff_id='QA_PERF_S1')<>1 or(select count(*) from public.ffh_daily_changes where staff_id='QA_PERF_S1')<>2 then raise exception 'Duplicate daily record or event';end if;
begin perform public.ffh_daily_sales('save',p||jsonb_build_object('submission_id','00000000-0000-0000-0000-000000009803'));raise exception 'Stale save allowed';exception when serialization_failure then null;end;
begin perform public.ffh_daily_sales('save',p||jsonb_build_object('submission_id','00000000-0000-0000-0000-000000009804','staff_id','QA_PERF_S2','expected_version',0));raise exception 'Foreign save allowed';exception when insufficient_privilege then null;end;
begin perform public.ffh_reward_campaign('save','{}');raise exception 'SR can edit incentive';exception when insufficient_privilege then null;end;
begin perform public.ffh_daily_sales('save',p||jsonb_build_object('submission_id','00000000-0000-0000-0000-000000009805','expected_version',2,'product_lines','[{"sku":"NOT ASSIGNED","order_qty":1,"delivered_qty":0}]'::jsonb));raise exception 'Unassigned SKU accepted';exception when others then if sqlerrm='Unassigned SKU accepted' then raise;end if;end;
end$$;
reset role;
do $$declare o public.ffh_reward_offers%rowtype;v numeric;begin select * into o from public.ffh_reward_offers where id=current_setting('qa.own_offer')::uuid;v:=ffh_private.reward_measure(o,o.groups->0,'QA_PERF_S1',false);if v<>14 then raise exception 'Expected 14 cartons, got % (daily totals double counted)',v;end if;end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009602","role":"authenticated"}',true);set local role authenticated;
do $$begin if exists(select 1 from public.ffh_reward_offers where id=current_setting('qa.own_offer')::uuid) then raise exception 'Personal campaign leaked to other SR';end if;if exists(select 1 from public.ffh_daily_updates where staff_id='QA_PERF_S1') then raise exception 'Daily entries leaked';end if;end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);set local role authenticated;
select public.ffh_daily_sales('save',jsonb_build_object('submission_id','00000000-0000-0000-0000-000000009806','entry_scope','zone','zone_id','QA_PERF_A','sale_date',(now() at time zone 'Asia/Kuala_Lumpur')::date::text,'expected_version',0,'order_amount',2000,'delivered_amount',1500,'order_count',10,'delivered_count',8,'order_cartons',20,'delivered_cartons',15,'product_lines','[{"sku":"QA Mango A","order_qty":20,"delivered_qty":15}]'::jsonb,'outlet_lines','[]'::jsonb));
reset role;
do $$declare o public.ffh_reward_offers%rowtype;v numeric;begin select * into o from public.ffh_reward_offers where id=current_setting('qa.team_offer')::uuid;v:=ffh_private.reward_measure(o,o.groups->0,'QA_PERF_M',false);if v<>15 then raise exception 'Manager expected zone 15, got % (zone + SR counted twice)',v;end if;
if (select count(*) from public.ffh_notification_jobs where source_key like 'reward-progress:'||current_setting('qa.own_offer')||':%:earned')<>1 then raise exception 'Earned notification missing or duplicated';end if;
o.start_date:=(now() at time zone 'Asia/Kuala_Lumpur')::date-1;o.end_date:=o.start_date;v:=ffh_private.reward_measure(o,o.groups->0,'QA_PERF_M',false);if v<>0 then raise exception 'Late entry qualifies expired offer';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009700","role":"authenticated"}',true);set local role authenticated;
do $$begin if not exists(select 1 from public.ffh_daily_updates where entry_scope='zone' and zone_id='QA_PERF_A') then raise exception 'Assigned manager cannot read zone total';end if;if (select count(*) from public.ffh_profiles where staff_id like 'QA_PERF_S%' and can_sell)<>10 then raise exception 'Ten authorized SR not visible';end if;if exists(select 1 from public.ffh_profiles where staff_id='QA_PERF_S11') then raise exception 'Other zone leaked';end if;end$$;
reset role;
do $$declare v jsonb;begin
v:=ffh_private.sales_focus_payload('QA_PERF_M',(now() at time zone 'Asia/Kuala_Lumpur')::date);if(v->>'delivered')::numeric<>1500 then raise exception 'Morning manager summary did not use zone daily total';end if;
v:=ffh_private.sales_focus_payload('QA_PERF_S1',(now() at time zone 'Asia/Kuala_Lumpur')::date);if(v->>'delivered')::numeric<>600 then raise exception 'Morning SR summary did not use own daily total';end if;
end$$;
