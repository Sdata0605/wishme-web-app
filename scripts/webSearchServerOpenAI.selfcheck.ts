/**
 * Runs the REAL `web-search` request handler under Node (a fake login service, a fake Deno, a pretend OpenAI and a
 * pretend Tavily) to check the OpenAI-first search a phone would get:
 *   - OpenAI answers first, its text and sources reach the model, nothing leaks a web address
 *   - repeats are remembered; an answer that found nothing gets one wider second try
 *   - a refused key, a used-up account, a timeout and the daily limit all end with Tavily (or the keyless sources) answering
 *
 *   node --experimental-strip-types scripts/webSearchServerOpenAI.selfcheck.ts
 */

import { register } from 'node:module';

const fakeSupabase = `
  export function createClient() {
    return {
      auth: { getUser: async (token) => token.startsWith('user-')
        ? { data: { user: { id: token, role: 'authenticated' } }, error: null }
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
const env: Record<string, string> = {
  SUPABASE_URL: 'https://example.invalid',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  OPENAI_API_KEY: 'sk-simulated',
  TAVILY_API_KEY: 'tvly-simulated',
};
let handler!: (req: Request) => Promise<Response>;
g.Deno = { env: { get: (k: string) => env[k] }, serve: (h: any) => void (handler = h) };

// ─── Pretend OpenAI and Tavily ───────────────────────────────────────────────
type OpenAIMode = 'ok' | 'notfound-then-ok' | 'notfound' | 'auth' | 'quota' | 'timeout';
const oa = { mode: 'ok' as OpenAIMode, calls: 0, thorough: [] as boolean[], inputs: [] as string[] };
const tv = { calls: 0 };

const messageReply = (text: string, urls: string[] = ['https://www.ndtv.com/a', 'https://www.hindustantimes.com/b']) => ({
  output: [
    { type: 'web_search_call', status: 'completed' },
    { type: 'message', content: [{ type: 'output_text', text, annotations: urls.map((url) => ({ type: 'url_citation', url, title: 't' })) }] },
  ],
});
const FOUND = 'As of 17 October 2026, the subject did something notable. ([ndtv.com](https://www.ndtv.com/a?utm_source=openai)) Hindustan Times adds a second detail dated 16 October.';
const NOTHING = "I couldn't find any reliable recent information about this subject.";

const realFetch = g.fetch;
g.fetch = async (url: any, init?: any) => {
  const u = String(url);
  if (u.includes('api.openai.com/v1/responses')) {
    oa.calls++;
    const body = JSON.parse(init.body);
    oa.inputs.push(body.input);
    // "thorough" is what the second, wider try asks for: the longer instruction and the bigger search context.
    const thorough = body.tools?.[0]?.search_context_size === 'high';
    oa.thorough.push(thorough);
    if (oa.mode === 'auth') return new Response(JSON.stringify({ error: { code: 'invalid_api_key' } }), { status: 401 });
    if (oa.mode === 'quota') return new Response(JSON.stringify({ error: { code: 'insufficient_quota' } }), { status: 429 });
    if (oa.mode === 'timeout') throw new DOMException('timed out', 'TimeoutError');
    if (oa.mode === 'notfound') return new Response(JSON.stringify(messageReply(NOTHING, [])), { status: 200 });
    if (oa.mode === 'notfound-then-ok') return new Response(JSON.stringify(messageReply(thorough ? FOUND : NOTHING, thorough ? undefined : [])), { status: 200 });
    return new Response(JSON.stringify(messageReply(FOUND)), { status: 200 });
  }
  if (u.includes('api.tavily.com')) {
    tv.calls++;
    const q = JSON.parse(init.body).query;
    return new Response(
      JSON.stringify({ answer: `Summary for ${q}`, usage: { credits: 1 }, results: [{ title: `${q} one`, url: 'https://www.bbc.com/news/a', content: `About ${q}: a source.`, score: 0.9, published_date: null }] }),
      { status: 200 },
    );
  }
  if (u.includes('open-meteo') || u.includes('wikipedia') || u.includes('bing.com') || u.includes('news.google')) return new Response('', { status: 503 });
  return realFetch(url, init);
};

// A new copy of the function (its caches, limits and "OpenAI is off" memory start empty).
let n = 0;
async function fresh() {
  await import(new URL(`../supabase/functions/web-search/index.ts?copy=${++n}`, import.meta.url).href);
  oa.calls = 0; tv.calls = 0; oa.thorough = []; oa.inputs = [];
}
const post = async (body: unknown, token = 'user-1') => {
  const res = await handler(new Request('https://x.invalid/functions/v1/web-search', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }));
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
};

let checks = 0;
function check(name: string, ok: boolean, detail?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${name}${detail === undefined ? '' : `\n  got: ${JSON.stringify(detail).slice(0, 900)}`}`);
}

