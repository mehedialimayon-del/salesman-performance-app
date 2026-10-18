select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
insert into public.ffh_catalogue_products(id,name,category,item_code,active) values('QA_RECOVERY_SKU','QA recovery','Other Products','QA_RECOVERY_CODE',true);
update public.ffh_catalogue_products set active=false where id='QA_RECOVERY_SKU';
do $$declare tid bigint;begin
 select max(id) into tid from ffh_private.trash where row_key->>'id'='QA_RECOVERY_SKU' and status='Deleted';
 if tid is null then raise exception 'FAIL soft removal not in Trash';end if;
 perform public.ffh_governance('restore',jsonb_build_object('id',tid));
 if not exists(select 1 from public.ffh_catalogue_products where id='QA_RECOVERY_SKU' and active and name='QA recovery') then raise exception 'FAIL soft restore';end if;
end$$;
update public.ffh_catalogue_products set active=false where id='QA_RECOVERY_SKU';
do $$declare tid bigint;begin
 select max(id) into tid from ffh_private.trash where row_key->>'id'='QA_RECOVERY_SKU' and status='Deleted';
 perform public.ffh_governance('purge',jsonb_build_object('id',tid));
 if exists(select 1 from public.ffh_catalogue_products where id='QA_RECOVERY_SKU') then raise exception 'FAIL purge kept original';end if;
 if not exists(select 1 from public.ffh_catalogue_tombstones where id='QA_RECOVERY_SKU') then raise exception 'FAIL missing seed tombstone';end if;
 if exists(select 1 from ffh_private.trash where row_key->>'id'='QA_RECOVERY_SKU' and row_data is not null) then raise exception 'FAIL recoverable purged row';end if;
end$$;
select 'PASS catalogue soft removal, original restore, purge erases row and snapshots, seed tombstone' as verification;
