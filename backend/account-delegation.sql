alter table public.ffh_profiles add column if not exists owner_access boolean not null default false;
create or replace function public.ffh_owner() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from ffh_profiles where auth_user_id=auth.uid() and active and login_approved and (staff_id='M21954' or (can_manage and owner_access)))$$;
create or replace function public.ffh_profile_security_guard() returns trigger language plpgsql set search_path=public as $$begin
 if auth.uid() is null or exists(select 1 from ffh_profiles where auth_user_id=auth.uid() and staff_id='M21954' and active and login_approved) then return new;end if;
 if (to_jsonb(new)-array['full_name','photo_url','contact_email','must_change_password','updated_at']) is distinct from (to_jsonb(old)-array['full_name','photo_url','contact_email','must_change_password','updated_at']) then raise exception 'Only Ayon can change account permissions';end if;return new;end$$;
