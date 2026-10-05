begin;
select set_config('qa.income_count',(select count(*)::text from public.ffh_income_entries),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare r jsonb;r2 jsonb;c jsonb;begin
 r:=public.ffh_claims_api('receipt','{"expense_date":"2026-10-01","amount":80,"reason":"ROLLBACK QA travel"}');perform set_config('qa.receipt',r->>'id',true);
 r2:=public.ffh_claims_api('receipt','{"expense_date":"2026-10-01","amount":20,"reason":"ROLLBACK QA meal"}');
 c:=public.ffh_claims_api('submit',jsonb_build_object('kind','Expense Claim','claim_month','2026-10','title','ROLLBACK QA expense','reviewer_staff_id','M21954','receipt_ids',jsonb_build_array(r->>'id',r2->>'id')));perform set_config('qa.claim',c->>'id',true);
 if (c->>'total')::numeric<>100 then raise exception 'Total wrong';end if;
 begin perform public.ffh_claims_api('review',jsonb_build_object('id',c->>'id','status','Approved','reason','Self approval'));raise exception 'Self review allowed';exception when insufficient_privilege then null;end;
 begin perform public.ffh_ai_work('execute',jsonb_build_object('request_id',gen_random_uuid(),'actions','[{"kind":"notice","data":{"title":"ROLLBACK QA unauthorized","body":"test"}}]'::jsonb));raise exception 'SR work bypass';exception when insufficient_privilege then null;end;
 r:=public.ffh_learning('ask','{"question":"ROLLBACK QA বাংলা প্রশ্ন?","draft_answer":"Draft only"}');perform set_config('qa.question',r->>'id',true);
 perform public.ffh_learning('ask','{"question":"ROLLBACK QA বাংলা প্রশ্ন?"}');
 begin perform public.ffh_learning('answer',jsonb_build_object('id',r->>'id','answer','Unauthorized answer'));raise exception 'SR learned approval';exception when insufficient_privilege then null;end;
 begin perform public.ffh_ai_provider_config();raise exception 'API key readable';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22268'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.ffh_receipts where id=current_setting('qa.receipt')::uuid) or exists(select 1 from public.ffh_claims where id=current_setting('qa.claim')::uuid) or exists(select 1 from public.ffh_ai_questions where id=current_setting('qa.question')::uuid) then raise exception 'Private data leaked';end if;
 begin perform public.ffh_claims_api('review',jsonb_build_object('id',current_setting('qa.claim'),'status','Approved','reason','Other SR'));raise exception 'Unassigned review';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare r jsonb;req jsonb;pid text;line uuid;before_count int;begin
 if exists(select 1 from public.ffh_receipts where id=current_setting('qa.receipt')::uuid) then raise exception 'Owner saw private receipt inventory';end if;
 if not exists(select 1 from public.ffh_claims where id=current_setting('qa.claim')::uuid) then raise exception 'Assigned manager cannot see claim';end if;
 select id into line from public.ffh_claim_lines where claim_id=current_setting('qa.claim')::uuid and amount=20;
 r:=public.ffh_claims_api('deduct',jsonb_build_object('id',current_setting('qa.claim'),'line_id',line,'excluded',true,'reason','Meal excluded'));if (r->>'total')::numeric<>80 then raise exception 'Deduction wrong';end if;
 perform public.ffh_claims_api('review',jsonb_build_object('id',current_setting('qa.claim'),'status','Approved','reason','Verified'));
 if not exists(select 1 from public.ffh_claims where id=current_setting('qa.claim')::uuid and status='Approved' and reviewed_at is not null) then raise exception 'DONE missing';end if;
 if (select count(*) from public.ffh_claim_events where claim_id=current_setting('qa.claim')::uuid)<>3 then raise exception 'History missing';end if;
 perform public.ffh_learning('answer',jsonb_build_object('id',current_setting('qa.question'),'answer','পরীক্ষিত উত্তর'));
 if (select count(*) from public.ffh_notification_jobs where source_key='ai-question:'||current_setting('qa.question'))<>1 then raise exception 'Duplicate unknown question notification';end if;
 req:=jsonb_build_object('request_id',gen_random_uuid(),'summary','ROLLBACK QA work','actions','[{"kind":"notice","data":{"title":"ROLLBACK QA work notice","body":"test","staff_id":"ALL"}},{"kind":"penalty","data":{"staff_id":"M22328","amount":20,"reason":"ROLLBACK QA only"}}]'::jsonb);
 r:=public.ffh_ai_work('execute',req);if jsonb_array_length(r)<>2 then raise exception 'Work count';end if;
 if public.ffh_ai_work('execute',req)<>r then raise exception 'Retry result changed';end if;
 if (select count(*) from public.ffh_briefings where title='ROLLBACK QA work notice')<>1 then raise exception 'Duplicate work notice';end if;
 if not exists(select 1 from public.ffh_income_entries where id=(r->1->>'id')::uuid and status='Pending') then raise exception 'AI bypassed approval';end if;
 perform public.ffh_ai_work('context');
 select id into pid from public.ffh_catalogue_products where active limit 1;
 perform public.ffh_ai_work('execute',jsonb_build_object('request_id',gen_random_uuid(),'actions',jsonb_build_array(jsonb_build_object('kind','catalogue','data',jsonb_build_object('product_id',pid,'changes','{"piece_price":3.45}'::jsonb)),jsonb_build_object('kind','cpo','data',jsonb_build_object('title','ROLLBACK QA CPO','start_date',(now() at time zone 'Asia/Kuala_Lumpur')::date,'end_date',(now() at time zone 'Asia/Kuala_Lumpur')::date+7,'execution_mode','view')),jsonb_build_object('kind','task','data','{"title":"ROLLBACK QA task","staff_id":"M22075","due_date":"2026-10-06"}'::jsonb),jsonb_build_object('kind','target','data','{"staff_id":"M22075","month":"2026-10","planning_target":30000}'::jsonb))));
 perform public.ffh_ai_work('grant','{"staff_id":"M22075","actions":["notice"]}');
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare c jsonb;r jsonb;begin
 r:=public.ffh_learning('ask','{"question":"ROLLBACK QA বাংলা প্রশ্ন?"}');if r->>'answer'<>'পরীক্ষিত উত্তর' then raise exception 'Approved learning not reused';end if;
 perform public.ffh_ai_work('execute',jsonb_build_object('request_id',gen_random_uuid(),'actions','[{"kind":"notice","data":{"title":"ROLLBACK QA delegated","body":"test"}}]'::jsonb));
 begin perform public.ffh_ai_work('execute',jsonb_build_object('request_id',gen_random_uuid(),'actions','[{"kind":"penalty","data":{"staff_id":"M22328","amount":10,"reason":"No grant"}}]'::jsonb));raise exception 'Grant exceeded';exception when insufficient_privilege then null;end;
 c:=public.ffh_claims_api('submit','{"kind":"Buyer Entertainment Bill","claim_month":"2026-10","title":"ROLLBACK QA buyer","reviewer_staff_id":"M21954","manual_lines":[{"expense_date":"2026-10-01","amount":30,"reason":"Buyer meal"}]}');perform set_config('qa.buyer',c->>'id',true);
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 begin perform public.ffh_claims_api('review',jsonb_build_object('id',current_setting('qa.buyer'),'status','Approved','reason','Missing signature'));raise exception 'Signature bypass';exception when others then if sqlerrm<>'Draw your approval signature' then raise;end if;end;
 perform public.ffh_claims_api('review',jsonb_build_object('id',current_setting('qa.buyer'),'status','Approved','reason','Signed','signature_png','data:image/png;base64,iVBORw0KGgo='));
 perform public.ffh_ai_work('grant','{"staff_id":"M22075","actions":[]}');
end$$;
reset role;
do $$begin
 if (select count(*) from public.ffh_income_entries)<>current_setting('qa.income_count')::int+1 then raise exception 'Claims affected income';end if;
end$$;
rollback;
select 'PASS claims privacy, totals, deduction/history, assigned review, signature; unknown questions and learned answers; AI grants, idempotent work, seven modules, pending finance; API secret denied' as result;
