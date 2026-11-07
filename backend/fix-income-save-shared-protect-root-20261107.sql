-- FieldForce Hub · Live Supabase trigger fix · 2026-11-07
-- Shared trigger must not read profile-only OLD.auth_user_id on income settings.
-- Preserves existing owner protection and staff permission logic.
-- Verified: Basic RM 2300 INSERT; RM 2350 same-month UPDATE; forbidden cross-staff edit;
-- all QA records rolled back, production staff data unchanged.

CREATE OR REPLACE FUNCTION ffh_private.protect_root_records()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE b jsonb; a jsonb; r jsonb; k text; sid text:=public.ffh_my_staff_id();
BEGIN
 IF auth.uid() IS NULL OR ffh_private.is_owner() THEN
   IF TG_OP='DELETE' THEN RETURN old; ELSE RETURN new; END IF;
 END IF;
 IF TG_OP<>'INSERT' THEN b:=to_jsonb(old); END IF;
 IF TG_OP<>'DELETE' THEN a:=to_jsonb(new); END IF;

 -- Trigger is shared by profiles, income settings and other tables.
 -- Profile-only attributes must be accessed through JSON rather than
 -- OLD.auth_user_id / NEW.photo_url on rows lacking those columns.
 IF TG_TABLE_NAME='ffh_profiles' AND TG_OP='UPDATE' THEN
   IF (b->>'auth_user_id')=auth.uid()::text
      AND (b->>'active')::boolean IS TRUE
      AND (b->>'login_approved')::boolean IS TRUE
      AND (a-ARRAY['photo_url','updated_at'])=(b-ARRAY['photo_url','updated_at'])
      AND (a->>'photo_url') LIKE ('https://svpgjrxeqnluipsgjywk.supabase.co/storage/v1/object/public/ffh-public/profiles/' || lower(b->>'staff_id') || '/photo-%')
      AND (a->>'photo_url') ~ '\.jpg$' AND length(a->>'photo_url')<=1024
   THEN RETURN new; END IF;
 END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(jsonb_build_array(b,a)) WHERE value<>'null'::jsonb LOOP
   FOREACH k IN ARRAY ARRAY['staff_id','sr_id','assigned_to','owner_staff_id','viewer_staff_id'] LOOP
     IF r->>k='M21954' THEN RAISE EXCEPTION 'Ayon owner records are protected' USING errcode='42501'; END IF;
   END LOOP;
   IF TG_TABLE_NAME IN ('ffh_zone_access','ffh_access_grants') AND r->>'staff_id'=sid THEN
     RAISE EXCEPTION 'Only Ayon changes administrator own access' USING errcode='42501';
   END IF;
   IF TG_TABLE_NAME='ffh_profiles' AND TG_OP='INSERT' AND coalesce((r->>'owner_access')::boolean,false) THEN
     RAISE EXCEPTION 'Only Ayon delegates administrator authority' USING errcode='42501';
   END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN old; ELSE RETURN new; END IF;
END
$function$;
