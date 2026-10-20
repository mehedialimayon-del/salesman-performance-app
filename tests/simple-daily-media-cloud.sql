-- Run after daily-performance-cloud.sql under the same outer rollback transaction.
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009601","role":"authenticated"}',true);
set local role authenticated;
do $$declare p jsonb;r jsonb;d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin
p:=jsonb_build_object('entry_scope','staff','staff_id','QA_PERF_S1','sale_date',d-interval '1 month','amount',3000);
r:=public.ffh_daily_history(p);if r->>'saved'<>'true' then raise exception 'Manual previous date not saved';end if;
if not exists(select 1 from public.ffh_sales_baselines where staff_id='QA_PERF_S1' and daily_only and (daily_sales->>extract(day from (d-interval '1 month'))::int::text)::numeric=3000) then raise exception 'Daily-only historical entry missing';end if;
begin perform public.ffh_daily_history(p||'{"staff_id":"QA_PERF_S2"}');raise exception 'Another SR history write allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Object metadata fixtures have no uploaded bytes and are rolled back with everything else.
insert into storage.objects(bucket_id,name,metadata) values('ffh-chat-images','QA_PERF_S1/QA_PERF_S2/test.webm','{"mimetype":"audio/webm","size":1500}'),('ffh-chat-images','QA_PERF_S1/QA_PERF_S2/test.mp4','{"mimetype":"video/mp4","size":2000}');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009601","role":"authenticated"}',true);
set local role authenticated;
do $$declare msg jsonb;mid uuid:=gen_random_uuid();begin
msg:=public.ffh_duty('message',jsonb_build_object('id',mid,'recipient','QA_PERF_S2','body','Test voice','media_path','QA_PERF_S1/QA_PERF_S2/test.webm','media_type','audio','media_name','voice.webm'));
if not exists(select 1 from public.ffh_live_messages where id=mid and media_type='audio') then raise exception 'Audio message missing';end if;
perform public.ffh_duty('message',jsonb_build_object('id',gen_random_uuid(),'recipient','QA_PERF_S2','body','Test video','media_path','QA_PERF_S1/QA_PERF_S2/test.mp4','media_type','video','media_name','video.mp4'));
begin perform public.ffh_duty('message',jsonb_build_object('id',gen_random_uuid(),'recipient','QA_PERF_S3','body','Bad target','media_path','QA_PERF_S1/QA_PERF_S2/test.webm','media_type','audio'));raise exception 'Cross-recipient media allowed';exception when insufficient_privilege then null;end;
if not exists(select 1 from storage.objects where bucket_id='ffh-chat-images' and name='QA_PERF_S1/QA_PERF_S2/test.webm') then raise exception 'Sender cannot read own sent attachment';end if;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009602","role":"authenticated"}',true);set local role authenticated;
do $$begin if not exists(select 1 from storage.objects where bucket_id='ffh-chat-images' and name='QA_PERF_S1/QA_PERF_S2/test.webm') then raise exception 'Recipient cannot read attachment';end if;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009603","role":"authenticated"}',true);set local role authenticated;
do $$begin if exists(select 1 from storage.objects where bucket_id='ffh-chat-images' and name='QA_PERF_S1/QA_PERF_S2/test.webm') then raise exception 'Unrelated SR reads private attachment';end if;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009604","role":"authenticated"}',true);set local role authenticated;
do $$declare d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;p jsonb;r jsonb;begin
p:=jsonb_build_object('submission_id',gen_random_uuid(),'entry_kind','daily','entry_scope','staff','staff_id','QA_PERF_S4','sale_date',d,'expected_version',0,'order_amount',10000,'ppr_amount',2000,'active_sales_amount',8000,'delivered_amount',8000,'order_count',0,'delivered_count',0,'order_cartons',4,'delivered_cartons',4,'product_lines','[{"sku":"QA Mango A","order_qty":4,"delivered_qty":4,"outlets":[{"outlet_name":"","order_qty":4,"delivered_qty":4}]}]'::jsonb,'outlet_lines','[]'::jsonb,'previous_sales_amount',6000);
r:=public.ffh_daily_sales('save',p);if r->>'saved'<>'true' then raise exception 'Unified daily save failed';end if;
if not exists(select 1 from public.ffh_daily_updates where staff_id='QA_PERF_S4' and delivered_amount=8000 and ppr_amount=2000 and active_sales_amount=8000 and delivered_cartons=4) then raise exception 'Unified actual sales/prepare/incentive data missing';end if;
if not exists(select 1 from public.ffh_daily_comparison_history where staff_id='QA_PERF_S4' and amount=6000) then raise exception 'Same form did not save prior comparison';end if;
r:=public.ffh_daily_sales('save',p);if r->>'duplicate'<>'true' then raise exception 'Same-form retry duplicated';end if;
perform public.ffh_save_sales_baseline('QA_PERF_S4',to_char(d-interval '1 month','YYYY-MM'),50000,jsonb_build_object(extract(day from d-interval '1 month')::int::text,6000));
if exists(select 1 from public.ffh_sales_baselines where staff_id='QA_PERF_S4' and daily_only) then raise exception 'Explicit monthly setup kept incomplete flag';end if;
end$$;
reset role;
