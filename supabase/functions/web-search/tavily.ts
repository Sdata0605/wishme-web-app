/**
 * Tavily: the search service behind the assistant's research. It reads the web for a question and returns the part of
 * each page that answers it, with the page's date when it has one.
 *
 * This file holds the request (how a freshness hint becomes Tavily's options), the failure handling, and `formatForModel`,
 * which turns the results of up to three searches into the short, dated, source-named text the voice model reads. The
 * formatting is a pure function, checked offline in scripts/webSearch.selfcheck.ts.
 */

import { clip } from './providers.ts';

export type Recency = 'any' | 'day' | 'week' | 'month';
export type Depth = 'basic' | 'advanced';

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  /** Only news-type results carry a date; ordinary pages usually do not. */
  published_date?: string | null;
}

export type TavilyOutcome =
  | { ok: true; results: TavilyResult[]; answer?: string; credits: number; ms: number }
  | { ok: false; code: 'quota' | 'auth' | 'rate' | 'timeout' | 'error'; status?: number; ms: number };

const BLOCKED_DOMAINS = ['youtube.com', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'pinterest.com', 'quora.com'];

export interface TavilyShape {
  topic: 'general' | 'news';
  time_range?: 'day' | 'week' | 'month';
  country?: string;
}

/**
 * What each freshness hint asks of Tavily. Freshness is the only hint the model gives; there are no topic categories.
 * For "today" and "this week" two searches run side by side: Tavily's news index (articles) and its general index
 * limited to the same period (pages that are updated daily: a gold-rate page, a live scoreboard, a "top headlines" page).
 * The news index alone found no gold rate and missed the headlines page; the general index alone misses fresh articles.
 */
export function optionsFor(recency: Recency): TavilyShape[] {
  switch (recency) {
    case 'day':
      return [{ topic: 'news', time_range: 'day' }, { topic: 'general', time_range: 'day', country: 'india' }];
    case 'week':
      return [{ topic: 'news', time_range: 'week' }, { topic: 'general', time_range: 'week', country: 'india' }];
    case 'month':
      return [{ topic: 'general', time_range: 'month', country: 'india' }];
    default:
      return [{ topic: 'general', country: 'india' }];
  }
}

async function call(key: string, body: Record<string, unknown>, timeoutMs: number): Promise<TavilyOutcome> {
  const started = Date.now();
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      // 432 / 433: the plan's or the pay-as-you-go limit is used up. 401: the key is wrong or was revoked.
      const code = res.status === 432 || res.status === 433 ? 'quota' : res.status === 401 || res.status === 403 ? 'auth' : res.status === 429 ? 'rate' : 'error';
      return { ok: false, code, status: res.status, ms };
    }
    const j = (await res.json()) as { answer?: string; results?: TavilyResult[]; usage?: { credits?: number } };
    return {
      ok: true,
      results: (j.results ?? []).filter((r) => r?.url && r?.title),
      answer: typeof j.answer === 'string' && j.answer ? j.answer : undefined,
      credits: j.usage?.credits ?? (body.search_depth === 'advanced' ? 2 : 1),
      ms,
    };
  } catch (e) {
    const timedOut = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { ok: false, code: timedOut ? 'timeout' : 'error', ms: Date.now() - started };
  }
}

export interface SearchOptions {
  recency: Recency;
  depth: Depth;
  maxResults: number;
}

/**
 * One search. The shapes for its freshness hint run in parallel; their results are merged (the formatter folds repeats),
 * the credits add up, and one failing shape does not spoil the other.
 */
export async function tavilySearch(key: string, query: string, opts: SearchOptions, timeoutMs: number): Promise<TavilyOutcome> {
  const body = (o: TavilyShape) => ({
    query,
    ...o,
    search_depth: opts.depth,
    max_results: opts.maxResults,
    include_answer: 'basic',
    include_usage: true,
    include_published_date: true,
    include_raw_content: false,
    auto_parameters: false, // it can quietly switch to 2-credit advanced searches
    exclude_domains: BLOCKED_DOMAINS,
  });
  const outs = await Promise.all(optionsFor(opts.recency).map((o) => call(key, body(o), timeoutMs)));
  const good = outs.filter((o): o is Extract<TavilyOutcome, { ok: true }> => o.ok);
  if (!good.length) return outs[0];
  // The general index's summary reads better for facts and prices; the news index's for events.
  const answer = [...good].reverse().find((o) => o.answer)?.answer;
  return {
    ok: true,
    results: good.flatMap((o) => o.results),
    answer,
    credits: good.reduce((n, o) => n + o.credits, 0),
    ms: Math.max(...good.map((o) => o.ms)),
  };
}

