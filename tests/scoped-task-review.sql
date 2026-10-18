begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
insert into public.ffh_zones(id,name) values('QA_REVIEW_A','QA review A'),('QA_REVIEW_B','QA review B');
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,active,login_approved,can_manage,can_sell) values
('QA_REVIEW_MANAGER','QA review manager','MANAGER','QA_REVIEW_A','00000000-0000-0000-0000-000000009001',true,true,true,false),
('QA_REVIEW_SR','QA review SR','SR','QA_REVIEW_A','00000000-0000-0000-0000-000000009002',true,true,false,true),
('QA_REVIEW_FOREIGN','QA foreign SR','SR','QA_REVIEW_B','00000000-0000-0000-0000-000000009003',true,true,false,true);
insert into public.ffh_access_grants(staff_id,module,can_edit) values('QA_REVIEW_MANAGER','tasks',true);
insert into public.ffh_tasks(id,title,assigned_to,given_by,given_by_id,status,proof_mode) values('QA_SCOPED_REVIEW_TASK','Rollback QA review','QA_REVIEW_SR','QA Manager','QA_REVIEW_MANAGER','Pending Review','location');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009001","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 if public.ffh_can_manage() then raise exception 'FAIL manager has owner authority';end if;
 if public.ffh_staff_edit('QA_REVIEW_FOREIGN','tasks') then raise exception 'FAIL foreign zone writable';end if;
 update public.ffh_tasks set status='Done',reviewed_by='QA_REVIEW_MANAGER',reviewed_at=now(),done_at=now(),updated_at=clock_timestamp() where id='QA_SCOPED_REVIEW_TASK';
 if not exists(select 1 from public.ffh_tasks where id='QA_SCOPED_REVIEW_TASK' and status='Done') then raise exception 'FAIL manager review blocked';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
update public.ffh_tasks set status='Pending Review',updated_at=clock_timestamp() where id='QA_SCOPED_REVIEW_TASK';
update public.ffh_access_grants set can_edit=false where staff_id='QA_REVIEW_MANAGER' and module='tasks';
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009001","role":"authenticated"}',true);
set local role authenticated;
do $$declare affected int;begin update public.ffh_tasks set status='Done',updated_at=clock_timestamp() where id='QA_SCOPED_REVIEW_TASK';get diagnostics affected=row_count;if affected<>0 then raise exception 'FAIL revoked review allowed';end if;end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009002","role":"authenticated"}',true);
do $$begin begin update public.ffh_tasks set status='Done',updated_at=clock_timestamp() where id='QA_SCOPED_REVIEW_TASK';raise exception 'FAIL SR self approval';exception when raise_exception then if sqlerrm='FAIL SR self approval' then raise;end if;end;end$$;
reset role;
rollback;
select 'PASS scoped manager task review, foreign-zone isolation, grant revocation and SR self-approval denial' as result;
