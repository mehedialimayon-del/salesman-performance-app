-- Admin password updates carry a fresh, server-managed app_metadata nonce.
-- Auth's user endpoint cannot write app_metadata, so self-service changes fail.
create or replace function public.ffh_guard_owner_password()
returns trigger language plpgsql security definer set search_path = pg_catalog
as $$
begin
 if new.encrypted_password is distinct from old.encrypted_password
    and exists(select 1 from public.ffh_profiles p where p.auth_user_id=old.id and p.staff_id<>'M21954')
    and (new.raw_app_meta_data->>'ffh_owner_password_nonce') is not distinct from (old.raw_app_meta_data->>'ffh_owner_password_nonce') then
   raise exception 'Only Ayon can change FieldForce staff passwords' using errcode='42501';
 end if;
 return new;
end;
$$;
revoke all on function public.ffh_guard_owner_password() from public, anon, authenticated;
drop trigger if exists ffh_owner_password_only on auth.users;
create trigger ffh_owner_password_only before update of encrypted_password on auth.users
for each row execute function public.ffh_guard_owner_password();
update public.ffh_profiles set must_change_password=false where staff_id<>'M21954' and must_change_password=true;
