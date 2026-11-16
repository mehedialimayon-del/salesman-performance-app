create table if not exists public.ffh_task_comments (
 id uuid primary key default gen_random_uuid(),
 task_id text not null references public.ffh_tasks(id) on delete cascade,
 author_staff_id text not null default public.ffh_my_staff_id(),
 body text not null check (char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);

create index if not exists ffh_task_comments_timeline on public.ffh_task_comments(task_id,created_at desc);
alter table public.ffh_task_comments enable row level security;
revoke all on public.ffh_task_comments from public,anon,authenticated;
grant select on public.ffh_task_comments to authenticated;
grant insert(task_id,body) on public.ffh_task_comments to authenticated;

create policy ffh_task_comments_read on public.ffh_task_comments for select to authenticated
 using (exists(select 1 from public.ffh_tasks t where t.id=task_id));

create policy ffh_task_comments_post on public.ffh_task_comments for insert to authenticated
 with check (author_staff_id=public.ffh_my_staff_id()
   and exists(select 1 from public.ffh_tasks t where t.id=task_id
     and (t.assigned_to=author_staff_id or t.given_by_id=author_staff_id or public.ffh_staff_edit(t.assigned_to,'tasks'))));

-- Expose a small status timeline from the existing private change log.
create or replace function ffh_private.task_status_history(task text)
returns table(occurred_at timestamptz, actor_name text, action text, status text)
language sql stable security definer set search_path='' as $$
 select h.occurred_at,h.actor_name,
   case when h.operation='INSERT' then 'Assigned'
        when h.before_data->>'assigned_to' is distinct from h.after_data->>'assigned_to' then 'Reassigned'
        when h.before_data->>'status' is distinct from h.after_data->>'status' then 'Status updated'
        else 'Edited' end,
   h.after_data->>'status'
 from ffh_private.change_history h
 where auth.uid() is not null and h.table_name='ffh_tasks'
   and h.row_key->>'id'=task and h.operation in ('INSERT','UPDATE')
   and exists(select 1 from public.ffh_tasks t where t.id=task and
     (public.ffh_staff_view(t.assigned_to) or t.given_by_id=public.ffh_my_staff_id()))
 order by h.id desc limit 100;
$$;

revoke all on function ffh_private.task_status_history(text) from public,anon;
grant execute on function ffh_private.task_status_history(text) to authenticated;

create or replace function public.ffh_task_status_history(task text)
returns table(occurred_at timestamptz, actor_name text, action text, status text)
language sql stable security invoker set search_path='' as $$
 select * from ffh_private.task_status_history(task);
$$;

revoke all on function public.ffh_task_status_history(text) from public,anon;
grant execute on function public.ffh_task_status_history(text) to authenticated;
