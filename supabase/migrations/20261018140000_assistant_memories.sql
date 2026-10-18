-- What the voice assistant remembers about a user between conversations ("Anita is my sister, her birthday is 12 March").
-- One row per fact. A user can only see, add and delete their own rows; the assistant acts with the user's own login.
create table if not exists public.assistant_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject text not null check (char_length(subject) between 2 and 80),
  fact text not null check (char_length(fact) between 2 and 300),
  created_at timestamptz not null default now()
);

create index if not exists assistant_memories_user_created_idx on public.assistant_memories (user_id, created_at desc);

alter table public.assistant_memories enable row level security;

drop policy if exists assistant_memories_select_own on public.assistant_memories;
create policy assistant_memories_select_own on public.assistant_memories
  for select to authenticated using (user_id = auth.uid());

drop policy if exists assistant_memories_insert_own on public.assistant_memories;
create policy assistant_memories_insert_own on public.assistant_memories
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists assistant_memories_delete_own on public.assistant_memories;
create policy assistant_memories_delete_own on public.assistant_memories
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.assistant_memories from anon;
grant select, insert, delete on public.assistant_memories to authenticated;
