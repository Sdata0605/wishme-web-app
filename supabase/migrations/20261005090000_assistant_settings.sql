-- Per-user settings for the in-app voice assistant: its name, voice, personality and language.
-- One row per user. A row existing means the user has been through (or skipped) the setup screens.

create table if not exists public.assistant_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  assistant_name text not null default 'WishMe Assistant'
    check (char_length(assistant_name) between 1 and 30),
  voice text not null default 'Kore'
    check (char_length(voice) between 2 and 40),
  personality text not null default 'friendly'
    check (char_length(personality) between 2 and 30),
  custom_note text
    check (custom_note is null or char_length(custom_note) <= 300),
  language text not null default 'auto'
    check (char_length(language) between 2 and 20),
  -- true when the user skipped setup and the default assistant is being used
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assistant_settings enable row level security;

drop policy if exists "Users can read their own assistant settings" on public.assistant_settings;
create policy "Users can read their own assistant settings"
  on public.assistant_settings for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own assistant settings" on public.assistant_settings;
create policy "Users can create their own assistant settings"
  on public.assistant_settings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own assistant settings" on public.assistant_settings;
create policy "Users can update their own assistant settings"
  on public.assistant_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own assistant settings" on public.assistant_settings;
create policy "Users can delete their own assistant settings"
  on public.assistant_settings for delete to authenticated
  using (auth.uid() = user_id);
