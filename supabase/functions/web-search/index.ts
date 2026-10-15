/**
 * web-search — the assistant's research.
 *
 * The assistant (Gemini or Sarvam) calls one `web_search` tool with up to three searches and a freshness hint; the phone
 * forwards it here. Tavily reads the web and returns the parts of pages that answer each search, which are shaped into a
 * short, dated, source-named text for the voice model (see tavily.ts). There are no topic categories: whatever the user
 * asks, the model searches for it, reads the result, searches again if it was weak, and answers.
 *
 *   POST { queries: string[] (1-3), recency?: 'any'|'day'|'week'|'month', depth?: 'basic'|'advanced' }   (logged-in users only)
 *   POST { query, kind?, location? }      the older shape, still accepted for app builds that have not updated
 *   POST { warm: true }                    answers 204 at once, boots the function
 *
 *   -> { ok, results: "<text for the model>", provider, credits, took_ms, cached, instruction? }
 *
 * Weather questions are answered by Open-Meteo first (no credits). If Tavily fails, times out or its credits run out, the
 * keyless sources (Wikipedia, Google News, Bing) are used instead, so the assistant is never left without an answer.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  bingProvider,
  isNonLatin,
  isTimely,
  newsProvider,
  placeFromQuery,
  simplifyQuery,
  weatherProvider,
  wikipediaProvider,
  type SearchResult,
} from './providers.ts';
import {
  formatForModel,
  nowLabel,
  tavilySearch,
  type Depth,
  type QuerySet,
  type Recency,
  type TavilyOutcome,
  type TavilyResult,
} from './tavily.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Tavily gets this long; the keyless fallback then gets its own, shorter budget. */
const TAVILY_MS = 7000;
const FALLBACK_MS = 2500;

// ─── Who may call, and how much ──────────────────────────────────────────────

const AUTH_TTL_MS = 10 * 60_000;
const authCache = new Map<string, { uid: string; until: number }>();

async function userIdFor(req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const hit = authCache.get(token);
  if (hit && hit.until > Date.now()) return hit.uid;
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user || data.user.role !== 'authenticated') return null;
    if (authCache.size > 500) authCache.clear();
    authCache.set(token, { uid: data.user.id, until: Date.now() + AUTH_TTL_MS });
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Per user (per worker: it stops a loop or a stuck model, it is not a billing meter): 30 searches a minute and 300 a day
 * (each query in a call counts), and 60 Tavily credits a day, after which the keyless sources answer instead.
 */
const PER_MINUTE = 30;
const PER_DAY = 300;
const CREDITS_PER_DAY = 60;
const usage = new Map<string, { minute: number[]; day: string; count: number; credits: number }>();

function usageOf(uid: string) {
  const today = new Date().toISOString().slice(0, 10);
  const u = usage.get(uid) ?? { minute: [], day: today, count: 0, credits: 0 };
  if (u.day !== today) Object.assign(u, { day: today, count: 0, credits: 0 });
  u.minute = u.minute.filter((t) => Date.now() - t < 60_000);
  if (usage.size > 2000) usage.clear();
  usage.set(uid, u);
  return u;
}

/** Counts the queries of a call against the limits. False when the call would go over. */
function allow(uid: string, queries: number): boolean {
  const u = usageOf(uid);
  if (u.minute.length + queries > PER_MINUTE || u.count + queries > PER_DAY) return false;
  const now = Date.now();
  for (let i = 0; i < queries; i++) u.minute.push(now);
  u.count += queries;
  return true;
}

// ─── The Tavily key, and what to do when it stops working ───────────────────

let tavilyKey: { value: string; at: number } | null = null;

async function loadTavilyKey(): Promise<string> {
  if (tavilyKey && Date.now() - tavilyKey.at < 5 * 60_000) return tavilyKey.value;
  let value = '';
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data } = await db.rpc('ai_secret_get', { p_name: 'ai_tavily_api_key' });
    if (typeof data === 'string' && data) value = data;
  } catch {
    /* fall back to the server secret */
  }
  if (!value) value = Deno.env.get('TAVILY_API_KEY') ?? '';
  tavilyKey = { value, at: Date.now() };
  return value;
}

