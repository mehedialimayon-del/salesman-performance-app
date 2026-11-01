alter table public.ffh_profiles add column login_alias text;
create unique index ffh_login_alias_unique on public.ffh_profiles(lower(login_alias)) where login_alias is not null;
update public.ffh_profiles set login_alias=lower(staff_id);
update public.ffh_profiles set login_alias='ayon' where staff_id='M21954';
update public.ffh_profiles set login_alias='emon' where staff_id='M22075';
update public.ffh_profiles p set login_alias=case when (select count(*) from public.ffh_company_teams x where lower(x.manager_name)=lower(t.manager_name))>1 then lower(t.manager_name)||'_'||lower(t.zone_id) else lower(regexp_replace(t.manager_name,'\s+','_','g')) end from public.ffh_company_teams t where p.staff_id=t.manager_staff_id and p.staff_id like 'MG_%';
create function ffh_private.login_email(login text) returns text language sql stable security definer set search_path='' as $$
 with matches as(select p.staff_id,coalesce(u.email,lower(coalesce(p.company_staff_id,p.login_alias,p.staff_id))||'@fieldforce.app') email
 from public.ffh_profiles p left join auth.users u on u.id=p.auth_user_id and u.email like '%@fieldforce.app'
 where p.active and p.login_approved and (upper(p.company_staff_id)=upper(trim(login)) or lower(p.login_alias)=lower(regexp_replace(trim(login),'\s+','_','g')) or lower(p.full_name)=lower(trim(login)) or upper(p.staff_id)=upper(trim(login))))
 select min(email) from matches having count(*)=1
$$;
revoke all on function ffh_private.login_email(text) from public;
grant usage on schema ffh_private to anon;
grant execute on function ffh_private.login_email(text) to anon,authenticated,service_role;
create function public.ffh_login_email(login text) returns text language sql stable security invoker set search_path='' as $$select ffh_private.login_email(login)$$;
revoke all on function public.ffh_login_email(text) from public;
grant execute on function public.ffh_login_email(text) to anon,authenticated,service_role;
