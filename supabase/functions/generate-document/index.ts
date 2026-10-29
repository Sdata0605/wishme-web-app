/**
 * generate-document — writes the CONTENT of a document the user asked the assistant for.
 *
 * It deliberately does not produce the file. Turning content into a PDF, spreadsheet or Word
 * document happens on the phone, where the rendering libraries already exist and the result can be
 * shared and saved without a round trip. This function's job is the writing: give it a topic, get
 * back a structured document.
 *
 * Body: { topic, kind?, title?, audience?, length?, language? }
 * Returns: { title, kind, sections[] | sheet, wordCount }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { loadKey } from '../_shared/vobiz.ts';
import { pickModels } from '../_shared/geminiModels.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Documents that are prose, and documents that are a grid of numbers, need different writing. */
type Kind = 'report' | 'letter' | 'notes' | 'plan' | 'spreadsheet';
const KINDS: Kind[] = ['report', 'letter', 'notes', 'plan', 'spreadsheet'];

const clean = (v: unknown, max: number) =>
  String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const LENGTHS: Record<string, string> = {
  short: 'about 300 words in total — 3 or 4 short sections',
  medium: 'about 800 words in total — 5 or 6 sections',
  long: 'about 1800 words in total — 8 to 10 sections, with real depth in each',
};

/** Prose documents: a title and ordered sections of markdown. */
const PROSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          // Markdown, so the phone can render the same content as a PDF or a Word file.
          body: { type: 'string', description: 'Markdown. Paragraphs, - bullets, and **bold** only. No tables, no images, no code fences.' },
        },
        required: ['heading', 'body'],
      },
    },
  },
  required: ['title', 'sections'],
};

/** Spreadsheets: a header row and data rows, which is all a sheet really is. */
const SHEET_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    sheet: {
      type: 'object',
      properties: {
        columns: { type: 'array', items: { type: 'string' } },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
        notes: { type: 'string', description: 'One short line explaining the figures, if any need it.' },
      },
      required: ['columns', 'rows'],
    },
  },
  required: ['title', 'sheet'],
};

function instructions(kind: Kind, topic: string, audience: string, length: string, language: string) {
  const shared = `Write in ${language}. Be accurate and concrete. Never invent statistics, prices, dates or quotations — if a figure is genuinely needed and you do not know it, describe what it depends on instead of inventing a number. Do not pad, and do not write a preamble about what you are about to write.`;

  if (kind === 'spreadsheet') {
    return `Build a spreadsheet about: ${topic}
${audience ? `It is for: ${audience}.` : ''}
Choose columns that genuinely suit the subject, and fill in rows that are useful to someone working with it. Keep every cell short — a value or a few words, never a paragraph. Put any explanation in notes.
${shared}`;
  }

  const shape: Record<Exclude<Kind, 'spreadsheet'>, string> = {
    report: 'a clear report: an opening that states what this is about, then sections that each make a point and support it, then a short conclusion',
    letter: 'a letter: a greeting, the body in a few short paragraphs, and a sign-off. Use sections for the paragraphs and keep headings empty strings.',
    notes: 'tidy notes: short sections, mostly bullet points, easy to skim',
    plan: 'a practical plan: the goal, the steps in order, what is needed, and the risks',
  };

  return `Write ${shape[kind]} on: ${topic}
${audience ? `It is for: ${audience}.` : ''}
Length: ${LENGTHS[length] ?? LENGTHS.medium}.
${shared}`;
}


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Asks the model, riding out the failures that fix themselves. "High demand" (503) and rate limits
 * are the usual ones and they clear in seconds, so giving up on the first try — which is what this
 * did before — made a working service look broken.
 */
async function askModel(body: string, apiKey: string): Promise<{ res: Response | null; outOfCredit: boolean }> {
  let outOfCredit = false;
  const models = await pickModels(apiKey, Deno.env.get('GEMINI_DOC_MODEL') || Deno.env.get('GEMINI_TEXT_MODEL'));

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(90_000),
        });
      } catch (e) {
        console.error(`[generate-document] ${model} attempt ${attempt} failed:`, e instanceof Error ? e.message : e);
        await sleep(attempt * 1200);
        continue;
      }

      if (res.ok) return { res, outOfCredit: false };

      const detail = (await res.text()).slice(0, 300);
      console.error(`[generate-document] ${model} attempt ${attempt}: HTTP ${res.status} ${detail}`);

      // Only the account owner can fix this one, so stop and say so.
      if (detail.includes('credits') || detail.includes('billing')) {
        outOfCredit = true;
        break;
      }
      // Anything else that is not a busy signal will not improve by asking again.
      if (![429, 500, 502, 503].includes(res.status)) break;
      await sleep(attempt * 1200);
    }
    if (outOfCredit) break;
  }

  return { res: null, outOfCredit };
}

