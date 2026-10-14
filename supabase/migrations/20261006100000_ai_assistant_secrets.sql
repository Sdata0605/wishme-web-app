-- AI assistant API keys, stored encrypted in Supabase Vault and managed from the admin panel.
-- Only the service role (edge functions) may call these helpers; browsers and the app cannot.
-- The active voice engine ('gemini' | 'sarvam') lives in platform_settings (ai_voice_engine).

create or replace function public.ai_secret_set(p_name text, p_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  if p_name not in ('ai_gemini_api_key', 'ai_sarvam_api_key') then
    raise exception 'unsupported secret name';
  end if;
  select id into v_id from vault.secrets where name = p_name;
  if v_id is null then
    perform vault.create_secret(p_value, p_name, 'AI assistant API key (managed from the admin panel)');
  else
    perform vault.update_secret(v_id, p_value, p_name);
  end if;
end;
$$;

create or replace function public.ai_secret_get(p_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;

-- Never returns the key itself: only whether it is set, its last 4 characters and when it changed.
create or replace function public.ai_secret_status()
returns table (name text, last4 text, updated_at timestamptz)
language sql
security definer
set search_path = public, vault
as $$
  select s.name, right(s.decrypted_secret, 4), s.updated_at
  from vault.decrypted_secrets s
  where s.name in ('ai_gemini_api_key', 'ai_sarvam_api_key');
$$;

create or replace function public.ai_secret_delete(p_name text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if p_name not in ('ai_gemini_api_key', 'ai_sarvam_api_key') then
    raise exception 'unsupported secret name';
  end if;
  delete from vault.secrets where name = p_name;
end;
$$;

revoke all on function public.ai_secret_set(text, text) from public, anon, authenticated;
revoke all on function public.ai_secret_get(text) from public, anon, authenticated;
revoke all on function public.ai_secret_status() from public, anon, authenticated;
revoke all on function public.ai_secret_delete(text) from public, anon, authenticated;
grant execute on function public.ai_secret_set(text, text) to service_role;
grant execute on function public.ai_secret_get(text) to service_role;
grant execute on function public.ai_secret_status() to service_role;
grant execute on function public.ai_secret_delete(text) to service_role;

-- Default engine: keep Gemini until an admin switches.
insert into public.platform_settings (setting_key, setting_value, description)
values
  ('ai_voice_engine', 'gemini', 'Active voice assistant engine: gemini or sarvam'),
  ('ai_voice_fallback', 'true', 'Fall back to the other voice engine if the active one fails')
on conflict (setting_key) do nothing;
