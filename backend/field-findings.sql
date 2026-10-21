-- Findings remain private to their author, selected reviewers and permitted managers.
create table if not exists public.ffh_findings (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('route','competitor')),
 owner_staff_id text not null references public.ffh_profiles(staff_id), zone_id text not null,
 title text not null check(length(trim(title)) between 1 and 200), category text not null default '',
 payload jsonb not null default '{}' check(jsonb_typeof(payload)='object'),
 recipients text[] not null default '{}', states jsonb not null default '{}' check(jsonb_typeof(states)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ffh_findings_owner_date on public.ffh_findings(owner_staff_id,created_at desc);
create index if not exists ffh_findings_recipients on public.ffh_findings using gin(recipients);
alter table public.ffh_findings enable row level security;
revoke all on public.ffh_findings from public,anon,authenticated;
grant select,insert,update,delete on public.ffh_findings to authenticated;
grant all on public.ffh_findings to service_role;
create policy ffh_finding_read on public.ffh_findings for select to authenticated using(
 owner_staff_id=public.ffh_my_staff_id() or public.ffh_my_staff_id()=any(recipients) or ffh_private.zone_visible(zone_id));
create policy ffh_finding_insert on public.ffh_findings for insert to authenticated with check(
 owner_staff_id=public.ffh_my_staff_id() and zone_id=(select p.zone_id from public.ffh_profiles p where p.staff_id=public.ffh_my_staff_id()));
create policy ffh_finding_update on public.ffh_findings for update to authenticated using(owner_staff_id=public.ffh_my_staff_id()) with check(
 owner_staff_id=public.ffh_my_staff_id() and zone_id=(select p.zone_id from public.ffh_profiles p where p.staff_id=public.ffh_my_staff_id()));
create policy ffh_finding_delete on public.ffh_findings for delete to authenticated using(
 owner_staff_id=public.ffh_my_staff_id() or (public.ffh_module_edit('routes') and ffh_private.zone_visible(zone_id)));
create or replace function public.ffh_save_finding(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); rid uuid; z text; oldrow public.ffh_findings; ids text[]; statuses jsonb:='{}'; r text;
begin
 if sid is null then raise exception 'Login required' using errcode='42501';end if;
 select zone_id into z from public.ffh_profiles where staff_id=sid;
 select coalesce(array_agg(distinct value),'{}') into ids from jsonb_array_elements_text(coalesce(payload->'recipients','[]'));
 if cardinality(ids)>100 then raise exception 'Select at most 100 reviewers';end if;
 foreach r in array ids loop
  if not exists(select 1 from public.ffh_profiles p where p.staff_id=r and p.active and p.login_approved and (p.can_manage or public.ffh_staff_view(r))) then raise exception 'Reviewer is outside your permitted team' using errcode='42501';end if;
 end loop;
 if nullif(payload->>'id','') is not null then
  select * into oldrow from public.ffh_findings where id=(payload->>'id')::uuid and owner_staff_id=sid for update;
  if not found then raise exception 'Finding edit not permitted' using errcode='42501';end if;
  if payload ? 'version' and (payload->>'version')::timestamptz<>oldrow.updated_at then raise exception 'Finding changed. Reopen before saving.';end if;
 end if;
 foreach r in array ids loop statuses:=statuses||jsonb_build_object(r,coalesce(oldrow.states->r,jsonb_build_object('status','Pending','read_at',null,'completed_at',null)));end loop;
 if oldrow.id is null then
  insert into public.ffh_findings(kind,owner_staff_id,zone_id,title,category,payload,recipients,states)
  values(payload->>'kind',sid,z,trim(payload->>'title'),coalesce(payload->>'category',''),coalesce(payload->'details','{}'),ids,statuses) returning id into rid;
 else
  update public.ffh_findings set title=trim(payload->>'title'),category=coalesce(payload->>'category',''),payload=coalesce(payload->'details','{}'),recipients=ids,states=statuses,updated_at=clock_timestamp() where id=oldrow.id returning id into rid;
 end if;
 return rid;
end $$;
revoke all on function public.ffh_save_finding(jsonb) from public,anon;grant execute on function public.ffh_save_finding(jsonb) to authenticated;
-- Reviewers can record only their own view/completion, without changing finding content.
create or replace function ffh_private.finding_receipt(finding_id uuid,complete boolean) returns void language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); r public.ffh_findings; s jsonb;
begin
 if sid is null then raise exception 'Login required' using errcode='42501';end if;
 select * into r from public.ffh_findings where id=finding_id for update;
 if not found or not sid=any(r.recipients) then raise exception 'Not assigned to you' using errcode='42501';end if;
 s:=coalesce(r.states->sid,'{}')||jsonb_build_object('read_at',coalesce(r.states->sid->>'read_at',now()::text),'status',case when complete then 'Done' else coalesce(r.states->sid->>'status','Pending') end);
 if complete then s:=s||jsonb_build_object('completed_at',now());end if;
 update public.ffh_findings set states=jsonb_set(states,array[sid],s),updated_at=clock_timestamp() where id=finding_id;
