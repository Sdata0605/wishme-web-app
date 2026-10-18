-- Long-term memory for the voice assistant: every conversation (and AI call) is kept word for word, cut into short passages that can be
-- found again by name, by date, by exact words and by meaning (pgvector), and lasting facts about the user's life are kept in
-- `assistant_memories` with a category. All of it is private to its owner through row-level security.
--
--   assistant_conversations  one row per saved chat or call
--   assistant_messages       the exact lines, in order
--   memory_chunks            short passages with a text-search column and an embedding (what recall searches)
--   assistant_memories       facts (already existed): now with a category, a person, a date, a source and an embedding
--   assistant_memory_settings  the user's switches: save chats, learn facts
--   memory_recall(...)       the search: person / date filter + keyword + meaning, merged
--
-- Writes to the first three tables come only from the memory-ingest edge function (service role), so a transcript cannot be faked
-- from the app. The owner can read and delete their own rows.

create extension if not exists vector with schema extensions;

-- ── The user's switches ─────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.assistant_memory_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  save_chats boolean not null default true,
  learn_facts boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.assistant_memory_settings enable row level security;
drop policy if exists memory_settings_select_own on public.assistant_memory_settings;
create policy memory_settings_select_own on public.assistant_memory_settings for select to authenticated using (user_id = auth.uid());
drop policy if exists memory_settings_insert_own on public.assistant_memory_settings;
create policy memory_settings_insert_own on public.assistant_memory_settings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists memory_settings_update_own on public.assistant_memory_settings;
create policy memory_settings_update_own on public.assistant_memory_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.assistant_memory_settings from anon;
grant select, insert, update on public.assistant_memory_settings to authenticated;

-- ── Conversations and their exact lines ────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('assistant', 'call')),
  -- A chat's own session id, or the AI call's id: saving the same one twice does nothing.
  source_ref text,
  person_name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  line_count integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists assistant_conversations_ref_uidx on public.assistant_conversations (user_id, source, source_ref) where source_ref is not null;
create index if not exists assistant_conversations_user_idx on public.assistant_conversations (user_id, started_at desc);
alter table public.assistant_conversations enable row level security;
drop policy if exists conversations_select_own on public.assistant_conversations;
create policy conversations_select_own on public.assistant_conversations for select to authenticated using (user_id = auth.uid());
drop policy if exists conversations_delete_own on public.assistant_conversations;
create policy conversations_delete_own on public.assistant_conversations for delete to authenticated using (user_id = auth.uid());
revoke all on public.assistant_conversations from anon;
grant select, delete on public.assistant_conversations to authenticated;

create table if not exists public.assistant_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  seq integer not null,
  at timestamptz not null default now(),
  unique (conversation_id, seq)
);
create index if not exists assistant_messages_conv_idx on public.assistant_messages (conversation_id, seq);
alter table public.assistant_messages enable row level security;
drop policy if exists messages_select_own on public.assistant_messages;
create policy messages_select_own on public.assistant_messages for select to authenticated using (user_id = auth.uid());
drop policy if exists messages_delete_own on public.assistant_messages;
create policy messages_delete_own on public.assistant_messages for delete to authenticated using (user_id = auth.uid());
revoke all on public.assistant_messages from anon;
grant select, delete on public.assistant_messages to authenticated;

-- ── Searchable passages ────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.memory_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  source text not null check (source in ('assistant', 'call')),
  person_name text,
  occurred_at timestamptz not null default now(),
  content text not null,
  tsv tsvector generated always as (to_tsvector('simple', content)) stored,
  embedding extensions.vector(768)
);
create index if not exists memory_chunks_user_time_idx on public.memory_chunks (user_id, occurred_at desc);
create index if not exists memory_chunks_person_idx on public.memory_chunks (user_id, lower(person_name));
create index if not exists memory_chunks_tsv_idx on public.memory_chunks using gin (tsv);
create index if not exists memory_chunks_embedding_idx on public.memory_chunks using hnsw (embedding extensions.vector_cosine_ops);
alter table public.memory_chunks enable row level security;
drop policy if exists chunks_select_own on public.memory_chunks;
create policy chunks_select_own on public.memory_chunks for select to authenticated using (user_id = auth.uid());
drop policy if exists chunks_delete_own on public.memory_chunks;
create policy chunks_delete_own on public.memory_chunks for delete to authenticated using (user_id = auth.uid());
revoke all on public.memory_chunks from anon;
grant select, delete on public.memory_chunks to authenticated;

-- ── Facts: the existing table gets a category, a person, a date, a source and an embedding ─────────────────────────────────
alter table public.assistant_memories add column if not exists category text not null default 'other';
alter table public.assistant_memories add column if not exists person text;
alter table public.assistant_memories add column if not exists event_date date;
alter table public.assistant_memories add column if not exists source text not null default 'user';
alter table public.assistant_memories add column if not exists source_id text;
alter table public.assistant_memories add column if not exists status text not null default 'active';
alter table public.assistant_memories add column if not exists updated_at timestamptz not null default now();
alter table public.assistant_memories add column if not exists embedding extensions.vector(768);

alter table public.assistant_memories drop constraint if exists assistant_memories_category_check;
alter table public.assistant_memories add constraint assistant_memories_category_check
  check (category in ('about_me', 'people', 'goals', 'events', 'preferences', 'follow_up', 'work', 'feelings', 'places', 'calls', 'other'));