// ─── OpenAI answers first ────────────────────────────────────────────────────
await fresh();
const one = await post({ queries: ['Dhruv Rathee'], recency: 'week' });
check('OpenAI answers: ok, provider openai, no Tavily call', one.status === 200 && one.json.ok === true && one.json.provider === 'openai' && tv.calls === 0 && oa.calls === 1, one.json);
check('the model gets the written answer and the outlets', /As of 17 October 2026/.test(one.json.results) && /Sources: NDTV, Hindustan Times\./.test(one.json.results), one.json.results);
check('no web address or citation junk reaches the model', !/https?:|www\.|utm_|\]\(/.test(one.json.results), one.json.results);
check('it costs no Tavily credits and says so', one.json.credits === 0 && one.json.cached === false);
check('the question goes to OpenAI as asked', oa.inputs[0] === 'Latest on: Dhruv Rathee', oa.inputs);
check('a normal search is not the wide kind', oa.thorough[0] === false);

const again = await post({ queries: ['dhruv rathee'], recency: 'week' });
check('the same search again is remembered (no second OpenAI call)', again.json.cached === true && oa.calls === 1, { cached: again.json.cached, calls: oa.calls });

const refine = await post({ queries: ['Dhruv Rathee'], recency: 'week', depth: 'advanced' });
check('a model that is digging deeper (advanced) gets a fresh, wide search', refine.json.ok === true && oa.calls === 2 && oa.thorough[1] === true, { calls: oa.calls, thorough: oa.thorough });

const three = await post({ queries: ['India top news', 'world news', 'business news India'], recency: 'day' });
check('three searches: three OpenAI calls, each labelled', three.json.ok === true && oa.calls === 5 && /Search "India top news":/.test(three.json.results) && /Search "business news India":/.test(three.json.results), { calls: oa.calls, text: three.json.results });
check('the older request shape works too', (await post({ query: 'Chief Minister of Karnataka', kind: 'general' })).json.provider === 'openai');

// ─── An answer that found nothing gets one wider try ─────────────────────────
await fresh();
oa.mode = 'notfound-then-ok';
const retry = await post({ queries: ['Hari Raj Shetty'], recency: 'any' });
check('found nothing at first: a second, wider try follows and its answer is used', retry.json.ok === true && oa.calls === 2 && oa.thorough.join() === 'false,true' && /As of 17 October 2026/.test(retry.json.results) && !retry.json.instruction, { calls: oa.calls, thorough: oa.thorough, json: retry.json });

await fresh();
oa.mode = 'notfound';
const none = await post({ queries: ['Hari Raj Shetty'], recency: 'any' });
check('still nothing after the wider try: the model is told so, and not to guess', none.json.ok === true && oa.calls === 2 && /could not find|couldn.t find/i.test(none.json.results) && /Do not guess/.test(none.json.instruction), { calls: oa.calls, json: none.json });
check('and Tavily is not asked on top', tv.calls === 0, tv.calls);

// ─── When OpenAI cannot answer, the search still does ────────────────────────
await fresh();
oa.mode = 'auth';
const refused = await post({ queries: ['refused key question'], recency: 'any' });
check('key refused: Tavily answers instead', refused.json.ok === true && refused.json.provider === 'tavily' && oa.calls === 1 && tv.calls === 1, { provider: refused.json.provider, oa: oa.calls, tv: tv.calls });
await post({ queries: ['second question after the refusal'], recency: 'any' });
check('and OpenAI is left alone for a while', oa.calls === 1, oa.calls);

await fresh();
oa.mode = 'quota';
const broke = await post({ queries: ['out of credit question'], recency: 'any' });
check('account out of credit: Tavily answers instead', broke.json.ok === true && broke.json.provider === 'tavily', broke.json);
await post({ queries: ['another out of credit question'], recency: 'any' });
check('and OpenAI is not tried again for an hour', oa.calls === 1, oa.calls);

await fresh();
oa.mode = 'timeout';
const slow = await post({ queries: ['timeout question'], recency: 'any' });
check('OpenAI too slow: Tavily answers instead', slow.json.ok === true && slow.json.provider === 'tavily', slow.json);

// ─── Cost control: a daily number of OpenAI searches per person ───────────────
await fresh();
oa.mode = 'ok';
// The per-minute guard (30 searches) would stop a quick loop before the daily one, so the clock is moved on a minute at a time.
const realNow = Date.now.bind(Date);
let skew = 0;
Date.now = () => realNow() + skew;
const served: string[] = [];
for (let i = 0; i < 46; i++) {
  if (i % 20 === 0) skew += 61_000;
  const r = await post({ queries: [`daily limit subject number ${i}`], recency: 'any' }, 'user-limit');
  served.push(r.json?.provider ?? `status ${r.status}`);
}
Date.now = realNow;
check('the first 40 searches of a person are answered by OpenAI', served.slice(0, 40).every((p) => p === 'openai'), served);
check('after 40 in a day, Tavily answers instead', served.slice(40).every((p) => p === 'tavily'), served.slice(40));
check('and OpenAI was not asked past the limit', oa.calls === 40, oa.calls);

console.log(`${checks} checks passed (simulated OpenAI and Tavily)`);