end $$;
revoke all on function ffh_private.finding_receipt(uuid,boolean) from public,anon;grant execute on function ffh_private.finding_receipt(uuid,boolean) to authenticated;
create or replace function public.ffh_finding_receipt(finding_id uuid,complete boolean default false) returns void language sql security invoker set search_path='' as $$ select ffh_private.finding_receipt(finding_id,complete) $$;
revoke all on function public.ffh_finding_receipt(uuid,boolean) from public,anon;grant execute on function public.ffh_finding_receipt(uuid,boolean) to authenticated;
-- New owned records use the same durable Trash Bin as other application records.
create or replace function ffh_private.capture_owned_delete() returns trigger language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); r jsonb:=to_jsonb(old);
begin
 if auth.uid() is not null and sid is null then raise exception 'Login required' using errcode='42501';end if;
 if nullif(current_setting('ffh.restore_trash_id',true),'') is null then
  insert into ffh_private.trash(table_name,row_key,row_data,deleted_by) values(TG_TABLE_NAME,jsonb_build_object('id',r->'id'),r,sid);
 end if;
 return old;
end $$;
revoke all on function ffh_private.capture_owned_delete() from public,anon,authenticated;
create trigger ffh_owned_trash before delete on public.ffh_findings for each row execute function ffh_private.capture_owned_delete();
create trigger ffh_owned_trash before delete on public.ffh_private_notebook for each row execute function ffh_private.capture_owned_delete();
create or replace function ffh_private.owned_bin(action text,entity text,item_id bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); t ffh_private.trash;
begin
 if sid is null or entity not in ('ffh_private_notebook','ffh_findings') then raise exception 'Login required' using errcode='42501';end if;
 if action='list' then return coalesce((select jsonb_agg((to_jsonb(x)-'row_data')||jsonb_build_object('title',x.row_data->>'title','folder',x.row_data->>'folder','note_date',x.row_data->>'note_date') order by x.id desc) from ffh_private.trash x where x.table_name=entity and x.status='Deleted' and x.deleted_by=sid and x.row_data->>'owner_staff_id'=sid),'[]');end if;
 select * into t from ffh_private.trash where id=item_id and table_name=entity and status='Deleted' and deleted_by=sid and row_data->>'owner_staff_id'=sid for update;
 if not found then raise exception 'Trash item is not yours' using errcode='42501';end if;
 if action='restore' then
  perform set_config('ffh.restore_trash_id',t.id::text,true);
  if entity='ffh_private_notebook' and t.row_data->>'briefing_id' is not null and not exists(select 1 from public.ffh_briefings where id=(t.row_data->>'briefing_id')::uuid) then t.row_data:=jsonb_set(t.row_data,'{briefing_id}','null');end if;
  if entity='ffh_private_notebook' then insert into public.ffh_private_notebook select (jsonb_populate_record(null::public.ffh_private_notebook,t.row_data)).*;
  else insert into public.ffh_findings select (jsonb_populate_record(null::public.ffh_findings,t.row_data)).*;end if;
  update ffh_private.trash set status='Restored',resolved_at=now() where id=t.id;
 elsif action='purge' then update ffh_private.trash set status='Purged',row_data=null,resolved_at=now() where id=t.id;
 else raise exception 'Unknown trash action';end if;
 return jsonb_build_object('saved',true);
end $$;
revoke all on function ffh_private.owned_bin(text,text,bigint) from public,anon;grant execute on function ffh_private.owned_bin(text,text,bigint) to authenticated;
create or replace function public.ffh_owned_bin(action text,entity text,item_id bigint default null) returns jsonb language sql security invoker set search_path='' as $$select ffh_private.owned_bin(action,entity,item_id)$$;
revoke all on function public.ffh_owned_bin(text,text,bigint) from public,anon;grant execute on function public.ffh_owned_bin(text,text,bigint) to authenticated;

-- Assignment changes follow the same authenticated live subscription model.
do $$ begin if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ffh_findings') then alter publication supabase_realtime add table public.ffh_findings;end if;end $$;
