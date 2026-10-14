-- The Hub: calendar events and reminders.
--
-- Both live on the server rather than only on the phone, because a reminder may have to place a
-- phone call, and a backgrounded app cannot do that. The phone still schedules its own local
-- notifications for speed and for when it is offline; the server is the source of truth.

-- ─── Calendar ───────────────────────────────────────────────────────────────
-- An event occupies time. (A reminder does not — that is the difference between the two.)

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null check (char_length(title) between 1 and 200),
  notes text check (notes is null or char_length(notes) <= 2000),
  location text check (location is null or char_length(location) <= 300),

  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  -- Kept alongside the instant so an event can be shown at the wall-clock time it was created for,
  -- even when the user travels.
  timezone text not null default 'Asia/Kolkata',

  -- none | daily | weekly | monthly | yearly. A full RRULE is deliberately not supported yet.
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  recurrence_until date,

  colour text,
  -- user = they added it; the others are mirrored from elsewhere in the app and are read-only.
  source text not null default 'user' check (source in ('user', 'occasion', 'booking')),
  source_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint calendar_events_end_after_start check (ends_at is null or ends_at >= starts_at)
);

create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, starts_at);

-- ─── Reminders ──────────────────────────────────────────────────────────────
-- A reminder is a nudge at a moment. It may have no date at all ("someday"), which is why due_at
-- is nullable — those sit in their own list instead of on the calendar.

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null check (char_length(title) between 1 and 200),
  notes text check (notes is null or char_length(notes) <= 2000),

  due_at timestamptz,
  timezone text not null default 'Asia/Kolkata',
  -- Normally a reminder keeps its instant. With this set it keeps its wall-clock time instead, so
  -- "7 am" stays 7 am after flying somewhere else.
  pin_to_timezone boolean not null default false,
  -- How long before due_at to speak up.
  lead_minutes integer not null default 0 check (lead_minutes between 0 and 20160),

  -- How it reaches the user, and how insistent it is. These are separate: a call can be gentle and
  -- a notification can be an alarm.
  delivery text not null default 'notification' check (delivery in ('notification', 'call')),
  style text not null default 'reminder' check (style in ('alarm', 'reminder', 'quiet')),

  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  recurrence_until date,

  -- If it is not acknowledged, ring the user's own phone. Off unless they ask for it.
  escalate boolean not null default false,
  escalate_after_minutes integer not null default 3 check (escalate_after_minutes between 2 and 60),
  escalate_phone text,

  status text not null default 'pending' check (status in ('pending', 'done', 'missed', 'cancelled')),
  completed_at timestamptz,

  -- A reminder can belong to an event, and can have produced a call.
  event_id uuid references public.calendar_events (id) on delete cascade,
  call_id uuid references public.ai_calls (id) on delete set null,

  -- Set the moment the server picks it up, so two workers can never fire the same reminder twice.
  fired_at timestamptz,
  acknowledged_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The dispatcher's query: everything still pending whose moment has arrived.
create index if not exists reminders_due_idx on public.reminders (due_at)
  where status = 'pending' and fired_at is null and due_at is not null;
create index if not exists reminders_user_due_idx on public.reminders (user_id, due_at);
create index if not exists reminders_event_idx on public.reminders (event_id);

-- ─── Who may see what ───────────────────────────────────────────────────────
-- Unlike ai_calls, the user owns these outright and the app edits them directly.

alter table public.calendar_events enable row level security;
alter table public.reminders enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['calendar_events', 'reminders'] loop
    execute format('drop policy if exists "Users read own %1$s" on public.%1$I', t);
    execute format('create policy "Users read own %1$s" on public.%1$I for select to authenticated using (auth.uid() = user_id)', t);

    execute format('drop policy if exists "Users insert own %1$s" on public.%1$I', t);
    execute format('create policy "Users insert own %1$s" on public.%1$I for insert to authenticated with check (auth.uid() = user_id)', t);

    execute format('drop policy if exists "Users update own %1$s" on public.%1$I', t);
    execute format('create policy "Users update own %1$s" on public.%1$I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);

    execute format('drop policy if exists "Users delete own %1$s" on public.%1$I', t);
    execute format('create policy "Users delete own %1$s" on public.%1$I for delete to authenticated using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ─── Push tokens ────────────────────────────────────────────────────────────
-- Needed so the server can reach a phone whose app is closed.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens"
  on public.push_tokens for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Settings ───────────────────────────────────────────────────────────────

insert into public.platform_settings (setting_key, setting_value, description)
values
  ('reminders_enabled', 'true', 'Allow reminders to fire notifications and calls'),
  ('reminder_call_enabled', 'true', 'Allow a reminder to ring the user''s own phone'),
  ('reminder_default_lead_minutes', '10', 'Default minutes before an event that its reminder fires')
on conflict (setting_key) do nothing;
