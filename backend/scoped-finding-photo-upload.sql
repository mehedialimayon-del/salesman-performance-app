create or replace function ffh_private.finding_photo_upload_allowed(object_name text)
returns boolean language sql stable security invoker set search_path='' as $$
 select split_part(object_name,'/',1)='findings'
    and array_length(string_to_array(object_name,'/'),1)=3
    and lower(split_part(object_name,'/',2))=lower(public.ffh_my_staff_id())
    and lower(split_part(object_name,'/',3)) ~ '\.(jpg|jpeg|png|webp|gif|heic|heif|avif)$';
$$;

revoke all on function ffh_private.finding_photo_upload_allowed(text) from public,anon;
grant execute on function ffh_private.finding_photo_upload_allowed(text) to authenticated;

create policy ffh_finding_photo_insert on storage.objects for insert to authenticated with check
 (bucket_id='ffh-public' and ffh_private.finding_photo_upload_allowed(name));

alter policy ffh_asset_upload_permission on storage.objects with check
 (bucket_id<>'ffh-public' or ffh_private.asset_upload_allowed(name)
  or ffh_private.task_proof_photo_allowed(name) or ffh_private.task_assignment_file_allowed(name)
  or ffh_private.finding_photo_upload_allowed(name));
