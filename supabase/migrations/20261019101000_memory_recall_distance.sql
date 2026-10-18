-- memory_recall now reports how close each meaning match was (dist: 0 = identical, larger = less alike) and can drop weak ones (p_max_distance).
drop function if exists public.memory_recall(text[], extensions.vector, text, timestamptz, timestamptz, integer);

create or replace function public.memory_recall(
  p_terms text[] default '{}',
  p_embedding extensions.vector(768) default null,
  p_person text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 6,
  p_max_distance double precision default null
)
returns table (kind text, id text, source text, person_name text, occurred_at timestamptz, content text, via text, score double precision, dist double precision)
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
    select s.id, row_number() over (order by ts_rank_cd(s.tsv, params.q) desc) as r, 'keyword'::text as via, null::double precision as d
    from scope s, params
    where params.q is not null and s.tsv @@ params.q
    order by ts_rank_cd(s.tsv, params.q) desc
    limit 20
  ),
  vec as (
    select s.id, row_number() over (order by s.embedding <=> p_embedding) as r, 'meaning'::text as via, (s.embedding <=> p_embedding)::double precision as d
    from scope s
    where p_embedding is not null and s.embedding is not null and (p_max_distance is null or (s.embedding <=> p_embedding) <= p_max_distance)
    order by s.embedding <=> p_embedding
    limit 20
  ),
  recent as (
    select s.id, row_number() over (order by s.occurred_at desc) as r, 'person/date'::text as via, null::double precision as d
    from scope s, params
    where params.person is not null or p_from is not null
    order by s.occurred_at desc
    limit 10
  ),
  ranked as (
    select u.id, sum(1.0 / (60 + u.r)) as score, string_agg(distinct u.via, ' + ') as via, min(u.d) as d
    from (select * from kw union all select * from vec union all select * from recent) u
    group by u.id
  ),
  chunk_hits as (
    select 'chunk'::text as kind, s.id::text as id, s.source, s.person_name, s.occurred_at, s.content, r.via, r.score::double precision as score, r.d as dist
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
    select f.id, row_number() over (order by ts_rank_cd(f.tsv, params.q) desc) as r, 'keyword'::text as via, null::double precision as d
    from fact_scope f, params where params.q is not null and f.tsv @@ params.q limit 10
  ),
  fvec as (
    select f.id, row_number() over (order by f.embedding <=> p_embedding) as r, 'meaning'::text as via, (f.embedding <=> p_embedding)::double precision as d
    from fact_scope f where p_embedding is not null and f.embedding is not null and (p_max_distance is null or (f.embedding <=> p_embedding) <= p_max_distance) order by f.embedding <=> p_embedding limit 10
  ),
  fall as (
    select f.id, 1 as r, 'person/date'::text as via, null::double precision as d from fact_scope f, params where params.person is not null limit 6
  ),
  franked as (
    select u.id, sum(1.0 / (60 + u.r)) as score, string_agg(distinct u.via, ' + ') as via, min(u.d) as d
    from (select * from fkw union all select * from fvec union all select * from fall) u
    group by u.id
  ),
  fact_hits as (
    select 'fact'::text as kind, f.id::text as id, 'memory'::text as source, f.person as person_name, f.created_at as occurred_at,
           f.category || ': ' || f.subject || ' - ' || f.fact as content, r.via, r.score::double precision as score, r.d as dist
    from franked r join fact_scope f on f.id = r.id
    order by r.score desc
    limit 6
  )
  select * from chunk_hits
  union all
  select * from fact_hits;
$$;

grant execute on function public.memory_recall(text[], extensions.vector, text, timestamptz, timestamptz, integer, double precision) to authenticated;
