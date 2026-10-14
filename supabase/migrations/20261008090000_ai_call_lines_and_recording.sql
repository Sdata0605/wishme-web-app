-- Live transcripts and recordings for AI calls.
--
-- Until now the whole conversation was held in memory and written once when the call ended. That
-- single write could be lost (a dropped worker, or the hangup webhook finishing first), taking the
-- entire transcript with it. Each line is now saved the moment it is spoken, so nothing can be
-- lost, and the app can follow a call as it happens.

create table if not exists public.ai_call_lines (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.ai_calls (id) on delete cascade,
  -- 'assistant' = the AI, 'user' = the person who was called.
  role text not null check (role in ('assistant', 'user')),
  message text not null,
  -- Order within the call. The clock alone is not enough: two lines can land in the same millisecond.
  seq integer not null,
  created_at timestamptz not null default now(),
  unique (call_id, seq)
);

create index if not exists ai_call_lines_call_idx on public.ai_call_lines (call_id, seq);

alter table public.ai_call_lines enable row level security;

-- A line is readable by whoever owns the call it belongs to, and by admins. Only the server
-- (service role) ever writes, so a transcript cannot be faked from the app.
drop policy if exists "Users can read lines of their own AI calls" on public.ai_call_lines;
create policy "Users can read lines of their own AI calls"
  on public.ai_call_lines for select to authenticated
  using (exists (select 1 from public.ai_calls c where c.id = call_id and c.user_id = auth.uid()));

drop policy if exists "Admins can read all AI call lines" on public.ai_call_lines;
create policy "Admins can read all AI call lines"
  on public.ai_call_lines for select to authenticated
  using (public.is_admin_by_auth_uid());

revoke insert, update, delete on public.ai_call_lines from anon, authenticated;

-- Lets the app watch a call unfold live.
alter publication supabase_realtime add table public.ai_call_lines;

-- ─── Recording ──────────────────────────────────────────────────────────────
-- ai_calls.recording_url already exists (unused since Vapi). It now holds the key of the file in
-- our own storage, not a public link, so a recording can only be played through a signed URL.
comment on column public.ai_calls.recording_url is
  'Storage key of the call recording in B2, or null. Never a public URL: the app fetches a signed link.';

alter table public.ai_calls add column if not exists recording_seconds integer;
alter table public.ai_calls add column if not exists recording_expires_at timestamptz;

comment on column public.ai_calls.recording_expires_at is
  'When the audio is deleted. The transcript is kept; only the recording expires.';

-- How long recordings are kept, and whether they are made at all. Admin-controlled, like the rest.
insert into public.platform_settings (setting_key, setting_value, description)
values
  ('ai_call_record', 'true', 'Record AI calls so the user can listen to them afterwards'),
  ('ai_call_recording_days', '30', 'Days to keep a call recording before deleting it (the transcript is kept)')
on conflict (setting_key) do nothing;