/** When Tavily is switched off for this worker: the plan's credits are used up (until the next hour) or the key was refused (10 minutes). */
let tavilyOffUntil = 0;

function noteTavilyFailure(o: Extract<TavilyOutcome, { ok: false }>) {
  if (o.code === 'quota') {
    tavilyOffUntil = Date.now() + 3_600_000;
    console.error(JSON.stringify({ fn: 'web-search', event: 'tavily_quota', status: o.status }));
  } else if (o.code === 'auth') {
    tavilyOffUntil = Date.now() + 600_000;
    tavilyKey = null;
    console.error(JSON.stringify({ fn: 'web-search', event: 'tavily_auth', status: o.status }));
  }
}

// ─── Remembering answers ─────────────────────────────────────────────────────

/** How long a search is kept: today's news a few minutes, a person or a fact for hours. */
const TTL: Record<Recency, number> = { day: 5 * 60_000, week: 15 * 60_000, month: 6 * 3_600_000, any: 6 * 3_600_000 };
const FAILURE_TTL = 30_000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; ttl: number; set: QuerySet; provider: string }>();

function remember(key: string, value: { ttl: number; set: QuerySet; provider: string }) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), ...value });
}

// ─── Searching ───────────────────────────────────────────────────────────────

const asResult = (r: SearchResult): TavilyResult => ({
  title: r.title,
  url: r.url,
  content: r.snippet,
  score: 1,
  published_date: r.published ?? null,
});

/** Without Tavily: Wikipedia and the news feed asked about the subject, and Bing if it answers. */
async function keylessSearch(query: string, lang: string, ms: number): Promise<TavilyResult[]> {
  const subject = simplifyQuery(query);
  const [bing, wiki, news] = await Promise.all([
    bingProvider(query, lang, ms),
    wikipediaProvider(subject, lang, ms),
    isTimely(query) ? newsProvider(subject, lang, ms) : Promise.resolve(null),
  ]);
  const out: SearchResult[] = [];
  if (bing) out.push(...bing.results.slice(0, 3));
  if (wiki) out.push(...wiki.results.slice(0, bing ? 1 : 2));
  if (news) out.push(...news.results.slice(0, bing ? 1 : 3));
  return out.map(asResult);
}

const WEATHER_WORDS = /\b(weather|temperature|forecast|rain|raining|humidity|monsoon)\b/i;

function normaliseQueries(body: Record<string, unknown>): string[] {
  const raw: unknown[] = [...(Array.isArray(body.queries) ? body.queries : []), body.query];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of raw) {
    const clean = typeof q === 'string' ? q.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
    if (clean.length >= 2 && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      out.push(clean);
    }
  }
  return out.slice(0, 3);
}

const RECENCIES = new Set(['any', 'day', 'week', 'month']);

interface Answer {
  text: string;
  provider: string;
  credits: number;
  cached: boolean;
  /** The sources answered but had nothing relevant (as opposed to the internet being unreachable). */
  nothing: boolean;
}

