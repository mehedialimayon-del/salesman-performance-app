-- Transaction-local profiles only; no Auth users or published data remain after rollback.
begin;
select set_config('request.jwt.claims','{}',true);
insert into public.ffh_zones(id,name,active) values('QA_AI_ZONE','QA AI Zone',true),('QA_AI_OTHER','QA Other Zone',true);
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,active,login_approved,can_manage,can_sell,owner_access)
values('QA_AI_ADMIN','QA AI Admin','MANAGER','QA_AI_ZONE','00000000-0000-0000-0000-000000005001',true,true,true,false,true),
('QA_AI_SR','QA AI SR','SR','QA_AI_ZONE','00000000-0000-0000-0000-000000005002',true,true,false,true,false),
('QA_AI_OTHER','QA Other SR','SR','QA_AI_OTHER','00000000-0000-0000-0000-000000005003',true,true,false,true,false);
update public.ffh_profiles set manager_id='QA_AI_ADMIN' where staff_id='QA_AI_SR';
insert into public.ffh_access_grants(staff_id,module,can_edit,can_upload,can_delete) values('QA_AI_ADMIN','*',true,true,true),('QA_AI_SR','kb',false,false,false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000005001","role":"authenticated"}',true);
do $$declare n int;begin
 if not public.ffh_owner() or not public.ffh_module_edit('sales') then raise exception 'Admin business access regressed';end if;
 if public.ffh_module_edit('kb') or public.ffh_shared_edit('ai_knowledge') or (public.ffh_learning('state')->>'owner')::boolean then raise exception 'Wildcard/admin implies AI access';end if;
 begin perform public.ffh_learning('bank');raise exception 'Bank opened without AI access';exception when insufficient_privilege then null;end;
 begin perform public.ffh_learning('save_answer','{"question":"QA access boundary","answer":"QA"}');raise exception 'Answer edited without access';exception when insufficient_privilege then null;end;
 update public.ffh_shared_content set payload=payload||'{"qa_denied":true}' where content_key='ai_knowledge';get diagnostics n=row_count;if n<>0 then raise exception 'Shared bank changed without access';end if;
 begin insert into public.ffh_access_grants(staff_id,module,can_edit) values('QA_AI_ADMIN','kb',true);raise exception 'Admin self granted AI access';exception when insufficient_privilege then null;end;
 begin update public.ffh_access_grants set can_edit=true where staff_id='QA_AI_SR' and module='kb';raise exception 'Admin granted AI access to SR';exception when insufficient_privilege then null;end;
 begin perform public.ffh_governance('save_access','{"staff_id":"QA_AI_SR","designation":"SR","manager_id":"QA_AI_ADMIN","zones":[],"grants":[{"module":"kb","can_edit":true}]}');raise exception 'Governance grants AI without owner';exception when insufficient_privilege then null;end;
 if not public.ffh_staff_view('QA_AI_SR') or public.ffh_staff_view('QA_AI_OTHER') then raise exception 'Home zone isolation failed';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
select public.ffh_governance('save_access','{"staff_id":"QA_AI_SR","designation":"SR","manager_id":"QA_AI_ADMIN","zones":[],"grants":[{"module":"kb","can_edit":true,"can_upload":true,"can_delete":true}]}');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000005001","role":"authenticated"}',true);
set local role authenticated;
-- Admin edits ordinary SR permissions without deleting or replacing Ayon's AI grant.
select public.ffh_governance('save_access','{"staff_id":"QA_AI_SR","designation":"SR","manager_id":"QA_AI_ADMIN","zones":[],"grants":[{"module":"sales","can_edit":false}]}');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000005002","role":"authenticated"}',true);
set local role authenticated;
do $$declare r jsonb;n int;begin
 if not public.ffh_module_edit('kb') or not public.ffh_shared_edit('ai_knowledge') then raise exception 'Explicit grant not effective';end if;
 r:=public.ffh_governance('state');if r->'my_manager'->>'staff_id'<>'QA_AI_ADMIN' then raise exception 'Own assigned manager missing';end if;
 if exists(select 1 from jsonb_array_elements(r->'profiles') p where p->>'staff_id'='QA_AI_OTHER') then raise exception 'Other zone profile leaked';end if;
 perform public.ffh_learning('bank');
 perform public.ffh_learning('save_answer','{"question":"QA access boundary","answer":"QA granted"}');
 update public.ffh_shared_content set payload=payload||'{"qa_access_test":true}' where content_key='ai_knowledge';get diagnostics n=row_count;if n<>1 then raise exception 'Explicit grantee cannot publish AI profile';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
select public.ffh_governance('save_access','{"staff_id":"QA_AI_SR","designation":"SR","manager_id":"QA_AI_ADMIN","zones":[],"grants":[{"module":"kb","can_edit":false,"can_upload":false,"can_delete":false}]}');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000005002","role":"authenticated"}',true);
set local role authenticated;
do $$declare r jsonb;n int;begin
 if public.ffh_module_edit('kb') or (public.ffh_learning('state')->>'owner')::boolean then raise exception 'Revocation failed on existing identity';end if;
 begin perform public.ffh_learning('bank');raise exception 'Revoked grantee opens bank';exception when insufficient_privilege then null;end;
 begin perform public.ffh_learning('delete_answer','{"question":"QA access boundary"}');raise exception 'Revoked grantee deletes answer';exception when insufficient_privilege then null;end;
 update public.ffh_shared_content set payload=payload||'{"qa_after_revoke":true}' where content_key='ai_knowledge';get diagnostics n=row_count;if n<>0 then raise exception 'Revoked grantee publishes';end if;
 r:=public.ffh_learning('ask','{"question":"QA access boundary"}');if r->>'answer'<>'QA granted' then raise exception 'Ordinary AI answering stopped';end if;
end$$;
reset role;
rollback;
select 'PASS explicit AI grant/revoke, admin/wildcard bypass denial, root-only delegation, grant preservation, ordinary Q&A, home zone isolation and own-manager context; no QA data retained' as result;