/** The admin panel's saved OpenAI key (the one web search uses) wins; the server secret is the fallback. */
async function loadOpenAIKey(): Promise<string> {
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data } = await db.rpc('ai_secret_get', { p_name: 'ai_openai_api_key' });
    if (typeof data === 'string' && data) return data;
  } catch { /* fall back to the server secret */ }
  return Deno.env.get('OPENAI_API_KEY') ?? '';
}

/** OpenAI is told the JSON shape in words, so the same code serves prose documents and spreadsheets. */
const SHAPE_HINT = {
  prose: 'Reply with only a JSON object: {"title": string, "subtitle": string, "sections": [{"heading": string, "body": string}]}. "body" is markdown limited to paragraphs, "- " bullets and **bold**.',
  sheet: 'Reply with only a JSON object: {"title": string, "sheet": {"columns": [string], "rows": [[string]], "notes": string}}. Every row has one string per column.',
};

/** Returns the parsed document, or null when OpenAI cannot write it right now (the caller then falls back to Gemini). */
async function askOpenAI(prompt: string, kind: Kind, length: string, apiKey: string): Promise<Record<string, unknown> | null> {
  const model = Deno.env.get('OPENAI_DOC_MODEL') || 'gpt-4.1-mini';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.6,
          max_tokens: length === 'long' ? 8192 : 4096,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: kind === 'spreadsheet' ? SHAPE_HINT.sheet : SHAPE_HINT.prose },
            { role: 'user', content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        console.error(`[generate-document] openai ${model} attempt ${attempt}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
        if (![429, 500, 502, 503].includes(res.status)) return null;
        await sleep(attempt * 1200);
        continue;
      }
      const raw = (await res.json()).choices?.[0]?.message?.content;
      const doc = JSON.parse(raw ?? '');
      const usable = kind === 'spreadsheet'
        ? Array.isArray(doc?.sheet?.columns) && Array.isArray(doc?.sheet?.rows)
        : Array.isArray(doc?.sections) && doc.sections.length > 0;
      if (usable) return doc;
      console.error('[generate-document] openai returned an unusable shape');
    } catch (e) {
      console.error(`[generate-document] openai attempt ${attempt} failed:`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const topic = clean(body.topic, 1000);
    if (topic.length < 3) return json({ error: 'Please say what the document should be about.' }, 400);

    const kind: Kind = KINDS.includes(body.kind) ? body.kind : 'report';
    const audience = clean(body.audience, 200);
    const length = ['short', 'medium', 'long'].includes(body.length) ? body.length : 'medium';
    const language = clean(body.language, 40) || 'English';

    // OpenAI writes the document; Gemini (the assistant) only asks for it. Gemini writes it only if OpenAI is unavailable.
    const prompt = instructions(kind, topic, audience, length, language);
    const openaiKey = await loadOpenAIKey();
    if (openaiKey) {
      const written = await askOpenAI(prompt, kind, length, openaiKey);
      if (written) {
        const title = clean(body.title, 150) || clean(written.title, 150) || topic.slice(0, 80);
        const words = JSON.stringify(written).split(/\s+/).length;
        console.log(JSON.stringify({ fn: 'generate-document', engine: 'openai', kind, words }));
        return json({ ok: true, kind, title, subtitle: clean(written.subtitle, 200) || null, sections: written.sections ?? null, sheet: written.sheet ?? null, wordCount: words });
      }
    }

    const apiKey = await loadKey('gemini');
    if (!apiKey && !openaiKey) return json({ error: 'Document writing is not set up yet.' }, 503);
    if (!apiKey) return json({ error: 'The writing service is busy at the moment. Please try again in a minute.' }, 503);
    console.error('[generate-document] falling back to Gemini');

    const request = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        // Asking for JSON back means the phone never has to parse prose to find the headings.
        responseMimeType: 'application/json',
        responseSchema: kind === 'spreadsheet' ? SHEET_SCHEMA : PROSE_SCHEMA,
        maxOutputTokens: length === 'long' ? 8192 : 4096,
      },
    });

    const { res, outOfCredit } = await askModel(request, apiKey);
    if (!res) {
      return outOfCredit
        ? json({ error: 'The writing service is out of credit. Please top it up and try again.' }, 503)
        : json({ error: 'The writing service is busy at the moment. Please try again in a minute.' }, 503);
    }

    const payload = await res.json();
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return json({ error: 'The document came back empty. Please try again.' }, 502);

    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(raw);
    } catch {
      return json({ error: 'The document could not be read back. Please try again.' }, 502);
    }

    const title = clean(body.title, 150) || clean(doc.title, 150) || topic.slice(0, 80);
    const words = JSON.stringify(doc).split(/\s+/).length;

    return json({ ok: true, kind, title, subtitle: clean(doc.subtitle, 200) || null, sections: doc.sections ?? null, sheet: doc.sheet ?? null, wordCount: words });
  } catch (e) {
    console.error('[generate-document] failed:', e);
    return json({ error: 'Something went wrong writing the document.' }, 500);
  }
});
