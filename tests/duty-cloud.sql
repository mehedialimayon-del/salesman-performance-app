begin;
-- No real messages, attendance or notifications remain after this test.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.ffh_duty('checkin',jsonb_build_object('latitude',3.139,'longitude',101.687,'accuracy_m',10,'captured_at',now(),'consent_version','duty-location-v1','tracking_mode','web'));
 if r->>'staff_id'<>'M22075' then raise exception 'Incorrect identity';end if;
 begin perform public.ffh_duty('access','{"shared":true}'::jsonb);raise exception 'SR access escalation succeeded';exception when insufficient_privilege then null;end;
 perform public.ffh_duty('message','{"recipient":"M21954","body":"ROLLBACK TEST: SR to manager"}'::jsonb);
 if exists(select 1 from public.ffh_location_points) then raise exception 'SR can see location records without grant';end if;
 if (public.ffh_duty('state')->>'can_track')::boolean then raise exception 'SR sees tracking by default';end if;
 end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if not (public.ffh_duty('state')->>'can_track')::boolean then raise exception 'Owner tracking denied';end if;
 if not exists(select 1 from public.ffh_attendance where staff_id='M22075') then raise exception 'Owner cannot see attendance';end if;
 perform public.ffh_duty('message','{"recipient":"M22075","body":"ROLLBACK TEST: manager to SR"}'::jsonb);
 perform public.ffh_duty('access','{"shared":true,"viewer":"M22268","targets":["M22075"]}'::jsonb);
 end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22268'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if not (public.ffh_duty('state')->>'can_track')::boolean then raise exception 'Assigned viewer denied';end if;
 if exists(select 1 from public.ffh_live_messages where body like 'ROLLBACK TEST:%') then raise exception 'Unrelated viewer sees private chats';end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
select public.ffh_duty('access','{"shared":false}'::jsonb);
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22268'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin if (public.ffh_duty('state')->>'can_track')::boolean then raise exception 'Global OFF did not revoke viewing';end if;end$$;
reset role;
do $$begin
 if (select count(*) from public.ffh_notification_jobs where body like 'ROLLBACK TEST:%')<>2 then raise exception 'Bidirectional message push not queued';end if;
end$$;
rollback;
select 'PASS: attendance identity, SR escalation denial, private chats, viewer grant/revoke, two-way push queue' as result;
