create or replace function ffh_private.login_email(login text) returns text language sql stable security definer set search_path='' as $$
 with matches as(select p.staff_id,coalesce(u.email,lower(coalesce(p.company_staff_id,p.login_alias,p.staff_id))||'@fieldforce.app') email,
 case when upper(p.company_staff_id)=upper(trim(login)) or upper(p.staff_id)=upper(trim(login)) then 0 when lower(p.login_alias)=lower(regexp_replace(trim(login),'[[:space:]]+','_','g')) then 1 else 2 end priority
 from public.ffh_profiles p left join auth.users u on u.id=p.auth_user_id and u.email like '%@fieldforce.app'
 where p.active and p.login_approved and (upper(p.company_staff_id)=upper(trim(login)) or lower(p.login_alias)=lower(regexp_replace(trim(login),'[[:space:]]+','_','g')) or lower(p.full_name)=lower(trim(login)) or upper(p.staff_id)=upper(trim(login)))),
 preferred as(select * from matches where priority=(select min(priority) from matches))
 select min(email) from preferred having count(*)=1
$$;