async function research(uid: string, queries: string[], recency: Recency, depth: Depth, location: string, lang: string): Promise<Answer | null> {
  const now = Date.now();

  // Weather is answered from Open-Meteo: exact, free and fast. Anything it cannot place goes to the normal search.
  if (queries.length === 1 && (WEATHER_WORDS.test(queries[0]) || location)) {
    const place = location || placeFromQuery(queries[0]);
    const w = place ? await weatherProvider(place, lang, FALLBACK_MS) : null;
    if (w?.answer) return { text: `Searched ${nowLabel(now)}.
${w.answer}`, provider: w.provider, credits: 0, cached: false, nothing: false };
  }

  const key = await loadTavilyKey();
  const useTavily = !!key && Date.now() >= tavilyOffUntil && usageOf(uid).credits < CREDITS_PER_DAY;
  const maxResults = queries.length === 1 ? 6 : 5;
  let credits = 0;
  let cachedAll = true;
  let provider = 'tavily';
  /** Did any source actually answer (even with nothing relevant)? If not, the internet was out of reach. */
  let reached = false;

  const sets = await Promise.all(
    queries.map(async (query): Promise<QuerySet> => {
      const ck = `${recency}|${depth}|${query.toLowerCase()}`;
      const hit = cache.get(ck);
      if (hit && Date.now() - hit.at < hit.ttl) {
        reached = true;
        if (hit.provider !== 'tavily') provider = hit.provider;
        return hit.set;
      }
      cachedAll = false;
      let results: TavilyResult[] = [];
      let summary: string | undefined;
      let used = 'tavily';
      if (useTavily) {
        const o = await tavilySearch(key, query, { recency, depth, maxResults }, TAVILY_MS);
        if (o.ok) {
          reached = true;
          credits += o.credits;
          results = o.results;
          summary = o.answer;
        } else {
          noteTavilyFailure(o);
          console.error(JSON.stringify({ fn: 'web-search', event: 'tavily_failed', code: o.code, status: o.status ?? null, ms: o.ms }));
        }
      }
      if (!results.length) {
        // Tavily is off, failed, or found nothing: the keyless sources get a turn.
        results = await keylessSearch(query, lang, FALLBACK_MS);
        if (results.length) {
          reached = true;
          used = 'keyless';
          provider = 'keyless';
        }
      }
      const set: QuerySet = { query, recency, results, answer: summary };
      remember(ck, { ttl: results.length ? TTL[recency] : FAILURE_TTL, set, provider: used });
      return set;
    }),
  );
  if (credits) usageOf(uid).credits += credits;

  const found = sets.some((s) => s.results.length);
  if (!found && !reached) return null;
  return { text: formatForModel(sets, now), provider, credits, cached: cachedAll, nothing: !found };
}

// ─── Server ──────────────────────────────────────────────────────────────────

const NOTHING = 'Try one different query (another name or spelling, the office instead of the person, a broader or more specific subject), or say you could not find it. Do not guess.';
const OFFLINE =
  "Say in one sentence that you couldn't reach the internet just now, give what you know, say it may be out of date, and offer to try again.";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // A warm-up only boots the worker: nothing to check, nothing counted.
  if (body.warm === true) return new Response(null, { status: 204, headers: corsHeaders });

  const uid = await userIdFor(req);
  if (!uid) return json({ error: 'Unauthorized' }, 401);

  const queries = normaliseQueries(body);
  if (!queries.length) return json({ ok: false, error: 'No search query was given.' }, 400);

  // The older app shape: kind news meant "recent", kind weather meant a forecast for `location`.
  const recency: Recency = RECENCIES.has(String(body.recency)) ? (body.recency as Recency) : body.kind === 'news' ? 'week' : 'any';
  const depth: Depth = body.depth === 'advanced' ? 'advanced' : 'basic';
  const location = body.kind === 'weather' ? String(body.location ?? '').trim().slice(0, 80) : '';
  const lang = body.lang === 'hi' || (body.lang !== 'en' && isNonLatin(queries.join(' '))) ? 'hi' : 'en';

  if (!allow(uid, queries.length)) {
    return json({ ok: false, error: 'Too many searches. Try again in a minute.', instruction: 'Tell the user you have searched a lot just now and answer from what you know and what you already found.' }, 429);
  }

  const started = Date.now();
  let answer: Answer | null = null;
  try {
    answer = await research(uid, queries, recency, depth, location, lang);
  } catch (e) {
    console.error('[web-search] failed:', e);
  }
  const took = Date.now() - started;
  console.log(JSON.stringify({ fn: 'web-search', n: queries.length, recency, depth, provider: answer?.provider ?? null, credits: answer?.credits ?? 0, cached: answer?.cached ?? false, ms: took }));

  if (!answer) return json({ ok: false, error: 'No results found.', instruction: OFFLINE, took_ms: took });
  return json({
    ok: true,
    results: answer.text,
    provider: answer.provider,
    credits: answer.credits,
    cached: answer.cached,
    took_ms: took,
    ...(answer.nothing ? { instruction: NOTHING } : {}),
  });
});