alter table public.assistant_memories drop constraint if exists assistant_memories_status_check;
alter table public.assistant_memories add constraint assistant_memories_status_check check (status in ('active', 'done'));
alter table public.assistant_memories drop constraint if exists assistant_memories_source_check;
alter table public.assistant_memories add constraint assistant_memories_source_check check (source in ('user', 'chat', 'call'));

create index if not exists assistant_memories_category_idx on public.assistant_memories (user_id, category, created_at desc);
create index if not exists assistant_memories_embedding_idx on public.assistant_memories using hnsw (embedding extensions.vector_cosine_ops);

drop policy if exists assistant_memories_update_own on public.assistant_memories;
create policy assistant_memories_update_own on public.assistant_memories for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant update on public.assistant_memories to authenticated;

-- ── The search ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Narrow by person and date first (cheap, indexed), then find passages by exact words (p_terms, joined with OR) and by meaning
-- (p_embedding), and merge the two rankings (reciprocal rank fusion). With only a person or a date, the newest passages come back.
-- Facts are searched the same way. Runs as the caller, so row-level security keeps it to their own data.
create or replace function public.memory_recall(
  p_terms text[] default '{}',
  p_embedding extensions.vector(768) default null,
  p_person text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 6
)
returns table (kind text, id text, source text, person_name text, occurred_at timestamptz, content text, via text, score double precision)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with params as (
    select
      nullif(btrim(coalesce(p_person, '')), '') as person,
      case when coalesce(array_length(p_terms, 1), 0) > 0 then to_tsquery('simple', array_to_string(p_terms, ' | ')) end as q,
      least(greatest(coalesce(p_limit, 6), 1), 12) as lim
  ),
  scope as (
    select c.id, c.source, c.person_name, c.occurred_at, c.content, c.tsv, c.embedding
    from public.memory_chunks c, params
    where c.user_id = auth.uid()
      and (p_from is null or c.occurred_at >= p_from)
      and (p_to is null or c.occurred_at < p_to)
      and (params.person is null or c.person_name ilike '%' || params.person || '%' or c.content ilike '%' || params.person || '%')
  ),
  kw as (
    select s.id, row_number() over (order by ts_rank_cd(s.tsv, params.q) desc) as r, 'keyword'::text as via
    from scope s, params
    where params.q is not null and s.tsv @@ params.q
    order by ts_rank_cd(s.tsv, params.q) desc
    limit 20
  ),
  vec as (
    select s.id, row_number() over (order by s.embedding <=> p_embedding) as r, 'meaning'::text as via
    from scope s
    where p_embedding is not null and s.embedding is not null
    order by s.embedding <=> p_embedding
    limit 20
  ),
  recent as (
    select s.id, row_number() over (order by s.occurred_at desc) as r, 'person/date'::text as via
    from scope s, params
    where params.person is not null or p_from is not null
    order by s.occurred_at desc
    limit 10
  ),
  ranked as (
    select u.id, sum(1.0 / (60 + u.r)) as score, string_agg(distinct u.via, ' + ') as via
    from (select * from kw union all select * from vec union all select * from recent) u
    group by u.id
  ),
  chunk_hits as (
    select 'chunk'::text as kind, s.id::text as id, s.source, s.person_name, s.occurred_at, s.content, r.via, r.score::double precision as score
    from ranked r join scope s on s.id = r.id, params
    order by r.score desc
    limit (select lim from params)
  ),
  fact_scope as (
    select m.id, m.subject, m.fact, m.category, m.person, m.created_at, m.embedding,
           to_tsvector('simple', m.subject || ' ' || m.fact) as tsv
    from public.assistant_memories m, params
    where m.user_id = auth.uid() and m.status = 'active'
      and (params.person is null or m.person ilike '%' || params.person || '%' or m.subject ilike '%' || params.person || '%' or m.fact ilike '%' || params.person || '%')
  ),
  fkw as (
    select f.id, row_number() over (order by ts_rank_cd(f.tsv, params.q) desc) as r, 'keyword'::text as via
    from fact_scope f, params where params.q is not null and f.tsv @@ params.q limit 10
  ),
  fvec as (
    select f.id, row_number() over (order by f.embedding <=> p_embedding) as r, 'meaning'::text as via
    from fact_scope f where p_embedding is not null and f.embedding is not null order by f.embedding <=> p_embedding limit 10
  ),
  fall as (
    select f.id, 1 as r, 'person/date'::text as via from fact_scope f, params where params.person is not null limit 6
  ),
  franked as (
    select u.id, sum(1.0 / (60 + u.r)) as score, string_agg(distinct u.via, ' + ') as via
    from (select * from fkw union all select * from fvec union all select * from fall) u
    group by u.id
  ),
  fact_hits as (
    select 'fact'::text as kind, f.id::text as id, 'memory'::text as source, f.person as person_name, f.created_at as occurred_at,
           f.category || ': ' || f.subject || ' - ' || f.fact as content, r.via, r.score::double precision as score
    from franked r join fact_scope f on f.id = r.id
    order by r.score desc
    limit 6
  )
  select * from chunk_hits
  union all
  select * from fact_hits;
$$;

grant execute on function public.memory_recall(text[], extensions.vector, text, timestamptz, timestamptz, integer) to authenticated;
