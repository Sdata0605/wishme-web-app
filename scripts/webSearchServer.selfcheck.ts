/**
 * Runs the REAL `web-search` request handler (supabase/functions/web-search/index.ts) under Node with a fake login service
 * and a fake Deno, to check what a phone would actually get back:
 *   - login, warm-up, empty queries, the per-user limits
 *   - one search, three searches, the older request shape, caching
 *   - weather answered without Tavily, and every failure path (key refused, plan limit, outage) ending in an answer
 * With TAVILY_API_KEY set the Tavily calls are real (a handful of credits); without it they are simulated.
 *
 *   node --experimental-strip-types scripts/webSearchServer.selfcheck.ts
 *   TAVILY_API_KEY=tvly-... node --experimental-strip-types scripts/webSearchServer.selfcheck.ts
 */

import { register } from 'node:module';

// "npm:@supabase/supabase-js@2" does not exist for Node: answer it with a login service that knows one user.
const fakeSupabase = `
  export function createClient() {
    return {
      auth: { getUser: async (token) => token === 'good-token'
        ? { data: { user: { id: 'user-1', role: 'authenticated' } }, error: null }
        : token === 'other-token' ? { data: { user: { id: 'user-2', role: 'authenticated' } }, error: null }
        : { data: { user: null }, error: new Error('bad token') } },
      rpc: async () => ({ data: null }),
    };
  }`;
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith('npm:@supabase/supabase-js')) return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(fakeSupabase)}), shortCircuit: true };
    return next(specifier, context);
  }`));

const g = globalThis as Record<string, any>;
const realKey = process.env.TAVILY_API_KEY ?? '';
const env: Record<string, string> = { SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', TAVILY_API_KEY: realKey || 'simulated-key' };
let handler: (req: Request) => Promise<Response>;
g.Deno = { env: { get: (k: string) => env[k] }, serve: (h: any) => void (handler = h) };

// Tavily: real when a key was given, otherwise a pretend service. `tavily` lets a check make it fail.
const realFetch = g.fetch;
const tavily = { mode: 'real' as 'real' | 'ok' | 'quota' | 'auth' | 'down', calls: 0 };
const fakeAnswer = (q: string, topic: string) => ({
  answer: `Summary for ${q}`,
  usage: { credits: 1 },
  results: [
    { title: `${q} one`, url: 'https://www.bbc.com/news/a', content: `About ${q}: the first source says something specific.`, score: 0.9, published_date: topic === 'news' ? new Date().toUTCString() : null },
    { title: `${q} two`, url: 'https://www.thehindu.com/b', content: `About ${q}: the second source agrees.`, score: 0.8, published_date: topic === 'news' ? new Date().toUTCString() : null },
  ],
});
g.fetch = async (url: any, init?: any) => {
  if (String(url).includes('api.tavily.com')) {
    tavily.calls++;
    const body = JSON.parse(init.body);
    if (tavily.mode === 'quota') return new Response('{}', { status: 432 });
    if (tavily.mode === 'auth') return new Response('{}', { status: 401 });
    if (tavily.mode === 'down') throw new DOMException('timed out', 'TimeoutError');
    if (tavily.mode === 'ok' || !realKey) return new Response(JSON.stringify(fakeAnswer(body.query, body.topic)), { status: 200 });
  }
  return realFetch(url, init);
};
tavily.mode = realKey ? 'real' : 'ok';

await import(new URL('../supabase/functions/web-search/index.ts', import.meta.url).href);

let checks = 0;
function check(name: string, ok: boolean, detail?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${name}${detail === undefined ? '' : `\n  got: ${JSON.stringify(detail).slice(0, 900)}`}`);
}
const post = async (body: unknown, token: string | null = 'good-token') => {
  const res = await handler(new Request('https://x.invalid/functions/v1/web-search', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
};

// ─── Who may call ────────────────────────────────────────────────────────────
check('no login: 401', (await post({ queries: ['x y'] }, null)).status === 401);
check('a bad token: 401', (await post({ queries: ['x y'] }, 'nope')).status === 401);
check('warm-up answers 204 without a login', (await post({ warm: true }, null)).status === 204);
check('no query: 400', (await post({ queries: [] })).status === 400);
check('GET is refused', (await handler(new Request('https://x.invalid/', { method: 'GET' }))).status === 405);

// ─── One search ──────────────────────────────────────────────────────────────
const one = await post({ queries: ['Balasaheb Thorat'], recency: 'any' });
check('a search answers 200 with text for the model', one.status === 200 && one.json.ok === true && typeof one.json.results === 'string' && one.json.results.startsWith('Searched '), one.json);
check('the answer names its sources and has no web address', /\d\. [A-Za-z]/.test(one.json.results) && !/https?:|www\./.test(one.json.results), one.json.results);
check('it says which source and what it cost', one.json.provider === 'tavily' && one.json.credits === 1 && one.json.cached === false, one.json);
const callsBefore = tavily.calls;
const cached = await post({ queries: ['balasaheb thorat'], recency: 'any' });
check('the same search again is remembered (no second Tavily call)', cached.json.cached === true && tavily.calls === callsBefore, { cached: cached.json.cached, calls: tavily.calls - callsBefore });

// ─── Freshness costs two searches; three queries cost three ──────────────────
const c0 = tavily.calls;
const day = await post({ queries: ['gold rate Mumbai'], recency: 'day' });
check('"today" runs two Tavily searches side by side (news and general)', day.json.ok === true && tavily.calls - c0 === 2 && day.json.credits === 2, { calls: tavily.calls - c0, credits: day.json.credits });
const c1 = tavily.calls;
const multi = await post({ queries: ['India top news', 'world news', 'business news India'], recency: 'day' });
check('three searches for today answer in one call, each labelled', multi.json.ok === true && /Search "India top news":/.test(multi.json.results) && /Search "business news India":/.test(multi.json.results), multi.json.results);
check('and run in parallel (6 Tavily calls, 6 credits)', tavily.calls - c1 === 6 && multi.json.credits === 6, { calls: tavily.calls - c1, credits: multi.json.credits });

// ─── The older app shape still works ─────────────────────────────────────────
const old = await post({ query: 'Chief Minister of Karnataka', kind: 'general' });
check('{query, kind} from an older app build', old.status === 200 && old.json.ok === true);
const oldNews = await post({ query: 'Karnataka government', kind: 'news' });
check('kind news means the last week', oldNews.json.ok === true);

// ─── Weather needs no credits ────────────────────────────────────────────────
const c2 = tavily.calls;
const wx = await post({ queries: ['weather in Pune'], recency: 'day' });
check('weather is answered from Open-Meteo with no Tavily call', wx.json.ok === true && wx.json.provider === 'open-meteo' && wx.json.credits === 0 && tavily.calls === c2 && /Now in Pune/.test(wx.json.results), wx.json);

// ─── Nothing found is not the same as being offline ──────────────────────────
const realTavilyMode = tavily.mode;
const fetchBefore = g.fetch;
g.fetch = async (url: any, init?: any) => {
  if (String(url).includes('api.tavily.com')) {
    tavily.calls++;
    return new Response(JSON.stringify({ results: [], usage: { credits: 1 } }), { status: 200 });
  }
  return realFetch(url, init);
};
const none = await post({ queries: ['Zxqvbn Prathamesh Wadkarrr MLA'], recency: 'any' });
check('sources answered but found nothing: ok, a plain "nothing relevant" and an instruction not to guess', none.json.ok === true && /Nothing relevant found for "Zxqvbn/.test(none.json.results) && /Do not guess/.test(none.json.instruction), none.json);
g.fetch = fetchBefore;
void realTavilyMode;

// ─── When Tavily cannot answer, the assistant still gets an answer ───────────
tavily.mode = 'auth';
const refused = await post({ queries: ['fallback check refused key'], recency: 'any' });
check('key refused: the keyless sources answer instead', refused.json.ok === true && refused.json.provider === 'keyless', refused.json);
const c3 = tavily.calls;
await post({ queries: ['fallback check second question'], recency: 'any' });
check('and Tavily is left alone for a while (no more calls)', tavily.calls === c3);

tavily.mode = 'quota';
const other = await post({ queries: ['quota check question'], recency: 'any' }, 'other-token');
check('plan limit reached: still an answer from the keyless sources', other.json.ok === true && other.json.provider === 'keyless', other.json);

// ─── Really offline: nothing answers at all ───────────────────────────────────
g.fetch = async () => new Response('', { status: 503 });
const offline = await post({ queries: ['offline check question'], recency: 'any' }, 'other-token');
check('nothing reachable: ok false and an instruction to say so and answer from knowledge', offline.json.ok === false && /couldn't reach the internet/.test(offline.json.instruction), offline.json);

// ─── Limits ──────────────────────────────────────────────────────────────────
g.fetch = async (url: any, init?: any) => (String(url).includes('api.tavily.com') ? new Response(JSON.stringify(fakeAnswer('x', 'general')), { status: 200 }) : new Response('', { status: 503 }));
let limited = 0;
for (let i = 0; i < 40; i++) {
  const r = await post({ queries: [`limit check ${i} alpha`, `limit check ${i} beta`] }, 'good-token');
  if (r.status === 429) {
    limited++;
    check('the limit answer tells the model what to do', /answer from what you know/.test(r.json.instruction), r.json);
  }
}
check('a runaway loop is stopped (30 searches a minute)', limited > 0, limited);

console.log(`${checks} checks passed${realKey ? ' (live Tavily)' : ' (simulated Tavily)'}`);
