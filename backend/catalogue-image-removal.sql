begin;
alter table public.ffh_catalogue_products add column if not exists image_hidden boolean not null default false;
-- A newly uploaded replacement becomes visible again, including bulk editor uploads.
create or replace function ffh_private.catalogue_replacement_photo() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if new.image_url is distinct from old.image_url and nullif(new.image_url,'') is not null then new.image_hidden:=false;end if;return new;
end$$;
revoke all on function ffh_private.catalogue_replacement_photo() from public,anon,authenticated;
drop trigger if exists ffh_catalogue_replacement_photo on public.ffh_catalogue_products;
create trigger ffh_catalogue_replacement_photo before update on public.ffh_catalogue_products for each row execute function ffh_private.catalogue_replacement_photo();

commit;
