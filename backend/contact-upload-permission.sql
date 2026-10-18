begin;
create or replace function ffh_private.asset_upload_allowed(object_name text) returns boolean language sql stable set search_path='' as $$
 select public.ffh_owner() or
 (split_part(object_name,'/',1)='profiles' and split_part(object_name,'/',2)=lower(public.ffh_my_staff_id())) or
 (split_part(object_name,'/',1)='campaigns' and split_part(object_name,'/',2)='executions' and split_part(object_name,'/',4)=lower(public.ffh_my_staff_id())) or
 ffh_private.allowed(case split_part(object_name,'/',1) when 'campaigns' then 'cpo' when 'incentives' then 'income' when 'catalogue' then 'catalogue' when 'proposals' then 'proposals' when 'briefings' then 'briefings' when 'contacts' then 'contacts' else 'settings' end,'upload')
$$;
commit;
