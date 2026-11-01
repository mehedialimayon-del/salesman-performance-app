CREATE OR REPLACE FUNCTION ffh_private.zone_visible(z text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(select 1 from public.ffh_profiles p
 where p.auth_user_id=auth.uid() and p.active and p.login_approved and
 (p.staff_id='M21954' or (p.can_manage and
 exists(select 1 from public.ffh_zones zone where zone.id=z and zone.active) and
 (p.zone_id=z or exists(select 1 from public.ffh_zone_access a where a.staff_id=p.staff_id and a.zone_id in (z,'*'))))))
$function$
;
