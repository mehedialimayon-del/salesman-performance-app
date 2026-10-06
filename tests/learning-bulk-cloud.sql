begin;do $test$
declare owner_uid uuid;sr_uid uuid;r jsonb;qid text;n int;products jsonb;
begin
select auth_user_id into owner_uid from ffh_profiles where staff_id='M21954';
select auth_user_id into sr_uid from ffh_profiles where active and login_approved and can_sell and staff_id<>'M21954' and auth_user_id is not null limit 1;
perform set_config('request.jwt.claim.sub',sr_uid::text,true);
r:=ffh_learning('ask','{"question":"QA rollback learning October six unique"}');qid:=r->>'id';
begin perform ffh_learning('answer',jsonb_build_object('id',qid,'answer','QA'));raise exception 'Non-owner approval allowed';exception when insufficient_privilege then null;end;
begin perform ffh_catalogue_bulk_save('[{"id":"qa-denied","name":"QA","category":"QA","serial_no":1,"piece_price":0,"carton_price":0}]');raise exception 'SR catalogue write allowed';exception when insufficient_privilege then null;end;
perform set_config('request.jwt.claim.sub',owner_uid::text,true);
r:=ffh_learning('state');
if not (r->>'owner')::boolean or not exists(select 1 from jsonb_array_elements(r->'questions') q where q->>'id'=qid and q->>'requester_name' is not null) then raise exception 'Owner inbox/name missing';end if;
select jsonb_array_length(payload->'qaPairs') into n from ffh_shared_content where content_key='ai_knowledge';
perform ffh_learning('answer',jsonb_build_object('id',qid,'answer','QA approved'));
perform ffh_learning('answer',jsonb_build_object('id',qid,'answer','QA approved updated'));
if (select jsonb_array_length(payload->'qaPairs') from ffh_shared_content where content_key='ai_knowledge')<>n+1 then raise exception 'Bank increment/idempotency failed';end if;
perform set_config('request.jwt.claim.sub',sr_uid::text,true);
r:=ffh_learning('ask','{"question":"QA rollback learning October six unique"}');
if r->>'answer'<>'QA approved updated' then raise exception 'Saved answer missing';end if;
perform set_config('request.jwt.claim.sub',owner_uid::text,true);
select jsonb_agg(jsonb_build_object('id','qa-bulk-rollback-'||i,'name','QA '||i,'item_code','QA'||i,'category','QA','serial_no',i,'piece_price',i,'carton_price',i*10,'carton_qty',10)) into products from generate_series(1,700) i;
r:=ffh_catalogue_bulk_save(products);if (r->>'saved')::int<>700 then raise exception '700 save failed';end if;
begin perform ffh_catalogue_bulk_save('[{"id":"qa-atomic-rollback","name":"QA","category":"QA","serial_no":1,"piece_price":1,"carton_price":1},{"id":"qa-invalid","name":"","category":"QA","serial_no":2,"piece_price":1,"carton_price":1}]');raise exception 'Invalid batch accepted';exception when raise_exception then if sqlerrm='Invalid batch accepted' then raise;end if;end;
if exists(select 1 from ffh_catalogue_products where id='qa-atomic-rollback') then raise exception 'Partial save';end if;
end $test$;rollback;select 'PASS owner inbox/name, SR denials, main bank increment/idempotency, learned reply, 700 rows, atomic rollback; all QA data rolled back' result;
