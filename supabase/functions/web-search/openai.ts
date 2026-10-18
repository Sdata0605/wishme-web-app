/**
 * OpenAI as the assistant's research step.
 *
 * OpenAI's Responses API has a built-in web search: the model reads the live web (news sites, official pages,
 * Wikipedia, regional outlets, YouTube and so on, not only Google-ranked pages) and writes a short answer with the
 * outlets it used. That answer is what the voice model (Gemini or Sarvam) reads out, so OpenAI is the "middle man":
 * it searches, the voice model speaks.
 *
 * This file holds the request, the failure handling, and two pure functions (`readAnswer`, `formatOpenAI`) that are
 * checked offline in scripts/webSearchOpenAI.selfcheck.ts. A failure here never ends a search: web-search/index.ts
 * falls back to Tavily and then to the keyless sources.
 */

import { clip } from './providers.ts';
import { nowLabel, sourceName, type Recency } from './tavily.ts';

export type OpenAIOutcome =
  | { ok: true; text: string; sources: string[]; searches: number; ms: number; model: string }
  | { ok: false; code: 'quota' | 'auth' | 'rate' | 'timeout' | 'error'; status?: number; ms: number };

/**
 * Fast enough for a spoken answer (3-5 s) and about a fifth of the price of gpt-4.1. Tested on 2026-10-18 with four people:
 * gpt-4.1-mini found every dated item gpt-4.1 did and caught one gpt-4.1 missed (Balasaheb Thorat, 13 Oct); gpt-4o-mini stopped
 * after one search; gpt-5 searched seven times but took 50 s.
 */
export const DEFAULT_MODEL = 'gpt-4.1-mini';

const IST_MS = 5.5 * 3_600_000;
const todayIso = (now: number) => new Date(now + IST_MS).toISOString().slice(0, 10);

const FRESHNESS: Record<Recency, string> = {
  day: 'The user needs what happened in the last 24 hours. Prefer pages from today and yesterday, and say if nothing that recent exists.',
  week: 'The user needs the last week. Prefer pages from the last 7 days, and say if nothing that recent exists.',
  month: 'The user needs the last few weeks. Prefer pages from the last month.',
  any: 'Freshness is not critical, but for anything that changes (a post, a score, a price) use the newest source you can find.',
};

/** What the search model is told. It is the research step of a voice assistant, so it answers in speakable sentences. */
function instructionsFor(recency: Recency, now: number, thorough: boolean): string {
  return [
    `You are the research step of a voice assistant. Today is ${todayIso(now)} (India). Find the latest, correct information with web search.`,
    'Use ANY source you can: news sites, official pages, social media posts, Wikipedia, regional-language outlets, YouTube. Do not limit yourself to what a search engine ranks first.',
    thorough
      ? 'The first attempt did not find it. Search again now: other spellings of the name, the full name, the profession, local-language names, other sites, the person\'s own accounts. Keep looking until you have it or are sure it is not on the web.'
      : 'If the first search does not find it, search again with other spellings, names or sites before you give up.',
    FRESHNESS[recency],
    'Answer in 3 to 6 short sentences a person could say out loud. No headings, bullets, markdown, links or emoji.',
    'For every fact that can change, give its date ("as of 14 October 2026"). Name the outlet for each key point ("Hindustan Times reports..."). If sources disagree, say so and give the newest or most authoritative figure.',
    'If the name could mean more than one person, say which one you found and why. If you could not confirm something, say exactly what. Never guess, never invent.',
  ].join(' ');
}

async function call(key: string, body: Record<string, unknown>, timeoutMs: number): Promise<{ status: number; json: any; ms: number } | { error: 'timeout' | 'error'; ms: number }> {
  const started = Date.now();
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json, ms: Date.now() - started };
  } catch (e) {
    const timedOut = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { error: timedOut ? 'timeout' : 'error', ms: Date.now() - started };
  }
}

