-- Sign-in / sign-up speed.
--
-- 1. Indexes the login and OTP paths were missing (every one of these was a sequential scan).
-- 2. RLS policies on profiles / celebrities / user_roles re-ran auth.uid() and the admin check for
--    EVERY row; wrapping them in (select ...) makes Postgres evaluate them once per query.
-- 3. The OTP edge functions did 5-6 sequential REST calls each; the same logic is now one RPC call.

begin;

-- ---------------------------------------------------------------- indexes
create index if not exists idx_celebrities_profile_id on public.celebrities (profile_id);
create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_email_otp_email_created on public.email_otp_verifications (email, created_at desc);

-- Redundant: profiles_user_id_key (unique) and idx_email_otp_email's prefix already cover these.
drop index if exists public.idx_profiles_user_id;
drop index if exists public.idx_email_otp_email;

-- ---------------------------------------------------------------- RLS: evaluate once, not per row
-- profiles
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

create policy profiles_select_own on public.profiles for select using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update using (user_id = (select auth.uid()));
create policy profiles_select_admin on public.profiles for select using ((select public.is_admin_by_auth_uid()));
create policy profiles_update_admin on public.profiles for update using ((select public.is_admin_by_auth_uid()));

-- celebrities ("celebrities_select_public" was an exact duplicate of "Everyone can view active celebrities")
drop policy if exists "Admins can manage all celebrities" on public.celebrities;
drop policy if exists "Celebrities can manage own profile" on public.celebrities;
drop policy if exists celebrities_insert_own on public.celebrities;
drop policy if exists "Anyone can view verified celebrities" on public.celebrities;
drop policy if exists celebrities_select_admin on public.celebrities;
drop policy if exists celebrities_select_public on public.celebrities;
drop policy if exists celebrities_update_admin on public.celebrities;
drop policy if exists celebrities_update_own on public.celebrities;

create policy "Admins can manage all celebrities" on public.celebrities for all
  using ((select public.is_admin_by_auth_uid()));
create policy "Celebrities can manage own profile" on public.celebrities for all
  using (profile_id = (select public.get_my_profile_id()));
create policy celebrities_insert_own on public.celebrities for insert
  with check (profile_id = (select public.get_my_profile_id()));
create policy "Anyone can view verified celebrities" on public.celebrities for select
  using (is_verified = true or (select public.is_admin_by_auth_uid()));
create policy celebrities_select_admin on public.celebrities for select
  using ((select public.is_admin_by_auth_uid()));
create policy celebrities_update_admin on public.celebrities for update
  using ((select public.is_admin_by_auth_uid()));
create policy celebrities_update_own on public.celebrities for update
  using (profile_id = (select public.get_my_profile_id()));
-- "Everyone can view active celebrities" (is_active = true) is kept as is.

-- user_roles
drop policy if exists "Admins can manage all roles" on public.user_roles;
drop policy if exists "Users can view their own roles" on public.user_roles;
drop policy if exists user_roles_delete_admin on public.user_roles;
drop policy if exists user_roles_insert_admin on public.user_roles;
drop policy if exists user_roles_select_admin on public.user_roles;
drop policy if exists user_roles_select_own on public.user_roles;
drop policy if exists user_roles_update_admin on public.user_roles;

create policy "Admins can manage all roles" on public.user_roles for all to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
create policy "Users can view their own roles" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_roles_delete_admin on public.user_roles for delete using ((select public.is_admin_by_auth_uid()));
create policy user_roles_insert_admin on public.user_roles for insert with check ((select public.is_admin_by_auth_uid()));
create policy user_roles_select_admin on public.user_roles for select using ((select public.is_admin_by_auth_uid()));
create policy user_roles_select_own on public.user_roles for select using (user_id = (select auth.uid()));
create policy user_roles_update_admin on public.user_roles for update using ((select public.is_admin_by_auth_uid()));

-- ---------------------------------------------------------------- OTP in one round trip
-- Returns one of: ok | email_exists | cooldown:<seconds> | rate_limited
create or replace function public.otp_request(p_email text, p_hash text, p_expires timestamptz)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(p_email);
  v_last timestamptz;
  v_wait int;
  v_count int;
begin
  if exists (select 1 from profiles where email = v_email) then
    return 'email_exists';
  end if;

  select created_at into v_last
    from email_otp_verifications where email = v_email
    order by created_at desc limit 1;
  if v_last is not null and now() - v_last < interval '30 seconds' then
    v_wait := ceil(30 - extract(epoch from (now() - v_last)));
    return 'cooldown:' || v_wait;
  end if;

  delete from email_otp_verifications
    where email = v_email and (is_used or expires_at < now());

  select count(*) into v_count
    from email_otp_verifications
    where email = v_email and created_at >= now() - interval '1 hour';
  if v_count >= 5 then
    return 'rate_limited';
  end if;

  insert into email_otp_verifications (email, otp_hash, expires_at, is_used)
    values (v_email, p_hash, p_expires, false);
  return 'ok';
end;
$$;

-- Returns one of: ok | used | expired | invalid
create or replace function public.otp_verify(p_email text, p_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(p_email);
  v_id uuid;
  v_used boolean;
  v_expires timestamptz;
begin
  -- Atomic: only one caller can flip is_used, so a code can never be redeemed twice.
  update email_otp_verifications set is_used = true, verified_at = now()
    where id = (
      select id from email_otp_verifications
      where email = v_email and otp_hash = p_hash and not is_used and expires_at >= now()
      order by created_at desc limit 1
      for update skip locked
    )
    returning id into v_id;

  if v_id is not null then
    insert into verified_emails (email, verified_at, expires_at)
      values (v_email, now(), now() + interval '1 hour')
      on conflict (email) do update set verified_at = excluded.verified_at, expires_at = excluded.expires_at;
    return 'ok';
  end if;

  select is_used, expires_at into v_used, v_expires
    from email_otp_verifications where email = v_email and otp_hash = p_hash limit 1;
  if found then
    if v_used then return 'used'; end if;
    if v_expires < now() then return 'expired'; end if;
  end if;
  return 'invalid';
end;
$$;

revoke all on function public.otp_request(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.otp_verify(text, text) from public, anon, authenticated;
grant execute on function public.otp_request(text, text, timestamptz) to service_role;
grant execute on function public.otp_verify(text, text) to service_role;

commit;
