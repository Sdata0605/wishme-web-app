/**
 * Where the `web-search` function gets its answers. Every provider returns a few short results (title, snippet,
 * source, link) and never throws: a provider that fails, times out or is blocked just returns nothing, so the next one
 * can be tried. The parsers are pure functions so they can be checked against saved pages without a network.
 */

export interface SearchResult {
  title: string;
  snippet: string;
  source: string;
  url: string;
  published?: string;
  /** For a news story: every outlet that ran it (two or more is how a story is known to be a big one). */
  outlets?: string[];
}

export interface ProviderOutput {
  provider: string;
  /** A ready-made one or two sentence answer, when the provider has one (weather, Tavily). */
  answer?: string;
  results: SearchResult[];
}

const BROWSER_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const BOT_UA = 'WishMeAssistant/1.0 (voice assistant lookups; contact: support@wishme.app)';

export const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Removes tags and CDATA wrappers, decodes entities and collapses whitespace. */
export function plainText(s: string): string {
  return decodeEntities(
    s
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<\/?(?:b|i|em|strong|span|a|mark|u)\b[^>]*>/gi, '') // inline tags vanish, so "<b>Mumbai</b>." stays "Mumbai."
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Devanagari, Tamil, Kannada...: anything that is not Latin is looked up in Hindi, the app's only other search language. */
export const isNonLatin = (s: string) => /[ऀ-෿]/.test(s);

export const BROWSER_USER_AGENT = BROWSER_UA;
export const BOT_USER_AGENT = BOT_UA;

export async function getText(url: string, ms: number, headers: Record<string, string> = {}): Promise<{ status: number; text: string } | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(ms), redirect: 'follow' });
    return { status: res.status, text: await res.text() };
  } catch {
    return null;
  }
}

// ─── Making the question searchable ──────────────────────────────────────────

const FILLER_WORDS = new Set([
  'who', 'what', 'whats', "what's", 'is', 'are', 'was', 'were', 'the', 'a', 'an', 'tell', 'me', 'about', 'information', 'info',
  'details', 'latest', 'current', 'currently', 'today', 'todays', "today's", 'now', 'news', 'biography', 'bio', 'status',
  'update', 'updates', 'please', 'right', 'recent', 'recently', 'new', 'live', 'career', 'political', 'profile', 'history',
]);
const MONTHS = new Set([
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
]);

/**
 * The model pads queries ("who is current Chief Minister of Karnataka October 2026", "MLA Balasaheb Thorat biography
 * political career"), and every extra word pulls the search away from the subject: Wikipedia answered those with the
 * Tamil Nadu page and with Ajit Pawar. This keeps the subject: "Chief Minister of Karnataka", "MLA Balasaheb Thorat".
 * Words that are not English fillers (names, Hindi, Marathi...) are never touched; if nothing is left, the query is kept.
 */
