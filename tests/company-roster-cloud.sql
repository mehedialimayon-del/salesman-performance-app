begin;
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,active,login_approved,can_manage,can_sell,monthly_target)
values('QA_ROSTER_MANAGER','Rollback-only manager','MANAGER','KLANG',gen_random_uuid(),true,true,true,false,0);
insert into public.ffh_sales(id,sr_id,sale_date,outlet_code,outlet_name,category,sku,qty,price,order_amount,delivered_amount,status)
values('QA_ROSTER_SALE_A','M22037','2026-11-01','QA_ONLY','Rollback-only sale','Other','QA SKU',1,111,111,111,'Delivered'),
('QA_ROSTER_SALE_B','M22405','2026-11-01','QA_ONLY','Rollback-only sale','Other','QA SKU',1,222,222,222,'Delivered');
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='QA_ROSTER_MANAGER'),true);
set local role authenticated;
do $$declare d jsonb;begin
 d:=public.ffh_company_roster('state');
 if jsonb_array_length(d->'member_ids')<>6 then raise exception 'Manager must have six Klang SRs';end if;
 if not public.ffh_staff_view('M22037') or public.ffh_staff_view('M22405') then raise exception 'Zone isolation failed';end if;
 if (select sum(delivered_amount) from public.ffh_sales where id in ('QA_ROSTER_SALE_A','QA_ROSTER_SALE_B'))<>111 then raise exception 'Zone sales aggregation failed';end if;
 begin perform public.ffh_company_roster('global_view','{"staff_id":"QA_ROSTER_MANAGER","enabled":true}');raise exception 'Manager granted global access';exception when insufficient_privilege then null;end;
 begin update public.ffh_profiles set company_staff_id='M99999' where staff_id='QA_ROSTER_MANAGER';raise exception 'Manager changed company identity';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='M21954'),true);
set local role authenticated;
select public.ffh_company_roster('global_view','{"staff_id":"QA_ROSTER_MANAGER","enabled":true}');
do $$begin
 update public.ffh_profiles set company_staff_id='M99988',full_name='Rollback-only name' where staff_id='PENDING_ISTIAQ';
 if (select count(*) from public.ffh_outlets where sr_id='PENDING_ISTIAQ' and active)<>61 then raise exception 'Editing company Staff ID lost assigned outlets';end if;
 if exists(select 1 from public.ffh_outlets where sr_id='M22075' and active) then raise exception 'Emon still owns an active route';end if;
 if not exists(select 1 from public.ffh_profiles where staff_id='M22075' and can_manage and not can_sell and company_staff_id is null) then raise exception 'Emon management-only role failed';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='QA_ROSTER_MANAGER'),true);
set local role authenticated;
do $$declare d jsonb;begin
 d:=public.ffh_company_roster('state');
 if jsonb_array_length(d->'member_ids')<>61 then raise exception 'Global viewer must see 61 current SR records';end if;
 if (select sum(delivered_amount) from public.ffh_sales where id in ('QA_ROSTER_SALE_A','QA_ROSTER_SALE_B'))<>333 then raise exception 'Global sales aggregation failed';end if;
 if ffh_private.zone_visible('EAST_MALAYSIA') or ffh_private.zone_visible('CENTRAL_DC') then raise exception 'Inactive zones included';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='WAHID_ADMIN'),true);
set local role authenticated;
do $$begin
 if jsonb_array_length(public.ffh_company_roster('state')->'member_ids')<>61 then raise exception 'Wahid global scope failed';end if;
 begin insert into public.ffh_zone_access values('M22328','*');raise exception 'Delegated admin granted all-zone access';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.ffh_profiles where staff_id='PERVES_HIRA'),true);
set local role authenticated;
do $$begin
 if jsonb_array_length(public.ffh_company_roster('state')->'member_ids')<>61 or public.ffh_module_edit('kb') then raise exception 'Head Office scope / AI restriction failed';end if;
end$$;
reset role;
rollback;
select 'PASS: exact roster, zone isolation, source sales propagation, owner-only global grants, Head Office scope, excluded zones, editable public IDs and preserved Ishtiaq outlets. All test changes rolled back.' as result;
