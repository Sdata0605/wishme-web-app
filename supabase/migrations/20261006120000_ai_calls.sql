-- AI calls: the assistant phones someone on the user's behalf (e.g. to book or confirm a doctor's
-- appointment), speaks with them, and reports back. Calls are placed through Vapi; the webhook
-- fills in the status, transcript and summary.

create table if not exists public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  to_name text,
  to_phone text not null,
  purpose text not null check (char_length(purpose) between 5 and 600),
  details text check (details is null or char_length(details) <= 800),
  language text not null default 'english',

  -- queued → scheduled/ringing → in-progress → completed | no-answer | busy | voicemail | failed
  status text not null default 'queued',
  scheduled_for timestamptz,
  vapi_call_id text unique,

  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  ended_reason text,

  transcript text,
  summary text,
  -- success | partial | declined | no_info | callback_requested (decided by the call analysis)
  outcome text,
  next_step text,
  recording_url text,
  opted_out boolean not null default false,

  price_paid numeric not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_calls_user_created_idx on public.ai_calls (user_id, created_at desc);
create index if not exists ai_calls_phone_idx on public.ai_calls (to_phone, created_at desc);

alter table public.ai_calls enable row level security;

-- Users can read their own calls. Only the server (edge functions) creates and updates them,
-- so nobody can fake a call, a transcript or a summary.
drop policy if exists "Users can read their own AI calls" on public.ai_calls;
create policy "Users can read their own AI calls"
  on public.ai_calls for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins can read all AI calls" on public.ai_calls;
create policy "Admins can read all AI calls"
  on public.ai_calls for select to authenticated
  using (public.is_admin_by_auth_uid());

-- Admin-controlled switches (platform_settings is readable by everyone, so nothing secret goes here).
insert into public.platform_settings (setting_key, setting_value, description)
values
  ('ai_call_enabled', 'true', 'Allow the assistant to phone people on the user''s behalf'),
  ('ai_call_price', '0', 'Wallet charge in rupees per AI call (0 = free)'),
  ('ai_call_daily_limit', '5', 'Maximum AI calls one user can place per day'),
  ('ai_call_voice_id', '21m00Tcm4TlvDq8ikWAM', 'ElevenLabs voice id the AI uses on calls')
on conflict (setting_key) do nothing;

-- Defence in depth: even without a policy, make sure browsers/apps can only ever read this table.
revoke insert, update, delete on public.ai_calls from anon, authenticated;
