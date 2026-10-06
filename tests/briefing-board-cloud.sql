begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare result jsonb;req jsonb;nid uuid;mid uuid;begin
req:=jsonb_build_object('request_id',gen_random_uuid(),'summary','ROLLBACK QA Bengali meeting change','actions','[{"kind":"notice","data":{"staff_id":"ALL","title":"ROLLBACK QA meeting change","body":"আজকের মিটিং রাত সাড়ে দশটায় হবে। CEO উপস্থিত থাকবেন।"}}]'::jsonb);
result:=public.ffh_ai_work('execute',req);nid:=(result->0->>'id')::uuid;perform set_config('qa.notice_id',nid::text,true);
if not exists(select 1 from ffh_briefings where id=nid and kind='notice' and starts_at is null and active and description like '%সাড়ে দশটায়%') then raise exception 'AI notice missing';end if;
if public.ffh_ai_work('execute',req)<>result then raise exception 'AI repeat duplicated';end if;
insert into ffh_briefings(kind,title,description,recipients,created_by) values('meeting','ROLLBACK QA dated minutes','QA',array['ALL'],'M21954') returning id into mid;perform set_config('qa.meeting_id',mid::text,true);
end$$;
reset role;
do $$begin
if (select count(distinct recipient) from ffh_notification_jobs where source_key like 'briefing:'||current_setting('qa.notice_id')||':%')<>(select count(*) from ffh_profiles where active and login_approved) then raise exception 'Notice notifications missing staff';end if;
end$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from ffh_profiles where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
if not exists(select 1 from ffh_briefings where id=current_setting('qa.notice_id')::uuid) then raise exception 'SR cannot see notice';end if;
insert into ffh_briefing_reads(briefing_id,staff_id) values(current_setting('qa.notice_id')::uuid,'M22075');
insert into ffh_dated_minutes(briefing_id,owner_staff_id,minute_date,notes) values(current_setting('qa.meeting_id')::uuid,'M22075','2026-10-06','First'),(current_setting('qa.meeting_id')::uuid,'M22075','2026-10-07','Second');
if (select count(*) from ffh_dated_minutes where briefing_id=current_setting('qa.meeting_id')::uuid)<>2 then raise exception 'Dated notes overwrite';end if;
begin insert into ffh_briefing_reads(briefing_id,staff_id) values(current_setting('qa.notice_id')::uuid,'M22268');raise exception 'Other SR receipt allowed';exception when insufficient_privilege then null;end;
begin insert into ffh_dated_minutes(briefing_id,owner_staff_id,minute_date) values(current_setting('qa.meeting_id')::uuid,'M22268','2026-10-06');raise exception 'Other SR notes allowed';exception when insufficient_privilege then null;end;
begin insert into ffh_briefings(kind,title,created_by) values('notice','SR unauthorized','M22075');raise exception 'SR publish allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from ffh_profiles where staff_id='M22268'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
if exists(select 1 from ffh_dated_minutes where briefing_id=current_setting('qa.meeting_id')::uuid) then raise exception 'Private minutes leaked';end if;
if exists(select 1 from ffh_briefing_reads where briefing_id=current_setting('qa.notice_id')::uuid) then raise exception 'Read receipt leaked';end if;
if not exists(select 1 from ffh_briefings where id=current_setting('qa.notice_id')::uuid) then raise exception 'New SR visibility missing';end if;
end$$;
rollback;
