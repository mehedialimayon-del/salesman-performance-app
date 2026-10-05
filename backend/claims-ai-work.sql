begin;
-- Private expense records never participate in salary/income tables.
create table public.ffh_receipts(id uuid primary key default gen_random_uuid(),owner_staff_id text not null references public.ffh_profiles(staff_id),expense_date date not null,amount numeric(12,2) not null check(amount>0),reason text not null check(length(trim(reason)) between 1 and 2000),receipt_path text,created_at timestamptz not null default now());
create index ffh_receipts_owner_date on public.ffh_receipts(owner_staff_id,expense_date);
create table public.ffh_claim_templates(id int primary key check(id=1),title text not null default 'Claim Form PDF',pdf_url text not null,cover_url text,updated_by text not null,updated_at timestamptz not null default now());
create table public.ffh_claims(id uuid primary key default gen_random_uuid(),owner_staff_id text not null references public.ffh_profiles(staff_id),reviewer_staff_id text not null references public.ffh_profiles(staff_id),kind text not null check(kind in ('Expense Claim','Buyer Entertainment Bill')),claim_month text not null check(claim_month ~ '^\d{4}-\d{2}$'),title text not null check(length(trim(title)) between 1 and 200),details text not null default '',form_path text,status text not null default 'Submitted' check(status in ('Submitted','Approved','Rejected')),signature_png text,reviewed_at timestamptz,created_at timestamptz not null default now());
create index ffh_claims_owner_month on public.ffh_claims(owner_staff_id,claim_month);
create index ffh_claims_reviewer on public.ffh_claims(reviewer_staff_id,status);
create table public.ffh_claim_lines(id uuid primary key default gen_random_uuid(),claim_id uuid not null references public.ffh_claims(id),receipt_id uuid references public.ffh_receipts(id),expense_date date not null,amount numeric(12,2) not null check(amount>0),reason text not null,receipt_path text,excluded boolean not null default false,deduction_reason text,unique(claim_id,receipt_id));
create table public.ffh_claim_events(id bigint generated always as identity primary key,claim_id uuid not null references public.ffh_claims(id),actor text not null,action text not null,reason text not null,created_at timestamptz not null default now());
create table public.ffh_ai_work_grants(staff_id text primary key references public.ffh_profiles(staff_id),actions text[] not null,granted_by text not null,updated_at timestamptz not null default now());
create table public.ffh_ai_work_runs(id uuid primary key,actor text not null,summary text not null,actions jsonb not null,result jsonb not null default '[]',created_at timestamptz not null default now());
create table public.ffh_ai_questions(id uuid primary key default gen_random_uuid(),requester text not null references public.ffh_profiles(staff_id),question text not null check(length(trim(question)) between 1 and 2000),normalized text not null,draft_answer text not null default '',answer text,status text not null default 'Pending' check(status in ('Pending','Answered')),answered_by text,answered_at timestamptz,created_at timestamptz not null default now(),unique(requester,normalized));
create table public.ffh_ai_learned(normalized text primary key,question text not null,answer text not null check(length(trim(answer)) between 1 and 10000),approved_by text not null,updated_at timestamptz not null default now());
create or replace function ffh_private.work_allowed(kind text) returns boolean language sql stable security definer set search_path='' as $$select public.ffh_my_staff_id() is not null and (public.ffh_owner() or exists(select 1 from public.ffh_ai_work_grants where staff_id=public.ffh_my_staff_id() and kind=any(actions)))$$;
revoke all on function ffh_private.work_allowed(text) from public,anon;grant execute on function ffh_private.work_allowed(text) to authenticated;
-- Authenticated read policies. All writes pass through checked state machines.
alter table public.ffh_receipts enable row level security;
create policy receipts_private on public.ffh_receipts for select to authenticated using(owner_staff_id=public.ffh_my_staff_id());
alter table public.ffh_claim_templates enable row level security;
create policy claim_template_read on public.ffh_claim_templates for select to authenticated using(public.ffh_my_staff_id() is not null);
alter table public.ffh_claims enable row level security;
create policy claims_parties on public.ffh_claims for select to authenticated using(public.ffh_my_staff_id() in (owner_staff_id,reviewer_staff_id));
alter table public.ffh_claim_lines enable row level security;
create policy claim_lines_parties on public.ffh_claim_lines for select to authenticated using(exists(select 1 from public.ffh_claims c where c.id=claim_id and public.ffh_my_staff_id() in (c.owner_staff_id,c.reviewer_staff_id)));
alter table public.ffh_claim_events enable row level security;
create policy claim_events_parties on public.ffh_claim_events for select to authenticated using(exists(select 1 from public.ffh_claims c where c.id=claim_id and public.ffh_my_staff_id() in (c.owner_staff_id,c.reviewer_staff_id)));
alter table public.ffh_ai_work_grants enable row level security;
create policy work_grants_read on public.ffh_ai_work_grants for select to authenticated using(public.ffh_owner() or staff_id=public.ffh_my_staff_id());
alter table public.ffh_ai_work_runs enable row level security;
create policy work_runs_read on public.ffh_ai_work_runs for select to authenticated using(actor=public.ffh_my_staff_id() or public.ffh_owner());
alter table public.ffh_ai_questions enable row level security;
create policy ai_questions_private on public.ffh_ai_questions for select to authenticated using(public.ffh_owner() or requester=public.ffh_my_staff_id());
alter table public.ffh_ai_learned enable row level security;
create policy ai_learned_read on public.ffh_ai_learned for select to authenticated using(public.ffh_my_staff_id() is not null);
grant select on public.ffh_receipts,public.ffh_claim_templates,public.ffh_claims,public.ffh_claim_lines,public.ffh_claim_events,public.ffh_ai_work_grants,public.ffh_ai_work_runs,public.ffh_ai_questions,public.ffh_ai_learned to authenticated;
revoke insert,update,delete on public.ffh_receipts,public.ffh_claim_templates,public.ffh_claims,public.ffh_claim_lines,public.ffh_claim_events,public.ffh_ai_work_grants,public.ffh_ai_work_runs,public.ffh_ai_questions,public.ffh_ai_learned from anon,authenticated;
-- Uploads are immutable, private and scoped to the authenticated staff ID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ffh-expenses','ffh-expenses',false,12582912,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy ffh_expense_upload on storage.objects for insert to authenticated with check(bucket_id='ffh-expenses' and split_part(name,'/',1)=public.ffh_my_staff_id());
create policy ffh_expense_read on storage.objects for select to authenticated using(bucket_id='ffh-expenses' and (split_part(name,'/',1)=public.ffh_my_staff_id() or exists(select 1 from public.ffh_claims c where c.reviewer_staff_id=public.ffh_my_staff_id() and (c.form_path=name or exists(select 1 from public.ffh_claim_lines l where l.claim_id=c.id and l.receipt_path=name)))));
create or replace function ffh_private.claim_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();rid uuid;cid uuid;cl public.ffh_claims%rowtype;receipt public.ffh_receipts%rowtype;path text;reason_text text;amount_val numeric;day date;item jsonb;total numeric;reviewer text;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved login required' using errcode='42501';end if;
 if action='state' then return jsonb_build_object('receipts',coalesce((select jsonb_agg(to_jsonb(r) order by expense_date desc) from public.ffh_receipts r where owner_staff_id=sid),'[]'::jsonb),'claims',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from public.ffh_claim_lines l where l.claim_id=c.id),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]') from public.ffh_claim_events e where e.claim_id=c.id)) order by created_at desc) from public.ffh_claims c where sid in (owner_staff_id,reviewer_staff_id)),'[]'::jsonb),'template',(select to_jsonb(t) from public.ffh_claim_templates t where id=1));
 elsif action='template' then
 if not public.ffh_owner() then raise exception 'Owner access required' using errcode='42501';end if;
 if coalesce(payload->>'pdf_url','') !~ '^https://' then raise exception 'Valid PDF URL required';end if;
 insert into public.ffh_claim_templates(id,title,pdf_url,cover_url,updated_by) values(1,coalesce(nullif(payload->>'title',''),'Claim Form PDF'),payload->>'pdf_url',payload->>'cover_url',sid) on conflict(id) do update set title=excluded.title,pdf_url=excluded.pdf_url,cover_url=excluded.cover_url,updated_by=sid,updated_at=now();return '{"ok":true}';
 elsif action='receipt' then
 path:=nullif(payload->>'receipt_path','');if path is not null and (split_part(path,'/',1)<>sid or not exists(select 1 from storage.objects where bucket_id='ffh-expenses' and name=path)) then raise exception 'Upload your receipt first';end if;
 day:=(payload->>'expense_date')::date;if day>(now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Future expense date not allowed';end if;
 insert into public.ffh_receipts(owner_staff_id,expense_date,amount,reason,receipt_path) values(sid,day,(payload->>'amount')::numeric,trim(payload->>'reason'),path) returning id into rid;return jsonb_build_object('id',rid);
 elsif action='delete_receipt' then
 rid:=(payload->>'id')::uuid;select * into receipt from public.ffh_receipts where id=rid and owner_staff_id=sid for update;if not found then raise exception 'Receipt not found' using errcode='42501';end if;
 if exists(select 1 from public.ffh_claim_lines l join public.ffh_claims c on c.id=l.claim_id where l.receipt_id=rid) then raise exception 'Submitted receipt retained in claim history';end if;delete from public.ffh_receipts where id=rid;return '{"ok":true}';
 elsif action='submit' then
 reviewer:=payload->>'reviewer_staff_id';if reviewer=sid or not exists(select 1 from public.ffh_profiles where staff_id=reviewer and active and login_approved and (can_manage or staff_id='M21954')) then raise exception 'Select another active manager';end if;
 path:=nullif(payload->>'form_path','');if path is not null and (split_part(path,'/',1)<>sid or not exists(select 1 from storage.objects where bucket_id='ffh-expenses' and name=path)) then raise exception 'Invalid completed claim form';end if;
 insert into public.ffh_claims(owner_staff_id,reviewer_staff_id,kind,claim_month,title,details,form_path) values(sid,reviewer,payload->>'kind',payload->>'claim_month',trim(payload->>'title'),coalesce(payload->>'details',''),path) returning * into cl;cid:=cl.id;
 if jsonb_typeof(coalesce(payload->'receipt_ids','[]'))<>'array' then raise exception 'Select receipts';end if;
 for receipt in select * from public.ffh_receipts where owner_staff_id=sid and id in (select value::uuid from jsonb_array_elements_text(coalesce(payload->'receipt_ids','[]'))) order by id for update loop
 if to_char(receipt.expense_date,'YYYY-MM')<>cl.claim_month then raise exception 'Receipt month mismatch';end if;
 if exists(select 1 from public.ffh_claim_lines l join public.ffh_claims c on c.id=l.claim_id where l.receipt_id=receipt.id and c.status in ('Submitted','Approved')) then raise exception 'Receipt already in a submitted/approved claim';end if;
 insert into public.ffh_claim_lines(claim_id,receipt_id,expense_date,amount,reason,receipt_path) values(cid,receipt.id,receipt.expense_date,receipt.amount,receipt.reason,receipt.receipt_path);
 end loop;
 if (select count(*) from public.ffh_claim_lines where claim_id=cid)<>jsonb_array_length(coalesce(payload->'receipt_ids','[]')) then raise exception 'Invalid/duplicate/private receipt selection';end if;
 for item in select value from jsonb_array_elements(coalesce(payload->'manual_lines','[]')) loop
 if cl.kind<>'Buyer Entertainment Bill' then raise exception 'Expense claims use saved receipts';end if;
 day:=(item->>'expense_date')::date;if to_char(day,'YYYY-MM')<>cl.claim_month or day>(now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Expense date/month mismatch';end if;
 if length(trim(coalesce(item->>'reason','')))=0 then raise exception 'Line reason required';end if;
 insert into public.ffh_claim_lines(claim_id,expense_date,amount,reason) values(cid,day,(item->>'amount')::numeric,item->>'reason');end loop;
 if not exists(select 1 from public.ffh_claim_lines where claim_id=cid) then raise exception 'At least one expense required';end if;
 insert into public.ffh_claim_events(claim_id,actor,action,reason) values(cid,sid,'Submitted',cl.details);
 elsif action in ('deduct','review') then
 cid:=(payload->>'id')::uuid;select * into cl from public.ffh_claims where id=cid for update;if not found or cl.reviewer_staff_id<>sid then raise exception 'Assigned manager alone reviews' using errcode='42501';end if;
 if cl.status<>'Submitted' then raise exception 'Claim already reviewed';end if;reason_text:=trim(payload->>'reason');if reason_text is null or length(reason_text) not between 1 and 2000 then raise exception 'Review reason required';end if;
 if action='deduct' then
 update public.ffh_claim_lines set excluded=coalesce((payload->>'excluded')::boolean,true),deduction_reason=reason_text where id=(payload->>'line_id')::uuid and claim_id=cid;if not found then raise exception 'Invalid bill line';end if;
 insert into public.ffh_claim_events(claim_id,actor,action,reason) values(cid,sid,'Line adjustment',reason_text);
 else
 if payload->>'status' not in ('Approved','Rejected') then raise exception 'Invalid review status';end if;
 if payload->>'status'='Approved' and cl.kind='Buyer Entertainment Bill' and coalesce(payload->>'signature_png','')='' then raise exception 'Draw your approval signature';end if;
 if nullif(payload->>'signature_png','') is not null and ((payload->>'signature_png') !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' or length(payload->>'signature_png')>250000) then raise exception 'Invalid signature';end if;
 update public.ffh_claims set status=payload->>'status',signature_png=nullif(payload->>'signature_png',''),reviewed_at=now() where id=cid;
 insert into public.ffh_claim_events(claim_id,actor,action,reason) values(cid,sid,payload->>'status',reason_text);
 end if;
 else raise exception 'Unknown claim action';end if;
 select coalesce(sum(amount) filter(where not excluded),0) into total from public.ffh_claim_lines where claim_id=cid;
 insert into public.ffh_notification_jobs(recipient,type,title,body,status,created_by,source_key) values(case when action='submit' then cl.reviewer_staff_id else cl.owner_staff_id end,'claim',cl.kind||' · '||case when action='submit' then 'Submitted' when action='deduct' then 'Adjusted' else payload->>'status' end,cl.title||' · RM '||total||' · '||coalesce(reason_text,''),'scheduled',sid,'claim:'||cid||':'||gen_random_uuid());
 return jsonb_build_object('id',cid,'total',total);
end$$;
revoke all on function ffh_private.claim_action(text,jsonb) from public,anon;grant execute on function ffh_private.claim_action(text,jsonb) to authenticated;
create function public.ffh_claims_api(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.claim_action(action,payload)$$;
revoke all on function public.ffh_claims_api(text,jsonb) from public,anon;grant execute on function public.ffh_claims_api(text,jsonb) to authenticated;
-- Owner-reviewed learning: requester identity and private inbox are server-derived.
create or replace function ffh_private.learning_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();qid uuid;norm text;question_text text;answer_text text;row public.ffh_ai_questions%rowtype;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved login required' using errcode='42501';end if;
 if action='state' then return jsonb_build_object('learned',coalesce((select jsonb_agg(to_jsonb(l)) from public.ffh_ai_learned l),'[]'::jsonb),'questions',coalesce((select jsonb_agg(to_jsonb(q) order by created_at desc) from public.ffh_ai_questions q where public.ffh_owner() or requester=sid),'[]'::jsonb));
 elsif action='ask' then
 question_text:=trim(payload->>'question');norm:=lower(regexp_replace(normalize(question_text,NFKC),'[^[:alnum:]ঀ-৿]+',' ','g'));norm:=trim(norm);
 if length(question_text) not between 1 and 2000 or norm='' then raise exception 'Invalid question';end if;
 if exists(select 1 from public.ffh_ai_learned where normalized=norm) then return jsonb_build_object('answer',(select answer from public.ffh_ai_learned where normalized=norm));end if;
 if (select count(*) from public.ffh_ai_questions where requester=sid and created_at>now()-interval '1 minute')>=10 then raise exception 'Too many questions; try later';end if;
 insert into public.ffh_ai_questions(requester,question,normalized,draft_answer) values(sid,question_text,norm,left(coalesce(payload->>'draft_answer',''),10000)) on conflict(requester,normalized) do nothing returning id into qid;
 if qid is not null then insert into public.ffh_notification_jobs(recipient,type,title,body,status,created_by,source_key) values('M21954','ai_question','AYON AI · New question',(select full_name from public.ffh_profiles where staff_id=sid)||' ('||sid||'): '||question_text,'scheduled',sid,'ai-question:'||qid) on conflict(source_key) where source_key is not null do nothing;end if;
 return jsonb_build_object('id',coalesce(qid,(select id from public.ffh_ai_questions where requester=sid and normalized=norm)),'pending',true);
 elsif action='answer' then
 if not public.ffh_owner() then raise exception 'Owner alone approves learned answers' using errcode='42501';end if;
 select * into row from public.ffh_ai_questions where id=(payload->>'id')::uuid for update;if not found then raise exception 'Question not found';end if;
 answer_text:=trim(payload->>'answer');if answer_text is null or length(answer_text) not between 1 and 10000 then raise exception 'Answer required';end if;
 insert into public.ffh_ai_learned(normalized,question,answer,approved_by) values(row.normalized,row.question,answer_text,sid) on conflict(normalized) do update set question=excluded.question,answer=excluded.answer,approved_by=sid,updated_at=now();
 update public.ffh_ai_questions set answer=answer_text,status='Answered',answered_by=sid,answered_at=now() where normalized=row.normalized;
 insert into public.ffh_notification_jobs(recipient,type,title,body,status,created_by,source_key) select distinct q.requester,'ai_answer','AYON AI · Your answer','সরি, তখন ব্যস্ত ছিলাম। তাই তোমার উত্তর দিতে পারিনি। এই নাও তোমার উত্তর: '||answer_text,'scheduled',sid,'ai-answer:'||q.id||':'||gen_random_uuid() from public.ffh_ai_questions q where q.normalized=row.normalized;
 return '{"ok":true}';
 else raise exception 'Unknown learning action';end if;
end$$;
revoke all on function ffh_private.learning_action(text,jsonb) from public,anon;grant execute on function ffh_private.learning_action(text,jsonb) to authenticated;
create function public.ffh_learning(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.learning_action(action,payload)$$;
revoke all on function public.ffh_learning(text,jsonb) from public,anon;grant execute on function public.ffh_learning(text,jsonb) to authenticated;
commit;