// ─── Telling the model what was found ────────────────────────────────────────

const SOURCE_NAMES: [RegExp, string][] = [
  [/(^|\.)bbc\.(com|co\.uk)$/, 'BBC'],
  [/(^|\.)ndtv\.com$/, 'NDTV'],
  [/(^|\.)thehindu\.com$/, 'The Hindu'],
  [/(^|\.)timesofindia\.indiatimes\.com$/, 'Times of India'],
  [/(^|\.)economictimes\.indiatimes\.com$/, 'The Economic Times'],
  [/(^|\.)hindustantimes\.com$/, 'Hindustan Times'],
  [/(^|\.)indianexpress\.com$/, 'The Indian Express'],
  [/(^|\.)livemint\.com$/, 'Mint'],
  [/(^|\.)reuters\.com$/, 'Reuters'],
  [/(^|\.)apnews\.com$/, 'AP'],
  [/(^|\.)wikipedia\.org$/, 'Wikipedia'],
  [/(^|\.)moneycontrol\.com$/, 'Moneycontrol'],
  [/(^|\.)theguardian\.com$/, 'The Guardian'],
  [/(^|\.)aljazeera\.com$/, 'Al Jazeera'],
  [/(^|\.)cnbc\.com$/, 'CNBC'],
  [/(^|\.)cnn\.com$/, 'CNN'],
  [/(^|\.)dw\.com$/, 'DW'],
  [/(^|\.)lemonde\.fr$/, 'Le Monde'],
  [/(^|\.)news18\.com$/, 'News18'],
  [/(^|\.)indiatoday\.in$/, 'India Today'],
  [/(^|\.)business-standard\.com$/, 'Business Standard'],
  [/(^|\.)livelaw\.in$/, 'Live Law'],
  [/(^|\.)thewire\.in$/, 'The Wire'],
  [/(^|\.)scroll\.in$/, 'Scroll'],
  [/(^|\.)goodreturns\.in$/, 'Goodreturns'],
  [/(^|\.)amnestyusa\.org$/, 'Amnesty International'],
  [/(^|\.)bloomberg\.com$/, 'Bloomberg'],
  [/(^|\.)techcrunch\.com$/, 'TechCrunch'],
  [/(^|\.)espncricinfo\.com$/, 'ESPNcricinfo'],
  [/(^|\.)cricbuzz\.com$/, 'Cricbuzz'],
];

export function hostOfUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function sourceName(url: string): string {
  const host = hostOfUrl(url);
  return SOURCE_NAMES.find(([re]) => re.test(host))?.[1] ?? host;
}

const IST_MS = 5.5 * 3_600_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "14 Oct" (with "today", "yesterday" or "3 days ago" when it is recent), in Indian time. Empty when the date is unknown. */
export function dateLabel(iso: string | null | undefined, now: number): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return '';
  const day = (ms: number) => Math.floor((ms + IST_MS) / 86_400_000);
  const d = new Date(t + IST_MS);
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  const ago = day(now) - day(t);
  if (ago <= 0) return `${base} (today)`;
  if (ago === 1) return `${base} (yesterday)`;
  if (ago < 8) return `${base} (${ago} days ago)`;
  return `${base}${d.getUTCFullYear() !== new Date(now + IST_MS).getUTCFullYear() ? ` ${d.getUTCFullYear()}` : ''}`;
}

