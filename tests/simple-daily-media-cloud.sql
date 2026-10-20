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
