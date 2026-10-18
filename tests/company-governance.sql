-- Exercise the real state function before mocked forms can hide SQL alias errors.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
select public.ffh_governance('state')->>'owner' as owner_state;
select set_config('request.jwt.claims','{}',true);
-- Attendance is tested separately; disable only this guard inside this rollback transaction.
alter table public.ffh_sales disable trigger ffh_sales_attendance;
-- Run after the migration, in the same rollback-only verification transaction.
insert into public.ffh_zones(id,name,active) values('QA_ZONE_A','QA A',true),('QA_ZONE_B','QA B',true);
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,active,login_approved,can_manage,can_sell)
values('QA_MANAGER','QA Manager','MANAGER','QA_ZONE_A','00000000-0000-0000-0000-000000001001',true,true,true,false),
('QA_SR_A','QA SR A','SR','QA_ZONE_A','00000000-0000-0000-0000-000000001002',true,true,false,true),
('QA_SR_B','QA SR B','SR','QA_ZONE_B','00000000-0000-0000-0000-000000001003',true,true,false,true),
('QA_ADMIN','QA Admin','MANAGER','QA_ZONE_B','00000000-0000-0000-0000-000000001004',true,true,true,false);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
select public.ffh_governance('save_access','{"staff_id":"QA_MANAGER","designation":"MANAGER","zones":["QA_ZONE_A"],"grants":[{"module":"sales","can_edit":true,"can_delete":false}]}'::jsonb);
select public.ffh_governance('save_access','{"staff_id":"QA_ADMIN","designation":"SALES_ADMIN","zones":["*"],"grants":[]}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001001","role":"authenticated"}',true);
do $$begin
 if not public.ffh_staff_view('QA_SR_A') or public.ffh_staff_view('QA_SR_B') then raise exception 'FAIL zone isolation';end if;
 if not public.ffh_staff_edit('QA_SR_A','sales') or public.ffh_staff_edit('QA_SR_B','sales') then raise exception 'FAIL edit scope';end if;
 if ffh_private.allowed('sales','delete') then raise exception 'FAIL edit implies delete';end if;
 begin perform public.ffh_governance('save_access','{"staff_id":"QA_ADMIN","zones":["*"],"grants":[]}'::jsonb);raise exception 'FAIL escalation allowed';exception when insufficient_privilege then null;end;
end$$;
insert into public.ffh_sales(id,sr_id,sale_date,outlet_code,outlet_name,category,sku,qty,price,order_amount,delivered_amount,status)
values('QA_SALE','QA_SR_A',current_date,'QA_OUTLET','QA Outlet','Other','QA SKU',2,10,20,0,'Pending');
do $$begin
 begin delete from public.ffh_sales where id='QA_SALE';raise exception 'FAIL delete allowed';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001004","role":"authenticated"}',true);
do $$begin if not public.ffh_staff_view('QA_SR_A') or not public.ffh_staff_view('QA_SR_B') or public.ffh_module_edit('sales') then raise exception 'FAIL all-zone view-only';end if;end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
select public.ffh_governance('save_access','{"staff_id":"QA_MANAGER","designation":"MANAGER","zones":["QA_ZONE_A","QA_ZONE_B"],"grants":[{"module":"sales","can_edit":true,"can_delete":true}]}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001001","role":"authenticated"}',true);
do $$begin if not public.ffh_staff_view('QA_SR_B') then raise exception 'FAIL multi-zone';end if;end$$;
delete from public.ffh_sales where id='QA_SALE';
reset role;
do $$begin if not exists(select 1 from ffh_private.trash where row_key->>'id'='QA_SALE' and status='Deleted') then raise exception 'FAIL trash capture';end if;end$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
select public.ffh_governance('restore',jsonb_build_object('id',(select max(id) from ffh_private.trash where row_key->>'id'='QA_SALE')));
do $$begin if not exists(select 1 from public.ffh_sales where id='QA_SALE' and qty=2) then raise exception 'FAIL restore original';end if;end$$;
select public.ffh_governance('save_access','{"staff_id":"QA_MANAGER","designation":"MANAGER","zones":["QA_ZONE_A"],"grants":[]}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001001","role":"authenticated"}',true);
do $$begin if public.ffh_staff_view('QA_SR_B') or public.ffh_module_edit('sales') then raise exception 'FAIL immediate revocation';end if;end$$;
select public.ffh_governance('request','{"module":"sales","action":"edit","record_id":"QA_SALE","reason":"Wrong quantity"}'::jsonb);
reset role;
select 'PASS scope, multi-zone, all-zone view only, edit/delete separation, escalation denial, trash, restore, revocation, requests' as verification;
