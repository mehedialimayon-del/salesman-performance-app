-- Append after backend/dashboard-comparison.sql in ONE outer rollback transaction.
select set_config('request.jwt.claims','{}',true);
insert into public.ffh_zones(id,name) select 'QA_CMP_'||i,'QA comparison '||i from generate_series(1,8) i;
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,can_manage,can_sell,active,login_approved,monthly_target)
select 'QA_CMP_SR'||i,'QA comparison SR '||i,'SR','QA_CMP_'||i,('00000000-0000-0000-0000-'||lpad((7000+i)::text,12,'0'))::uuid,false,true,true,true,50000 from generate_series(1,8) i;
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,can_manage,can_sell,active,login_approved,monthly_target)
values('QA_CMP_MANAGER','QA comparison Manager','MANAGER','QA_CMP_1','00000000-0000-0000-0000-000000007100',true,false,true,true,0),('QA_CMP_HEAD','QA comparison Head','MANAGER','QA_CMP_1','00000000-0000-0000-0000-000000007101',true,false,true,true,0),('QA_CMP_MD','QA comparison MD','MANAGER','QA_CMP_1','00000000-0000-0000-0000-000000007102',true,false,true,true,0);
insert into public.ffh_zone_access(staff_id,zone_id) select 'QA_CMP_HEAD','QA_CMP_'||i from generate_series(1,8) i;
insert into public.ffh_zone_access(staff_id,zone_id) values('QA_CMP_MD','*');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
select public.ffh_save_sales_baseline('QA_CMP_SR1','2026-09',3000,'{"1":100,"2":200}');
do $$begin
 begin perform public.ffh_save_sales_baseline('QA_CMP_SR1','2026-09',100,'{"1":200}');raise exception 'Invalid daily total allowed';exception when others then if sqlerrm='Invalid daily total allowed' then raise;end if;end;
 begin perform public.ffh_save_sales_baseline('QA_CMP_SR1','2026-09',100,'{"31":0}');raise exception 'Invalid September day allowed';exception when others then if sqlerrm='Invalid September day allowed' then raise;end if;end;
 perform public.ffh_earnings('settings','{"staff_id":"QA_CMP_MANAGER","month":"2026-10","actual_target":50000,"planning_target":75000,"basic":1700,"fuel":300,"house_rent":200}');
 if not exists(select 1 from ffh_income_settings where staff_id='QA_CMP_MANAGER' and actual_target=0 and planning_target=0 and basic=1700 and fuel=300) then raise exception 'Management income incorrectly requires own target or loses personal income';end if;
 begin perform public.ffh_earnings('settings','{"staff_id":"QA_CMP_SR1","month":"2026-10","actual_target":0,"planning_target":0}');raise exception 'SR minimum removed';exception when others then if sqlerrm='SR minimum removed' then raise;end if;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000007001","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 if (select count(*) from ffh_sales_baselines where staff_id like 'QA_CMP_%')<>1 then raise exception 'SR cannot read own history';end if;
 perform public.ffh_save_sales_baseline('QA_CMP_SR1','2026-09',3100,'{}');
 begin perform public.ffh_save_sales_baseline('QA_CMP_SR2','2026-09',500,'{}');raise exception 'Cross-SR write allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000007100","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 if (select count(*) from ffh_profiles where staff_id like 'QA_CMP_SR%' and can_sell)<>1 then raise exception 'Manager zone leaks';end if;
 begin perform public.ffh_save_sales_baseline('QA_CMP_SR1','2026-09',500,'{}');raise exception 'View only manager can edit';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000007101","role":"authenticated"}',true);
set local role authenticated;
do $$begin if (select count(*) from ffh_profiles where staff_id like 'QA_CMP_SR%' and can_sell)<>8 then raise exception 'Head cannot see 8 permitted zones';end if;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000007102","role":"authenticated"}',true);
set local role authenticated;
do $$begin if (select count(*) from ffh_profiles where staff_id like 'QA_CMP_SR%' and can_sell)<>8 then raise exception 'MD all zones incomplete';end if;end$$;
reset role;
select 'PASS SR own history/write, foreign SR denial, manager 1 zone, Head 8 zones, MD all zones, management zero own target with personal income, SR minimum, invalid day and amount' as result;
