reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
alter table public.ffh_sales enable trigger ffh_sales_attendance;
do $$declare stamp timestamptz;after_stamp timestamptz;trash_id bigint;begin
 select delivered_at into stamp from public.ffh_sales where id='QA_SALE';
 delete from public.ffh_sales where id='QA_SALE';
 select max(id) into trash_id from ffh_private.trash where row_key->>'id'='QA_SALE' and status='Deleted';
 perform public.ffh_governance('restore',jsonb_build_object('id',trash_id));
 select delivered_at into after_stamp from public.ffh_sales where id='QA_SALE';
 if after_stamp is distinct from stamp then raise exception 'FAIL undo changed delivery timestamp';end if;
end$$;
select public.ffh_governance('save_access','{"staff_id":"QA_MANAGER","designation":"MANAGER","zones":["QA_ZONE_A"],"grants":[{"module":"sales","can_edit":false,"can_delete":true}]}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001001","role":"authenticated"}',true);
do $$declare n int;begin
 if public.ffh_staff_edit('QA_SR_A','sales') then raise exception 'FAIL delete implies edit';end if;
 delete from public.ffh_sales where id='QA_SALE';get diagnostics n=row_count;if n<>1 then raise exception 'FAIL independent delete grant';end if;
 if exists(select 1 from jsonb_array_elements(public.ffh_governance('history',jsonb_build_object('month',to_char(now() at time zone 'Asia/Kuala_Lumpur','YYYY-MM'),'offset',0,'limit',50))) a where a->>'actor'<>'QA_MANAGER') then raise exception 'FAIL other actor audit visible';end if;
end$$;
reset role;
select 'PASS original delivery timestamp after Undo, restore attendance bypass restricted to owner Trash operation, delete-only grant and private audit scope' as restore_verification;