/** Pulls the written answer, the outlets it cited and the number of searches it ran out of a Responses API reply. */
export function readAnswer(j: any): { text: string; sources: string[]; searches: number } {
  const output: any[] = Array.isArray(j?.output) ? j.output : [];
  const message = output.find((o) => o?.type === 'message');
  const parts: any[] = Array.isArray(message?.content) ? message.content : [];
  const text = parts.filter((c) => c?.type === 'output_text').map((c) => String(c.text ?? '')).join('\n').trim();
  const sources: string[] = [];
  for (const c of parts) {
    for (const a of c?.annotations ?? []) {
      if (a?.type !== 'url_citation' || !a.url) continue;
      const name = sourceName(String(a.url));
      if (name && !sources.includes(name)) sources.push(name);
    }
  }
  return { text, sources, searches: output.filter((o) => o?.type === 'web_search_call').length };
}

/** True when the answer says it found nothing about the subject (so one more, wider try is worth it). */
export function looksNotFound(text: string): boolean {
  const head = text.slice(0, 320);
  return /\b(unable to find|couldn['’]?t find|could not find|can['’]?t find|cannot find|did not find|didn['’]?t find|not able to find|no (recent|credible|verified|reliable|relevant|specific|publicly|public|information|news|results?|updates?)\b|nothing (recent|relevant)|no individual|doesn['’]?t appear|does not appear)/i.test(head);
}

export interface OpenAIOptions {
  recency: Recency;
  /** The model is digging deeper than last time: bigger context, and told to try other spellings and sites. */
  thorough: boolean;
  model?: string;
  now?: number;
}

/** One search through OpenAI. Failures are described, never thrown. */
export async function openaiSearch(key: string, query: string, opts: OpenAIOptions, timeoutMs: number): Promise<OpenAIOutcome> {
  const now = opts.now ?? Date.now();
  const model = opts.model || DEFAULT_MODEL;
  const r = await call(
    key,
    {
      model,
      instructions: instructionsFor(opts.recency, now, opts.thorough),
      input: `Latest on: ${query}`,
      tools: [{ type: 'web_search', search_context_size: opts.thorough ? 'high' : 'medium', user_location: { type: 'approximate', country: 'IN' } }],
      tool_choice: 'required',
      max_output_tokens: 700,
      store: false,
    },
    timeoutMs,
  );
  if ('error' in r) return { ok: false, code: r.error, ms: r.ms };
  if (r.status >= 400) {
    const errCode = String(r.json?.error?.code ?? r.json?.error?.type ?? '');
    const code =
      r.status === 401 || r.status === 403 ? 'auth'
      : errCode === 'insufficient_quota' || r.status === 402 ? 'quota'
      : r.status === 429 ? 'rate'
      : 'error';
    return { ok: false, code, status: r.status, ms: r.ms };
  }
  const a = readAnswer(r.json);
  if (!a.text) return { ok: false, code: 'error', status: r.status, ms: r.ms };
  return { ok: true, text: a.text, sources: a.sources, searches: a.searches, ms: r.ms, model };
}

// ─── Telling the voice model what was found ──────────────────────────────────

/** Citations and markup out, plain sentences left. */
export function tidyAnswer(s: string): string {
  return s
    .replace(/\(\s*\[[^\]]*\]\([^)]*\)\s*\)/g, '') // "([site.com](https://...))" citations
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*_`>|]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

export interface OpenAISet {
  query: string;
  recency: Recency;
  /** Null when the search found nothing or failed. */
  answer: { text: string; sources: string[] } | null;
}

/**
 * The text the voice model reads: when the search was made, then for each search the written answer and the outlets it
 * came from. Each search gets its own share of the room so a long first answer cannot push the last one out.
 */
export function formatOpenAI(sets: OpenAISet[], now: number): string {
  const single = sets.length === 1;
  const maxTotal = single ? 2400 : 3400;
  const header = `Searched ${nowLabel(now)}.`;
  const share = Math.floor((maxTotal - header.length) / sets.length);
  const sections = sets.map((set) => {
    const label = single ? [] : [`Search "${set.query}":`];
    if (!set.answer) return [...label, `Nothing relevant found for "${set.query}".`].join('\n');
    const sources = set.answer.sources.length ? `Sources: ${set.answer.sources.slice(0, 5).join(', ')}.` : '';
    const room = Math.max(200, share - sources.length - label.join('').length - 12);
    return [...label, clip(tidyAnswer(set.answer.text), room), sources].filter(Boolean).join('\n');
  });
  return [header, ...sections].join('\n');
}