export function nowLabel(now: number): string {
  const d = new Date(now + IST_MS);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} IST`;
}

const normUrl = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');

const titleWords = (t: string) => new Set((t.toLowerCase().match(/[\p{L}\p{M}\p{N}]{3,}/gu) ?? []));

/** How much two headlines say the same thing: shared words over all words (and at least three of them), so a short title is not "the same" as a long one just because it fits inside it. */
function sameHeadline(a: Set<string>, b: Set<string>): boolean {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return inter >= 3 && union > 0 && inter / union >= 0.5;
}

const when = (r: TavilyResult) => (r.published_date ? Date.parse(r.published_date) : NaN);

export interface QuerySet {
  query: string;
  recency: Recency;
  results: TavilyResult[];
  answer?: string;
}

interface Line {
  r: TavilyResult;
  also: string[];
}

/**
 * Drops weak and repeated results and keeps at most two per site, newest first when freshness matters.
 * A repeat of the same story from another outlet is folded into it ("also: BBC") so one story is counted once.
 */
export function selectResults(set: QuerySet, max: number): Line[] {
  const ranked = [...set.results].sort((a, b) => b.score - a.score);
  const kept = ranked.filter((r, i) => r.score >= 0.2 || i < 2);
  const lines: Line[] = [];
  const perHost = new Map<string, number>();
  for (const r of kept) {
    const twin = lines.find((l) => normUrl(l.r.url) === normUrl(r.url) || sameHeadline(titleWords(l.r.title), titleWords(r.title)));
    if (twin) {
      // The same story again: show the newer copy, and name the outlets that ran it.
      const names = new Set([...twin.also, sourceName(twin.r.url), sourceName(r.url)].filter(Boolean));
      if (when(r) > (when(twin.r) || 0)) twin.r = r;
      names.delete(sourceName(twin.r.url));
      twin.also = [...names];
      continue;
    }
    const host = hostOfUrl(r.url);
    if ((perHost.get(host) ?? 0) >= 2) continue;
    perHost.set(host, (perHost.get(host) ?? 0) + 1);
    lines.push({ r, also: [] });
  }
  if (set.recency === 'day' || set.recency === 'week') {
    // Newest first; results without a date go last, in Tavily's own order.
    lines.sort((a, b) => (Number.isNaN(when(b.r)) ? -Infinity : when(b.r)) - (Number.isNaN(when(a.r)) ? -Infinity : when(a.r)));
  }
  return lines.slice(0, max);
}

/** Collapses the text of a result to what is worth reading: no link junk, no repeated spaces. */
const tidy = (s: string) =>
  s
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // markdown links and images keep their words, lose the address
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*_`>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const FRESHNESS_WINDOW_DAYS = { day: 1, week: 7 } as const;

/**
 * The text the voice model reads: when the search was made, then for each search its results, one line each:
 *   "1. NDTV, 14 Oct (yesterday): Title. What the page says..."  (and "also: BBC" for the same story elsewhere)
 * plus a note when the dates disagree or nothing fresh was found. There are no web addresses in it, on purpose.
 */
export function formatForModel(sets: QuerySet[], now: number): string {
  const single = sets.length === 1;
  const perResult = single ? 380 : 230;
  const maxResults = single ? 6 : 4;
  const maxTotal = single ? 2600 : 3400;
  const header = `Searched ${nowLabel(now)}.`;
  // Each search gets its own share of the room, so a long first search cannot push the last one out.
  const share = Math.floor((maxTotal - header.length) / sets.length);
  const sections: string[] = [];
  for (const set of sets) {
    const lines = selectResults(set, maxResults);
    const label = single ? [] : [`Search "${set.query}":`];
    if (!lines.length) {
      sections.push([...label, `Nothing relevant found for "${set.query}".`].join('\n'));
      continue;
    }
    const rendered = lines.map((l, i) => {
      const name = sourceName(l.r.url);
      const date = dateLabel(l.r.published_date, now);
      const head = `${i + 1}. ${[name, date].filter(Boolean).join(', ')}${l.also.length ? ` (also: ${l.also.join(', ')})` : ''}: `;
      const title = clip(tidy(l.r.title), 150);
      const body = tidy(l.r.content);
      // A page whose text opens with its own title ("Balasaheb Thorat is an Indian politician...") needs no heading.
      const text = !body ? `${title}.` : body.toLowerCase().startsWith(title.toLowerCase()) ? clip(body, perResult) : `${title}. ${clip(body, perResult)}`;
      return `${head}${text}`;
    });
    // Notes: the sources are from different days, or none is from the period asked about.
    const notes: string[] = [];
    const dates = lines.map((l) => when(l.r)).filter((t) => !Number.isNaN(t));
    if (dates.length >= 2 && (set.recency === 'day' || set.recency === 'week') && Math.max(...dates) - Math.min(...dates) > 2 * 86_400_000) {
      notes.push('Note: these sources are from different days; prefer the newest.');
    }
    const window = set.recency === 'day' || set.recency === 'week' ? FRESHNESS_WINDOW_DAYS[set.recency] : 0;
    if (window && dates.length && now - Math.max(...dates) > (window + 1) * 86_400_000) {
      notes.push(`Note: nothing from the last ${window === 1 ? 'day' : 'week'} was found; the newest is ${dateLabel(new Date(Math.max(...dates)).toISOString(), now)}.`);
    }
    const summary = set.answer ? [`Quick summary from the search service (check it against the sources): ${clip(tidy(set.answer), single ? 420 : 240)}`] : [];
    // Drop the weakest results until the section fits its share; whole results go, none is cut mid-sentence.
    let keep = rendered.length;
    const build = () => [...label, ...summary, ...rendered.slice(0, keep), ...notes].join('\n');
    while (keep > 1 && build().length > share) keep--;
    const text = build();
    sections.push(text.length > share ? `${text.slice(0, share - 1).trimEnd()}…` : text);
  }
  return [header, ...sections].join('\n');
}
