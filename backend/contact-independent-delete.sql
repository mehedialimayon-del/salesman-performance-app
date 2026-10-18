begin;
create policy ffh_contacts_delete_granted_update on public.ffh_contacts for update to authenticated using(ffh_private.allowed('contacts','delete')) with check(ffh_private.allowed('contacts','delete'));
create or replace function ffh_private.contact_permission_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare p jsonb;n jsonb;edit_ok boolean;delete_ok boolean;begin
 if auth.uid() is null or public.ffh_owner() then return new;end if;
 edit_ok:=public.ffh_module_edit('contacts');delete_ok:=ffh_private.allowed('contacts','delete');
 if not edit_ok and not delete_ok then raise exception 'Contacts permission required' using errcode='42501';end if;
 if not delete_ok and exists(select 1 from jsonb_array_elements(old.contacts) o where coalesce(o->>'deleted_at','')='' and not exists(select 1 from jsonb_array_elements(new.contacts) v where v->>'id'=o->>'id' and coalesce(v->>'deleted_at','')='')) then raise exception 'Contacts Delete permission required' using errcode='42501';end if;
 if not edit_ok then
  for n in select value from jsonb_array_elements(new.contacts) loop
   select value into p from jsonb_array_elements(old.contacts) where value->>'id'=n->>'id';
   if p is null or (n-array['serial','deleted_at','restore_position']) is distinct from (p-array['serial','deleted_at','restore_position']) or (coalesce(p->>'deleted_at','')<>'' and coalesce(n->>'deleted_at','')='') then raise exception 'Delete permission does not allow contact edits or restoration' using errcode='42501';end if;
  end loop;
 end if;
 return new;
end$$;
revoke all on function ffh_private.contact_permission_guard() from public,anon,authenticated;
create trigger ffh_contact_permission_guard before update on public.ffh_contacts for each row execute function ffh_private.contact_permission_guard();
commit;
