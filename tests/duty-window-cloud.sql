begin;
insert into public.ffh_attendance(staff_id,shift_end,latitude,longitude,accuracy_m,consent_version,tracking_mode) values('M22328',now()+interval '1 hour',3.139,101.687,10,'duty-location-v1','web') on conflict(staff_id,duty_date) do update set check_out=null,shift_end=now()+interval '1 hour';
insert into public.ffh_campaigns(id,title,campaign_type,execution_mode,assigned_to,start_date,end_date,active) values('ROLLBACK-QA-EXPIRED','ROLLBACK QA expired','CPO','proof','M22328',(now() at time zone 'Asia/Kuala_Lumpur')::date-2,(now() at time zone 'Asia/Kuala_Lumpur')::date-1,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22328'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare a jsonb;begin
 a:=public.ffh_duty('state')->'attendance';perform set_config('qa.attendance',a->>'id',true);
 begin perform public.ffh_duty('daily_home',jsonb_build_object('attendance_id',a->>'id','residence',true));raise exception 'SR may mark home';exception when insufficient_privilege then null;end;
 begin insert into public.ffh_campaign_executions(id,campaign_id,sr_id,outlet_code,execution_date,status) values('ROLLBACK-EXE','ROLLBACK-QA-EXPIRED','M22328','QA',(now() at time zone 'Asia/Kuala_Lumpur')::date,'DONE');raise exception 'Expired proof accepted';exception when raise_exception then if sqlerrm not like 'Campaign not active%' then raise;end if;end;
 perform public.ffh_duty('checkout');
 begin perform public.ffh_duty('point',jsonb_build_object('attendance_id',a->>'id','latitude',3.139,'longitude',101.687,'accuracy_m',10,'captured_at',now()));raise exception 'Location after checkout accepted';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 perform public.ffh_duty('daily_home',jsonb_build_object('attendance_id',current_setting('qa.attendance'),'residence',true,'enabled',true));
 if not exists(select 1 from public.ffh_attendance where id=current_setting('qa.attendance')::uuid and daily_home_residence and home_set_by='M21954') then raise exception 'Owner daily-home setting failed';end if;
end$$;
reset role;
rollback;
select 'PASS: expired CPO proof rejected; checkout stops location; owner-only daily-home marking; tests rolled back' as result;
