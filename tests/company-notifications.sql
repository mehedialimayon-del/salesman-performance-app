reset role;
select set_config('request.jwt.claims','{}',true);
-- Explicitly choose the current minute only within this rollback-only test.
update public.ffh_notification_preferences set morning_enabled=true,morning_time=date_trunc('minute',now() at time zone 'Asia/Kuala_Lumpur')::time,evening_enabled=false where id=1;
update public.ffh_sales set status='Delivered',delivered_amount=20 where id='QA_SALE';
insert into public.ffh_sales(id,sr_id,sale_date,outlet_code,outlet_name,category,sku,qty,price,order_amount,delivered_amount,status)
values('QA_OTHER_SALE','QA_SR_B',(now() at time zone 'Asia/Kuala_Lumpur')::date,'QA_OTHER','QA Other','Other','QA SKU',9,10,90,90,'Delivered');
select public.ffh_generate_daily_notifications();
do $$begin
 if not exists(select 1 from public.ffh_notification_jobs where source_key='morning-v2:'||(now() at time zone 'Asia/Kuala_Lumpur')::date||':QA_MANAGER' and body like '%Delivered RM 20.00%') then raise exception 'FAIL zone manager summary';end if;
 if not exists(select 1 from public.ffh_notification_jobs where source_key='morning-v2:'||(now() at time zone 'Asia/Kuala_Lumpur')::date||':QA_ADMIN' and body like '%Delivered RM 110.00%') then raise exception 'FAIL all-zone summary';end if;
 if exists(select 1 from public.ffh_notification_jobs where recipient='QA_SR_B' and type='incentive' and body like 'QA scoped offer%') then raise exception 'FAIL incentive notification leak';end if;
end$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
select public.ffh_governance('save_access','{"staff_id":"QA_MANAGER","designation":"MANAGER","zones":["QA_ZONE_A"],"grants":[{"module":"briefings","can_edit":true},{"module":"catalogue","can_upload":true}]}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001001","role":"authenticated"}',true);
insert into public.ffh_briefings(kind,title,description,recipients,created_by) values('notice','QA NOTICE','QA scoped notice',array['ALL'],'QA_MANAGER');
do $$begin
 if public.ffh_module_edit('catalogue') or not ffh_private.asset_upload_allowed('catalogue/qa.jpg') then raise exception 'FAIL upload permission distinct from edit';end if;
 if not exists(select 1 from public.ffh_briefings where title='QA NOTICE' and 'QA_SR_A'=any(recipients) and not('QA_SR_B'=any(recipients))) then raise exception 'FAIL scoped notice recipients';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001003","role":"authenticated"}',true);
do $$begin if exists(select 1 from public.ffh_briefings where title='QA NOTICE') then raise exception 'FAIL notice leaked';end if;end$$;
reset role;
do $$begin if exists(select 1 from public.ffh_notification_jobs where recipient='QA_SR_B' and title='QA NOTICE') then raise exception 'FAIL notice push escaped scope';end if;end$$;
select 'PASS zone/all-zone notification totals, incentive scope, upload/edit separation, scoped notice publication, visibility and notification recipients' as notification_verification;
