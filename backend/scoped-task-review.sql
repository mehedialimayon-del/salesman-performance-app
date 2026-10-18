-- Task review follows the manager's explicit task grant and assigned staff scope.
-- ffh_can_manage() is intentionally owner/admin-only and must not gate delegated module reviews.
create or replace function public.ffh_task_sr_review_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.ffh_profiles p where p.auth_user_id=auth.uid() and p.active and p.login_approved and p.can_manage)
    and public.ffh_staff_edit(old.assigned_to,'tasks') and public.ffh_staff_edit(new.assigned_to,'tasks') then return new;end if;
 if old.assigned_to <> public.ffh_my_staff_id() or old.status not in ('Open','Rejected') or new.status <> 'Pending Review' or
 (to_jsonb(new)-array['status','proof_photo_url','proof_location','updated_at']) is distinct from (to_jsonb(old)-array['status','proof_photo_url','proof_location','updated_at'])
 then raise exception 'Only assigned SR can submit task proof for manager review';end if;
 if old.proof_mode in ('photo','both') and coalesce(new.proof_photo_url,'')='' then raise exception 'Proof photo is required';end if;
 if old.proof_mode in ('location','both') and (new.proof_location is null or not (new.proof_location ?& array['latitude','longitude','capturedAt'])) then raise exception 'Current location proof is required';end if;
 if new.proof_location is not null then
 if (new.proof_location->>'latitude')::numeric not between -90 and 90 or (new.proof_location->>'longitude')::numeric not between -180 and 180 then raise exception 'Invalid coordinates';end if;
 if abs(extract(epoch from (now()-(new.proof_location->>'capturedAt')::timestamptz)))>600 then raise exception 'Location proof expired. Capture again';end if;
 end if;return new;
end$$;