export function simplifyQuery(query: string): string {
  const words = query.replace(/[?!.,"]/g, ' ').split(/\s+/).filter(Boolean);
  const hadMonth = words.some((w) => MONTHS.has(w.toLowerCase()));
  const kept = words.filter((w) => {
    const l = w.toLowerCase();
    if (FILLER_WORDS.has(l) || MONTHS.has(l)) return false;
    if (/^(19|20)\d{2}$/.test(l)) return false; // a year
    if (hadMonth && /^\d{1,2}(st|nd|rd|th)?$/.test(l)) return false; // the day in "15 October"
    return true;
  });
  return (kept.length ? kept : words).slice(0, 8).join(' ');
}

/** True when the question is about something that changes (so recent headlines belong in the answer). */
export const isTimely = (query: string) =>
  /\b(latest|current|currently|today|todays|now|news|status|update|updates|price|rate|rates|score|live|recent|recently|tonight|tomorrow|this week|breaking)\b/i.test(query);

// ─── Weather: Open-Meteo (no key) ────────────────────────────────────────────

const WMO: Record<number, string> = {
  0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'freezing fog',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 56: 'freezing drizzle', 57: 'freezing drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'light rain showers', 81: 'rain showers', 82: 'violent rain showers', 85: 'snow showers', 86: 'heavy snow showers',
  95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'thunderstorm with heavy hail',
};
export const weatherWord = (code: number) => WMO[code] ?? 'mixed conditions';

/** "weather in Pune", "Pune weather today", "temperature at Goa": the place named in a weather question. */
export function placeFromQuery(query: string): string {
  const q = query.replace(/[?.!]+$/g, '').trim();
  const after = q.match(/\b(?:in|at|for|near)\s+([\p{L} .'-]{2,40}?)(?:\s+(?:today|tonight|tomorrow|now|right now|this week|forecast))?$/iu);
  if (after) return after[1].trim();
  const before = q.match(/^([\p{L} .'-]{2,40}?)\s+(?:weather|temperature|forecast|rain)/iu);
  return before ? before[1].trim() : '';
}

interface Geo { name: string; admin1?: string; country?: string; latitude: number; longitude: number }
interface Forecast {
  current?: { temperature_2m?: number; apparent_temperature?: number; relative_humidity_2m?: number; wind_speed_10m?: number; weather_code?: number };
  daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: (number | null)[] };
}

export function weatherAnswer(place: Geo, f: Forecast): string {
  const c = f.current;
  const d = f.daily;
  const where = [place.name, place.admin1].filter(Boolean).join(', ');
  const parts: string[] = [];
  if (c && typeof c.temperature_2m === 'number') {
    const feels = typeof c.apparent_temperature === 'number' ? ` (feels like ${Math.round(c.apparent_temperature)}°C)` : '';
    const hum = typeof c.relative_humidity_2m === 'number' ? `, humidity ${Math.round(c.relative_humidity_2m)}%` : '';
    const wind = typeof c.wind_speed_10m === 'number' ? `, wind ${Math.round(c.wind_speed_10m)} km/h` : '';
    parts.push(`Now in ${where}: ${Math.round(c.temperature_2m)}°C${feels}, ${weatherWord(c.weather_code ?? -1)}${hum}${wind}.`);
  }
  const names = ['Today', 'Tomorrow', 'Day after tomorrow'];
  for (let i = 0; i < Math.min(3, d?.time?.length ?? 0); i++) {
    const hi = d!.temperature_2m_max?.[i];
    const lo = d!.temperature_2m_min?.[i];
    if (typeof hi !== 'number' || typeof lo !== 'number') continue;
    const rain = d!.precipitation_probability_max?.[i];
    parts.push(`${names[i]}: ${Math.round(lo)} to ${Math.round(hi)}°C, ${weatherWord(d!.weather_code?.[i] ?? -1)}${typeof rain === 'number' ? `, ${Math.round(rain)}% chance of rain` : ''}.`);
  }
  return parts.join(' ');
}

export async function weatherProvider(place: string, lang: string, ms: number): Promise<ProviderOutput | null> {
  if (!place) return null;
  const geo = await getText(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=${lang === 'hi' ? 'hi' : 'en'}&format=json`,
    ms,
    { 'User-Agent': BOT_UA },
  );
  if (!geo || geo.status !== 200) return null;
  let g: Geo | undefined;
  try {
    g = (JSON.parse(geo.text).results ?? [])[0];
  } catch {
    return null;
  }
  if (!g) return null;
  const fc = await getText(
    `https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}` +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3',
    ms,
    { 'User-Agent': BOT_UA },
  );
  if (!fc || fc.status !== 200) return null;
  let f: Forecast;
  try {
    f = JSON.parse(fc.text);
  } catch {
    return null;
  }
  const answer = weatherAnswer(g, f);
  if (!answer) return null;
  return {
    provider: 'open-meteo',
    answer,
    results: [{ title: `Weather in ${g.name}`, snippet: answer, source: 'Open-Meteo', url: 'https://open-meteo.com' }],
  };
}

// ─── News: Google News RSS (no key) ──────────────────────────────────────────

export function parseNewsRss(xml: string, max = 5): SearchResult[] {
  const out: SearchResult[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1];
    const rawTitle = plainText(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const link = plainText(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '');
    const pub = plainText(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '');
    const sourceTag = plainText(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? '');
    if (!rawTitle) continue;
    // Google News writes "Headline - Source".
    const dash = rawTitle.lastIndexOf(' - ');
    const title = dash > 10 ? rawTitle.slice(0, dash) : rawTitle;
    const source = sourceTag || (dash > 10 ? rawTitle.slice(dash + 3) : 'Google News');
    const when = pub ? new Date(pub) : null;
    out.push({
      title,
      snippet: '',
      source,
      url: link,
      published: when && !Number.isNaN(when.getTime()) ? when.toISOString() : undefined,
    });
    if (out.length >= max) break;
  }
  return out;
}

export async function newsProvider(query: string, lang: string, ms: number): Promise<ProviderOutput | null> {
  const edition = lang === 'hi' ? 'hl=hi&gl=IN&ceid=IN:hi' : 'hl=en-IN&gl=IN&ceid=IN:en';
  const generic = !query || /^(news|latest news|headlines|top news|top headlines|today'?s news|news today)$/i.test(query.trim());
  const url = generic
    ? `https://news.google.com/rss?${edition}`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:2d`)}&${edition}`;
  const res = await getText(url, ms, { 'User-Agent': BROWSER_UA });
  if (!res || res.status !== 200) return null;
  const results = parseNewsRss(res.text);
  return results.length ? { provider: 'google-news', results } : null;
}

// ─── General: Tavily (key), DuckDuckGo HTML (no key), Wikipedia (no key) ─────

export async function tavilyProvider(query: string, key: string, ms: number): Promise<ProviderOutput | null> {
  if (!key) return null;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, search_depth: 'basic', include_answer: true, max_results: 4, country: 'india' }),
      signal: AbortSignal.timeout(ms),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { answer?: string; results?: { title?: string; url?: string; content?: string; published_date?: string }[] };
    const results = (j.results ?? []).slice(0, 4).map((r) => ({
      title: plainText(r.title ?? ''),
      snippet: plainText(r.content ?? ''),
      source: hostOf(r.url ?? ''),
      url: r.url ?? '',
      published: r.published_date,
    }));
    if (!results.length && !j.answer) return null;
    return { provider: 'tavily', answer: j.answer ? plainText(j.answer) : undefined, results };
  } catch {
    return null;
  }
}

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** DuckDuckGo wraps every link as //duckduckgo.com/l/?uddg=<real url>. */
export function unwrapDdgLink(href: string): string {
  const h = decodeEntities(href);
  const m = h.match(/[?&]uddg=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return '';
    }
  }
  return h.startsWith('//') ? `https:${h}` : h;
}

export function parseDdgHtml(html: string, max = 4): SearchResult[] {
  const out: SearchResult[] = [];
  const links = [...html.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  for (let i = 0; i < links.length && out.length < max; i++) {
    const start = links[i].index ?? 0;
    const end = links[i + 1]?.index ?? html.length;
    const block = html.slice(start, end);
    const snip = block.match(/<(?:a|div|td)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|td)>/)?.[1] ?? '';
    const url = unwrapDdgLink(links[i][1]);
    const title = plainText(links[i][2]);
    // Sponsored results carry ad redirects (y.js): skip them.
    if (!title || !url || /duckduckgo\.com\/y\.js/.test(url)) continue;
    out.push({ title, snippet: plainText(snip), source: hostOf(url), url });
  }
  return out;
}

export async function duckDuckGoProvider(query: string, ms: number): Promise<ProviderOutput | null> {
  const res = await getText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=in-en`, ms, {
    'User-Agent': BROWSER_UA,
    'Accept-Language': 'en-IN,en;q=0.9',
  });
  // 202, or a page asking to prove you are human, means this server is being turned away.
  if (!res || res.status !== 200 || /anomaly|unusual traffic|captcha/i.test(res.text.slice(0, 4000))) return null;
  const results = filterRelevant(parseDdgHtml(res.text), query);
  return results.length ? { provider: 'duckduckgo', results } : null;
}

const STOPWORDS = new Set([
  'the', 'of', 'is', 'are', 'was', 'were', 'who', 'what', 'when', 'where', 'how', 'why', 'in', 'on', 'at', 'to', 'for', 'and',
  'or', 'a', 'an', 'me', 'my', 'tell', 'about', 'please', 'now', 'right', 'current', 'currently', 'latest',
]);

/**
 * A search page scraped by a program is sometimes answered with results that have nothing to do with the question
 * (Bing does this when it suspects automation: "chief minister of Karnataka" came back as dictionary entries for "chief").
 * Keep only results that mention at least half of the question's meaningful words; if none do, the provider counts as
 * having failed and the next one is tried.
 */
export function filterRelevant(results: SearchResult[], query: string): SearchResult[] {
  // \p{M}: the vowel signs of Hindi, Tamil, Kannada... are marks, and a word is not cut at them.
  const words = [...new Set((query.toLowerCase().match(/[\p{L}\p{M}\p{N}]{2,}/gu) ?? []).filter((w) => !STOPWORDS.has(w)))];
  if (!words.length) return results;
  return results.filter((r) => {
    const hay = `${r.title} ${r.snippet} ${r.url}`.toLowerCase();
    const hits = words.filter((w) => hay.includes(w)).length;
    return hits / words.length >= 0.5;
  });
}

/** Bing sometimes wraps a link as bing.com/ck/a?...&u=a1<base64 of the real address>. */
export function unwrapBingLink(href: string): string {
  const h = decodeEntities(href);
  if (!/^https?:\/\/(?:www\.)?bing\.com\/ck\/a\?/i.test(h)) return h;
  const u = h.match(/[?&]u=a1([^&]+)/)?.[1];
  if (!u) return '';
  try {
    return atob(u.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(u.length / 4) * 4, '='));
  } catch {
    return '';
  }
}

export function parseBingHtml(html: string, max = 4): SearchResult[] {
  const out: SearchResult[] = [];
  const parts = html.split(/<li class="b_algo/).slice(1);
  for (const part of parts) {
    if (out.length >= max) break;
    const block = part.slice(0, part.indexOf('</li>') >= 0 ? part.indexOf('</li>') : part.length);
    // The heading is a link wrapping an <h2> (mobile pages) or an <h2> wrapping a link (desktop pages).
    const a =
      block.match(/<a[^>]*href="(https?:[^"]+)"[^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>/) ??
      block.match(/<h2[^>]*>\s*<a[^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    const url = unwrapBingLink(a[1]);
    const title = plainText(a[2]);
    const snippet = plainText(block.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '').replace(/^·\s*/, '');
    if (!title || !url) continue;
    out.push({ title, snippet, source: hostOf(url), url });
  }
  return out;
}

// `lang` is not used on purpose: with setlang=hi Bing answers in a different page layout that has no results in it
// (seen from Supabase's servers), while a Hindi query with the Indian-English setting returns normal Hindi results.
export async function bingProvider(query: string, _lang: string, ms: number): Promise<ProviderOutput | null> {
  const res = await getText(
    `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en-IN&cc=IN`,
    ms,
    { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-IN,en;q=0.9' },
  );
  if (!res || res.status !== 200) return null;
  const results = filterRelevant(parseBingHtml(res.text), query);
  return results.length ? { provider: 'bing', results } : null;
}

export function parseWikiJson(json: unknown, max = 2): SearchResult[] {
  const pages = Object.values(((json as { query?: { pages?: Record<string, unknown> } })?.query?.pages ?? {}) as Record<string, { title?: string; extract?: string; fullurl?: string; index?: number }>);
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  return pages
    .filter((p) => p.title && p.extract)
    .slice(0, max)
    .map((p) => ({ title: p.title!, snippet: plainText(p.extract!), source: 'Wikipedia', url: p.fullurl ?? '' }));
}

/** Languages that have their own Wikipedia and Google News edition here. */
export const LANGS = new Set(['en', 'hi', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'gu', 'pa']);

const wordsOf = (s: string) => new Set((s.toLowerCase().match(/[\p{L}\p{M}\p{N}]{2,}/gu) ?? []).filter((w) => !STOPWORDS.has(w)));

/**
 * Wikipedia's own search ranks by word matches in the page text, so a long question can put the wrong page first.
 * The page whose TITLE says the most of what was asked for is the right one: "Chief Minister of Karnataka" over
 * "Chief Minister of Tamil Nadu", "Balasaheb Thorat" over "Ajit Pawar". Pages whose title shares nothing with the
 * subject are dropped when a better one exists.
 */
export function rankWikiByTitle(results: SearchResult[], subject: string): SearchResult[] {
  const want = wordsOf(subject);
  if (!want.size) return results;
  const scored = results.map((r, i) => {
    const have = wordsOf(r.title);
    let hit = 0;
    for (const w of have) if (want.has(w)) hit++;
    return { r, i, score: hit / want.size - (have.size - hit) * 0.02 - i * 0.001 };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].score;
  return scored.filter((s) => s.score > 0 || best <= 0).map((s) => s.r);
}

export async function wikipediaProvider(query: string, lang: string, ms: number): Promise<ProviderOutput | null> {
  const host = LANGS.has(lang) ? lang : 'en';
  const res = await getText(
    `https://${host}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=4` +
      '&prop=extracts|info&inprop=url&exintro=1&explaintext=1&exsentences=4&format=json&utf8=1&origin=*',
    ms,
    { 'User-Agent': BOT_UA },
  );
  if (!res || res.status !== 200) return null;
  try {
    const results = rankWikiByTitle(parseWikiJson(JSON.parse(res.text), 4), query);
    return results.length ? { provider: 'wikipedia', results } : null;
  } catch {
    return null;
  }
}

// ─── Putting the answer together ─────────────────────────────────────────────

export const MAX_RESULTS = 4;
export const MAX_CHARS = 1500;

/** Keeps the answer within a limit, so the model has enough to be right but not so much that the reply gets slow. */
export function trimOutput(
  o: { answer?: string; results: SearchResult[] },
  limits = { maxResults: MAX_RESULTS, maxChars: MAX_CHARS, snippetMax: 300, answerMax: 600 },
): { answer?: string; results: SearchResult[] } {
  const answer = o.answer ? clip(o.answer, limits.answerMax) : undefined;
  let budget = limits.maxChars - (answer?.length ?? 0);
  const results: SearchResult[] = [];
  for (const r of o.results.slice(0, limits.maxResults)) {
    const snippet = clip(r.snippet, Math.min(limits.snippetMax, Math.max(0, budget - r.title.length)));
    budget -= r.title.length + snippet.length;
    if (budget < 0 && results.length) break;
    results.push({ ...r, title: clip(r.title, 170), snippet });
  }
  return { answer, results };
}
