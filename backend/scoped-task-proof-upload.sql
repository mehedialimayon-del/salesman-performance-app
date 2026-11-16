-- The permissive task policy also has to pass the bucket's restrictive INSERT policy.
create or replace function ffh_private.task_proof_photo_allowed(object_name text)
returns boolean language sql stable security invoker set search_path='' as $$
 select split_part(object_name,'/',1)='tasks'
    and array_length(string_to_array(object_name,'/'),1)=3
    and starts_with(split_part(object_name,'/',3),lower(public.ffh_my_staff_id())||'-')
    and lower(split_part(object_name,'/',3)) ~ '\.(jpg|jpeg|png|webp|gif|heic|heif|avif)$'
    and exists (
      select 1 from public.ffh_tasks as task
      where lower(task.id)=split_part(object_name,'/',2)
        and task.assigned_to=public.ffh_my_staff_id()
        and task.status in ('Open','Rejected')
        and task.proof_mode in ('photo','both')
    );
$$;

revoke all on function ffh_private.task_proof_photo_allowed(text) from public,anon;
grant execute on function ffh_private.task_proof_photo_allowed(text) to authenticated;

alter policy ffh_task_proof_photo_insert on storage.objects with check
 (bucket_id='ffh-public' and ffh_private.task_proof_photo_allowed(name));

alter policy ffh_asset_upload_permission on storage.objects with check
 (bucket_id<>'ffh-public' or ffh_private.asset_upload_allowed(name)
  or ffh_private.task_proof_photo_allowed(name));
