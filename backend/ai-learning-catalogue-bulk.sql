create or replace function ffh_private.learning_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();qid uuid;norm text;question_text text;answer_text text;row public.ffh_ai_questions%rowtype;bank jsonb;pairs jsonb;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved login required' using errcode='42501';end if;
 if action='state' then return jsonb_build_object('owner',sid='M21954','learned',coalesce((select jsonb_agg(to_jsonb(l)) from public.ffh_ai_learned l),'[]'::jsonb),'questions',coalesce((select jsonb_agg(to_jsonb(q)||jsonb_build_object('requester_name',(select full_name from public.ffh_profiles p where p.staff_id=q.requester)) order by created_at desc) from public.ffh_ai_questions q where sid='M21954' or requester=sid),'[]'::jsonb));
 elsif action='ask' then
 question_text:=trim(payload->>'question');norm:=lower(regexp_replace(normalize(question_text,NFKC),'[^[:alnum:]ঀ-৿]+',' ','g'));norm:=trim(norm);
 if length(question_text) not between 1 and 2000 or norm='' then raise exception 'Invalid question';end if;
 if exists(select 1 from public.ffh_ai_learned where normalized=norm) then return jsonb_build_object('answer',(select answer from public.ffh_ai_learned where normalized=norm));end if;
 if (select count(*) from public.ffh_ai_questions where requester=sid and created_at>now()-interval '1 minute')>=10 then raise exception 'Too many questions; try later';end if;
 insert into public.ffh_ai_questions(requester,question,normalized,draft_answer) values(sid,question_text,norm,left(coalesce(payload->>'draft_answer',''),10000)) on conflict(requester,normalized) do nothing returning id into qid;
 if qid is not null then insert into public.ffh_notification_jobs(recipient,type,title,body,status,created_by,source_key) values('M21954','ai_question','AYON AI · New question',(select full_name from public.ffh_profiles where staff_id=sid)||' ('||sid||'): '||question_text,'scheduled',sid,'ai-question:'||qid) on conflict(source_key) where source_key is not null do nothing;end if;
 return jsonb_build_object('id',coalesce(qid,(select id from public.ffh_ai_questions where requester=sid and normalized=norm)),'pending',true);
 elsif action='answer' then
 if sid<>'M21954' then raise exception 'Owner alone approves learned answers' using errcode='42501';end if;
 select * into row from public.ffh_ai_questions where id=(payload->>'id')::uuid for update;if not found then raise exception 'Question not found';end if;
 answer_text:=trim(payload->>'answer');if answer_text is null or length(answer_text) not between 1 and 10000 then raise exception 'Answer required';end if;
 insert into public.ffh_ai_learned(normalized,question,answer,approved_by) values(row.normalized,row.question,answer_text,sid) on conflict(normalized) do update set question=excluded.question,answer=excluded.answer,approved_by=sid,updated_at=now();
 insert into public.ffh_shared_content(content_key,payload,updated_by) values('ai_knowledge','{}',sid) on conflict(content_key) do nothing;
 select c.payload into bank from public.ffh_shared_content c where c.content_key='ai_knowledge' for update;
 select coalesce(jsonb_agg(p),'[]'::jsonb) into pairs from jsonb_array_elements(coalesce(bank->'qaPairs','[]'::jsonb)) p where coalesce(p->>'learned_normalized','')<>row.normalized and trim(lower(regexp_replace(normalize(p->>'question',NFKC),'[^[:alnum:]ঀ-৿]+',' ','g')))<>row.normalized;
 pairs:=pairs||jsonb_build_array(jsonb_build_object('question',row.question,'answer',answer_text,'active',true,'learned_normalized',row.normalized,'source_staff_id',row.requester));
 update public.ffh_shared_content set payload=jsonb_set(bank,'{qaPairs}',pairs),updated_at=now(),updated_by=sid where content_key='ai_knowledge';
 update public.ffh_ai_questions set answer=answer_text,status='Answered',answered_by=sid,answered_at=now() where normalized=row.normalized;
 insert into public.ffh_notification_jobs(recipient,type,title,body,status,created_by,source_key) select distinct q.requester,'ai_answer','AYON AI · Your answer',answer_text,'scheduled',sid,'ai-answer:'||q.id||':'||gen_random_uuid() from public.ffh_ai_questions q where q.normalized=row.normalized;
 return '{"ok":true}';
 else raise exception 'Unknown learning action';end if;
end$$;

create or replace function public.ffh_catalogue_bulk_save(products jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare p jsonb;r public.ffh_catalogue_products%rowtype;n integer:=0;
begin
 if auth.uid() is null or not public.ffh_can_manage() then raise exception 'Manager access required' using errcode='42501';end if;
 if jsonb_typeof(products)<>'array' or jsonb_array_length(products) not between 1 and 1000 then raise exception 'Choose 1 to 1000 products';end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(products) x)<>jsonb_array_length(products) then raise exception 'Duplicate product IDs';end if;
 for p in select value from jsonb_array_elements(products) loop
 if coalesce(trim(p->>'id'),'')='' or coalesce(trim(p->>'name'),'')='' or coalesce(trim(p->>'category'),'')='' then raise exception 'Product ID, name and category required';end if;
 if (p->>'piece_price')::numeric<0 or (p->>'carton_price')::numeric<0 or (p->>'serial_no')::integer<0 then raise exception 'Invalid price or serial';end if;
 select * into r from public.ffh_catalogue_products where id=p->>'id' for update;
 if found then
 r:=jsonb_populate_record(r,p);
 update public.ffh_catalogue_products set name=r.name,item_code=r.item_code,category=r.category,serial_no=r.serial_no,piece_price=r.piece_price,carton_price=r.carton_price,pack=r.pack,ctn_factors=r.ctn_factors,carton_qty=r.carton_qty,ctn_barcode=r.ctn_barcode,single_pcs_barcode=r.single_pcs_barcode,combo_barcode=r.combo_barcode,description=r.description,image_url=r.image_url,updated_at=now() where id=r.id;
 else
 insert into public.ffh_catalogue_products(id,name,item_code,category,serial_no,piece_price,carton_price,pack,ctn_factors,carton_qty,ctn_barcode,single_pcs_barcode,combo_barcode,description,image_url,active) values(p->>'id',p->>'name',p->>'item_code',p->>'category',(p->>'serial_no')::integer,(p->>'piece_price')::numeric,(p->>'carton_price')::numeric,p->>'pack',p->>'ctn_factors',(p->>'carton_qty')::numeric,p->>'ctn_barcode',p->>'single_pcs_barcode',p->>'combo_barcode',p->>'description',p->>'image_url',true);
 end if;n:=n+1;
 end loop;return jsonb_build_object('saved',n);
end$$;
revoke all on function public.ffh_catalogue_bulk_save(jsonb) from public,anon;
grant execute on function public.ffh_catalogue_bulk_save(jsonb) to authenticated;
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ffh_catalogue_products') then alter publication supabase_realtime add table public.ffh_catalogue_products;end if;
end$$;
