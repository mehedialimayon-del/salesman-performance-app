begin;
-- Reuse an inactive verification identity only inside this rolled-back test.
select set_config('ffh.test_head_uid',(select auth_user_id::text from public.ffh_profiles where staff_id='QA_LIVE_MANAGER'),true);
update public.ffh_profiles set auth_user_id=null where staff_id='QA_LIVE_MANAGER';
update public.ffh_profiles set auth_user_id=current_setting('ffh.test_head_uid')::uuid where staff_id='PERVES_HIRA';
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='PERVES_HIRA'),true);
set local role authenticated;
do $$begin
 if not public.ffh_staff_view('M21954') then raise exception 'Head Office must see Ayon';end if;
 if public.ffh_module_edit('sales') or public.ffh_module_edit('kb') then raise exception 'Head Office must default to view only';end if;
 if not exists(select 1 from public.ffh_profiles where staff_id='M21954') then raise exception 'Owner profile hidden';end if;
 perform public.ffh_governance('head_office_activity','{}');
 begin update public.ffh_profiles set full_name='UNAUTHORIZED' where staff_id='PERVES_HIRA';raise exception 'Head Office changed own profile';exception when insufficient_privilege then null;end;
 begin perform public.ffh_governance('set_zone_active','{"zone_id":"PRIMARY","active":false}');raise exception 'Head Office changed zone';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='WAHID_ADMIN'),true);
set local role authenticated;
do $$begin
 begin update public.ffh_profiles set full_name='UNAUTHORIZED' where staff_id='PERVES_HIRA';raise exception 'Delegated admin changed Head Office';exception when insufficient_privilege then null;end;
 begin perform public.ffh_governance('save_access','{"staff_id":"PERVES_HIRA","designation":"HEAD_OF_SALES","zones":["*"],"grants":[]}');raise exception 'Delegated admin changed Head Office access';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='M21954'),true);
set local role authenticated;
do $$begin
 perform public.ffh_governance('save_access','{"staff_id":"PERVES_HIRA","designation":"HEAD_OF_SALES","zones":["PRIMARY"],"grants":[{"module":"sales","can_edit":true}]}');
 begin insert into public.ffh_access_grants(staff_id,module,can_edit) values('PERVES_HIRA','kb',true);raise exception 'Head Office AI_BASE enabled';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='PERVES_HIRA'),true);
set local role authenticated;
do $$begin
 if not public.ffh_module_edit('sales') or public.ffh_module_edit('kb') then raise exception 'Owner sales grant failed';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='M21954'),true);
set local role authenticated;
select public.ffh_governance('save_access','{"staff_id":"PERVES_HIRA","designation":"HEAD_OF_SALES","zones":["PRIMARY"],"grants":[]}');
select public.ffh_governance('set_zone_active','{"zone_id":"PRIMARY","active":false}');
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='PERVES_HIRA'),true);
set local role authenticated;
do $$begin
 if public.ffh_staff_view('M21954') then raise exception 'Inactive zone remains visible';end if;
 if public.ffh_module_edit('sales') then raise exception 'Revoked edit remains active';end if;
end$$;
reset role;
rollback;
select 'PASS: Head Office sees Ayon; only owner edits account and grants; AI_BASE blocked; live permission revoke and inactive zone exclusion; test changes rolled back' as result;
