insert into storage.buckets (id, name, public, file_size_limit)
values ('ffh-task-assignments', 'ffh-task-assignments', false, 6000000)
on conflict (id) do nothing;

create policy ffh_private_task_assignment_upload on storage.objects
for insert to authenticated with check (
  bucket_id = 'ffh-task-assignments'
  and ffh_private.task_assignment_file_allowed(name)
);

create policy ffh_private_task_assignment_read on storage.objects
for select to authenticated using (
  bucket_id = 'ffh-task-assignments'
  and exists (
    select 1 from public.ffh_tasks as task
    where lower(task.given_by_id) = split_part(storage.objects.name, '/', 2)
      and (public.ffh_staff_view(task.assigned_to) or task.given_by_id = public.ffh_my_staff_id())
      and substring(task.description from E'(?:^|\\n)Assignment attachment: ([^[:space:]]+)[[:space:]]*$') = storage.objects.name
  )
);

create function ffh_private.guard_task_assignment_file()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  old_path text;
  new_path text;
  marker constant text := E'(?:^|\\n)Assignment attachment: (task-assignments/[^[:space:]]+)[[:space:]]*$';
begin
  new_path := substring(new.description from marker);
  if tg_op = 'UPDATE' then
    old_path := substring(old.description from marker);
    if old_path is not null and new.given_by_id is distinct from old.given_by_id then
      raise exception 'Cannot change the author of a task with an assignment attachment';
    end if;
  end if;
  if new_path is distinct from old_path then
    if new.given_by_id is distinct from public.ffh_my_staff_id()
      or (new_path is not null and split_part(new_path, '/', 2) is distinct from lower(new.given_by_id)) then
      raise exception 'Only the task author can set the assignment attachment';
    end if;
  end if;
  return new;
end;
$$;

create trigger ffh_task_private_assignment_guard
before insert or update of description, given_by_id on public.ffh_tasks
for each row execute function ffh_private.guard_task_assignment_file();
