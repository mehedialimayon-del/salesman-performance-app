begin;
create table public.ffh_ai_provider_settings(id int primary key check(id=1),vault_id uuid,model text not null default 'gpt-4o-mini',transcribe_model text not null default 'gpt-transcribe',updated_at timestamptz not null default now());
alter table public.ffh_ai_provider_settings enable row level security;
revoke all on public.ffh_ai_provider_settings from anon,authenticated;
create or replace function ffh_private.provider_save(api_key text,model_name text,transcribe_name text) returns jsonb language plpgsql security definer set search_path='' as $$declare sid text:=public.ffh_my_staff_id();vid uuid;begin
 if sid is null or not public.ffh_owner() then raise exception 'Owner alone connects AI service' using errcode='42501';end if;
 if length(trim(api_key))<20 then raise exception 'Valid API key required';end if;
 if model_name !~ '^[a-zA-Z0-9._-]{1,100}$' or transcribe_name !~ '^[a-zA-Z0-9._-]{1,100}$' then raise exception 'Invalid model identifier';end if;
 select vault_id into vid from public.ffh_ai_provider_settings where id=1 for update;
 if vid is null then select vault.create_secret(api_key,'ffh_ai_provider_key','AYON AI Work server key') into vid;else perform vault.update_secret(vid,api_key);end if;
 insert into public.ffh_ai_provider_settings(id,vault_id,model,transcribe_model) values(1,vid,model_name,transcribe_name) on conflict(id) do update set vault_id=excluded.vault_id,model=excluded.model,transcribe_model=excluded.transcribe_model,updated_at=now();return '{"configured":true}';end$$;
revoke all on function ffh_private.provider_save(text,text,text) from public,anon;grant execute on function ffh_private.provider_save(text,text,text) to authenticated;
create function public.ffh_ai_provider_save(api_key text,model_name text default 'gpt-4o-mini',transcribe_name text default 'gpt-transcribe') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.provider_save(api_key,model_name,transcribe_name)$$;
revoke all on function public.ffh_ai_provider_save(text,text,text) from public,anon;grant execute on function public.ffh_ai_provider_save(text,text,text) to authenticated;
create function public.ffh_ai_provider_config() returns jsonb language sql security definer set search_path='' as $$select jsonb_build_object('api_key',s.decrypted_secret,'model',p.model,'transcribe_model',p.transcribe_model) from public.ffh_ai_provider_settings p left join vault.decrypted_secrets s on s.id=p.vault_id where p.id=1$$;
revoke all on function public.ffh_ai_provider_config() from public,anon,authenticated;grant execute on function public.ffh_ai_provider_config() to service_role;
commit;
