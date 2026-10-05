begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=public.ffh_earnings('propose',jsonb_build_object('staff_id','M22268','kind','Penalty','amount',20,'reason','ROLLBACK QA penalty'));
 perform set_config('qa.penalty',r->>'id',true);
 if r->>'created_by'<>'M22075' or r->>'status'<>'Pending' then raise exception 'Proposal identity/status wrong';end if;
 begin perform public.ffh_earnings('approve',jsonb_build_object('id',r->>'id','reason','Unauthorized'));raise exception 'SR approved';exception when insufficient_privilege then null;end;
 begin perform public.ffh_earnings('grant','{"staff_id":"M22075","enabled":true}');raise exception 'SR granted';exception when insufficient_privilege then null;end;
 begin update public.ffh_income_entries set status='Approved' where id=(r->>'id')::uuid;raise exception 'Direct approval allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare r jsonb;b uuid;begin
 perform public.ffh_earnings('approve',jsonb_build_object('id',current_setting('qa.penalty'),'reason','Verified penalty'));
 if not exists(select 1 from public.ffh_income_entries where id=current_setting('qa.penalty')::uuid and status='Approved' and amount=20) then raise exception 'Approval failed';end if;
 begin perform public.ffh_earnings('reverse',jsonb_build_object('id',current_setting('qa.penalty'),'reason','Wrong issuer'));raise exception 'Owner refunded another issuer';exception when insufficient_privilege then null;end;
 perform public.ffh_earnings('settings','{"staff_id":"M22075","month":"2026-10","actual_target":50000,"planning_target":30000,"basic":1000,"fuel":100,"house_rent":50,"sku_targets":[{"sku":"Juice","target":10}]}');
 if not exists(select 1 from public.ffh_income_settings where staff_id='M22075' and month='2026-10' and actual_target=50000 and planning_target=30000) then raise exception 'Targets not independent';end if;
 perform public.ffh_earnings('grant','{"staff_id":"M22268","enabled":true}');
 insert into public.ffh_briefings(kind,title,description,meeting_url,cover_url,recipients,starts_at,created_by) values('meeting','ROLLBACK QA meeting','Meeting persistence test','https://meet.google.com/qa-test','https://example.com/cover.jpg',array['ALL'],now()+interval '2 hours','M21954') returning id into b;
 if (select count(*) from public.ffh_notification_jobs where source_key like 'briefing:'||b||':%')<>(select count(*) from public.ffh_profiles where active and login_approved) then raise exception 'Multi-recipient meeting not queued';end if;
 if (select count(*) from public.ffh_notification_jobs where source_key like 'briefing-time:'||b||':%')=0 then raise exception 'Timed meeting reminder missing';end if;
 insert into public.ffh_briefings(kind,title,description,recipients,created_by) values('notice','ROLLBACK QA assigned notice','Public notice with assignment',array['M22075'],'M21954') returning id into b;
 perform set_config('qa.notice',b::text,true);
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare r jsonb;begin
 perform public.ffh_earnings('reverse',jsonb_build_object('id',current_setting('qa.penalty'),'reason','Apology accepted; refund'));
 if (select count(*) from public.ffh_income_events where entry_id=current_setting('qa.penalty')::uuid)<>3 then raise exception 'Audit history lost';end if;
 if not exists(select 1 from public.ffh_income_entries where id=current_setting('qa.penalty')::uuid and status='Reversed' and reversal_reason='Apology accepted; refund') then raise exception 'Refund not recorded';end if;
 r:=public.ffh_earnings('propose','{"staff_id":"M22075","kind":"Incentive","amount":50,"reason":"ROLLBACK QA bonus"}');perform set_config('qa.bonus',r->>'id',true);
 insert into public.ffh_tasks(id,title,description,assigned_to,given_by,given_by_id,status,remind_at) values('ROLLBACK-QA-TIMED','ROLLBACK QA minutes follow-up','Meeting action item','M22075','Emon','M22075','Open',now()+interval '1 hour');
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22268'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if not exists(select 1 from public.ffh_briefings where id=current_setting('qa.notice')::uuid) then raise exception 'Assigned notice hidden from unrelated staff';end if;
 perform public.ffh_earnings('approve',jsonb_build_object('id',current_setting('qa.bonus'),'reason','Delegated approval'));
 if not exists(select 1 from public.ffh_income_entries where id=current_setting('qa.bonus')::uuid and approved_by='M22268' and status='Approved') then raise exception 'Delegated approval failed';end if;
end$$;
reset role;
do $$begin
 if not exists(select 1 from public.ffh_notification_jobs where source_key like 'task-time:ROLLBACK-QA-TIMED:%' and scheduled_at>now()) then raise exception 'Timed task reminder missing';end if;
 if not exists(select 1 from public.ffh_notification_jobs where source_key like 'income:'||current_setting('qa.penalty')||':Reversed:%') then raise exception 'Refund notification missing';end if;
end$$;
rollback;
select 'PASS: separate targets/SKU; SR approval denial; issuer-only refund and retained history; delegated approval; multi-recipient meeting persistence; public assigned notice; timed task reminders' as result;
