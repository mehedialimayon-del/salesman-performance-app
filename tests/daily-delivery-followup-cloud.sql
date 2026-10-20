-- Run after daily-performance-cloud.sql in an outer ROLLBACK transaction.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare p jsonb;r jsonb;d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin
p:=jsonb_build_object('submission_id',gen_random_uuid(),'entry_scope','staff','staff_id','QA_PERF_S3','sale_date',d-1,'expected_version',0,'entry_kind','order','order_amount',5000,'delivered_amount',0,'order_count',2,'delivered_count',0,'order_cartons',5,'delivered_cartons',0,'ppr_amount',40,'active_sales_amount',800,'product_lines','[{"sku":"QA Mango A","order_qty":5,"delivered_qty":0,"outlets":[{"outlet_name":"KK Example","order_qty":5,"delivered_qty":0}]}]'::jsonb,'outlet_lines','[]'::jsonb);
r:=public.ffh_daily_sales('save',p);perform set_config('qa.delivery_payload',p::text,true);
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009603","role":"authenticated"}',true);
set local role authenticated;
do $$declare p jsonb:=current_setting('qa.delivery_payload')::jsonb;r jsonb;begin
p:=p||jsonb_build_object('submission_id',gen_random_uuid(),'entry_kind','delivery','expected_version',1,'delivered_amount',4000,'delivered_count',1,'delivered_cartons',4,'delivery_completed',true,'product_lines','[{"sku":"QA Mango A","order_qty":5,"delivered_qty":4,"outlets":[{"outlet_name":"KK Example","order_qty":5,"delivered_qty":4}]}]'::jsonb);
r:=public.ffh_daily_sales('save',p);if r->>'version'<>'2' then raise exception 'Prior-day delivery failed';end if;
if not exists(select 1 from public.ffh_daily_updates where staff_id='QA_PERF_S3' and ppr_amount=40 and active_sales_amount=800 and delivered_amount=4000 and delivered_cartons=4 and delivery_completed) then raise exception 'Actual delivery or activity data missing';end if;
r:=public.ffh_daily_sales('save',p);if r->>'duplicate'<>'true' then raise exception 'Delivery retry duplicates';end if;
begin perform public.ffh_daily_sales('save',p||jsonb_build_object('submission_id',gen_random_uuid(),'expected_version',2,'order_amount',6000));raise exception 'Prior-day order mutation accepted';exception when others then if sqlerrm='Prior-day order mutation accepted' then raise;end if;end;
begin perform public.ffh_daily_sales('save',p||jsonb_build_object('submission_id',gen_random_uuid(),'expected_version',2,'delivered_amount',6000));raise exception 'Over-delivery accepted';exception when others then if sqlerrm='Over-delivery accepted' then raise;end if;end;
end$$;
reset role;
