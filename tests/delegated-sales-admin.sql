-- Rollback-only test. All fixtures are transaction-local.
select set_config('request.jwt.claims','{}',true);
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,active,login_approved,can_manage,can_sell,owner_access)
values ('QA_DELEGATE','QA Delegate','MANAGER','PRIMARY','00000000-0000-0000-0000-000000002001',true,true,true,false,true),
('QA_SUBJECT','QA Subject','SR','PRIMARY','00000000-0000-0000-0000-000000002002',true,true,false,true,false);
insert into public.ffh_zone_access values('QA_DELEGATE','*');
insert into public.ffh_access_grants(staff_id,module,can_edit,can_upload,can_delete) values('QA_DELEGATE','*',true,true,true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000002001","role":"authenticated"}',true);
do $$declare n integer;begin
 if not public.ffh_owner() or ffh_private.is_owner() then raise exception 'FAIL delegated admin became root';end if;
 if not public.ffh_staff_view('M22075') or not public.ffh_module_edit('sales') then raise exception 'FAIL scope or business grant';end if;
 if not (public.ffh_governance('state')->>'administrator')::boolean then raise exception 'FAIL live admin state';end if;
 update public.ffh_profiles set full_name='QA Subject edited' where staff_id='QA_SUBJECT';get diagnostics n=row_count;if n<>1 then raise exception 'FAIL staff edit';end if;
 begin update public.ffh_profiles set active=false where staff_id='M21954';raise exception 'FAIL root deactivation allowed';exception when insufficient_privilege then null;end;
 begin update public.ffh_profiles set full_name='ATTACK' where staff_id='M21954';raise exception 'FAIL root rename allowed';exception when insufficient_privilege then null;end;
 begin update public.ffh_profiles set owner_access=true where staff_id='QA_SUBJECT';raise exception 'FAIL admin delegation allowed';exception when insufficient_privilege then null;end;
 begin update public.ffh_profiles set owner_access=false where staff_id='QA_DELEGATE';raise exception 'FAIL own authority edit';exception when insufficient_privilege then null;end;
 begin perform public.ffh_governance('save_access','{"staff_id":"M21954","designation":"SR","zones":[],"grants":[]}'::jsonb);raise exception 'FAIL root grant changed';exception when others then if sqlerrm='FAIL root grant changed' then raise;end if;end;
 begin perform public.ffh_governance('save_access','{"staff_id":"QA_DELEGATE","designation":"SR","zones":[],"grants":[]}'::jsonb);raise exception 'FAIL own grants changed';exception when insufficient_privilege then null;end;
 perform public.ffh_governance('save_access','{"staff_id":"QA_SUBJECT","designation":"SR","zones":[],"grants":[{"module":"sales","can_edit":true}]}'::jsonb);
 if not exists(select 1 from public.ffh_access_grants where staff_id='QA_SUBJECT' and module='sales' and can_edit) then raise exception 'FAIL staff grant save';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
update public.ffh_profiles set active=false,owner_access=false where staff_id='QA_DELEGATE';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000002001","role":"authenticated"}',true);
do $$begin
 if public.ffh_owner() or public.ffh_module_edit('sales') or public.ffh_staff_view('M22075') then raise exception 'FAIL immediate revocation';end if;
 begin perform public.ffh_governance('state');raise exception 'FAIL inactive login still accepted';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS delegated edit/grants; root protection; no self escalation; owner immediate deactivation' as verification;
