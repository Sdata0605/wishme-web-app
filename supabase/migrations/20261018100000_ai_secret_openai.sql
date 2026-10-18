-- The admin AI Assistant panel can now store one more key: the OpenAI key the assistant's web search uses
-- (function web-search reads it with ai_secret_get). Same encrypted Vault storage, same service-role-only access.
create or replace function public.ai_secret_set(p_name text, p_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  if p_name not in ('ai_gemini_api_key', 'ai_sarvam_api_key', 'ai_openai_api_key') then
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

create or replace function public.ai_secret_status()
returns table (name text, last4 text, updated_at timestamptz)
language sql
security definer
set search_path = public, vault
as $$
  select s.name, right(s.decrypted_secret, 4), s.updated_at
  from vault.decrypted_secrets s
  where s.name in ('ai_gemini_api_key', 'ai_sarvam_api_key', 'ai_openai_api_key');
$$;

create or replace function public.ai_secret_delete(p_name text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if p_name not in ('ai_gemini_api_key', 'ai_sarvam_api_key', 'ai_openai_api_key') then
    raise exception 'unsupported secret name';
  end if;
  delete from vault.secrets where name = p_name;
end;
$$;

revoke all on function public.ai_secret_set(text, text) from public, anon, authenticated;
revoke all on function public.ai_secret_status() from public, anon, authenticated;
revoke all on function public.ai_secret_delete(text) from public, anon, authenticated;
grant execute on function public.ai_secret_set(text, text) to service_role;
grant execute on function public.ai_secret_status() to service_role;
grant execute on function public.ai_secret_delete(text) to service_role;
