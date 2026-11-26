# AI Calling: Code, Settings and How It Works (Sarvam, Multi-Language)

This document contains the code of the AI calling functions as they are deployed to Supabase, with the settings and rules they depend on.

**Where the code came from.** The deployed `vobiz-call` and `ai-call-start` functions were downloaded from Supabase with the CLI (`supabase functions download`). They match the project's source files exactly, except that `bridge.ts` is a project file that the deployed bundle does not list separately; its contents are included from the project. Gemini code (`vobiz-call/gemini.ts`) is not used for calls now and is not included.

**Secrets are not in this document.** The Vobiz auth ID and token, the Sarvam key and the webhook signing secret are stored as server secrets. Only their names appear in the code.

---

## Key values at a glance

| Item | Value | Where it is set |
|---|---|---|
| Call engine | `sarvam` | `platform_settings.ai_call_engine` (read in `vobiz-call/index.ts`) |
| Sarvam speech-to-text | `saaras:v3-realtime`, `language_code=auto` | `vobiz-call/sarvam.ts` |
| Sarvam chat model | `sarvam-105b-conversations` (env `SARVAM_LLM_MODEL` overrides) | `vobiz-call/sarvam.ts` |
| Sarvam voice model | `bulbul:v3` (setting `ai_call_sarvam_model`) | `_shared/callVoice.ts` |
| Default voice speaker | `ritu` (female), `shubh` (male) for Indian languages | `vobiz-call/sarvam.ts`, `_shared/callVoice.ts` |
| Call length cap (server) | 380 s by default (env `AI_CALL_MAX_SECONDS`, at most 395 s) | `vobiz-call/index.ts` line 30 |
| Vobiz time limit sent with the call | 420 s | `ai-call-start/index.ts` line 146 |
| Wrap-up warning | 30 s before the cap, the AI is told to say goodbye | `vobiz-call/index.ts` line 32 |
| Ring timeout | 40 s | `_shared/vobiz.ts` |
| Price per completed call | setting `ai_call_price` (charged once, when the call completes and was not already priced) | `vobiz-call/index.ts` ~line 143 |
| Daily call limit | none (the `ai_call_daily_limit` setting is no longer read) | `ai-call-start/index.ts` line 71 |
| Repeat-call guard | same number called again too soon is refused | `ai-call-start/index.ts` header comment |
| Recording | on/off with `ai_call_record`; kept for `ai_call_recording_days` | `vobiz-call/index.ts` |
| Call token | HMAC-SHA256 of `ai-call:<callId>` with `AI_CALL_WEBHOOK_SECRET`, first 32 hex characters | `_shared/vobiz.ts` `callToken` |
| Tools the model may call | `report_outcome`, `end_call` | `_shared/callPrompt.ts` `CALL_TOOLS` |

**Things to check.** The Vobiz time limit (420 s) is longer than the server cap (380 s), so the server normally ends the call first. The daily call limit mentioned in older notes no longer exists. The price is read from `ai_call_price` at the moment the call completes.

---

## Language handling (summary)

1. Sarvam's speech-to-text returns a `language` label for each finished sentence (`transcript.final`). If it names an Indian language, that is used.
2. If not, the script of the text decides. Devanagari is split between Marathi and Hindi by the words used.
3. Romanised speech (Indian language in English letters) is judged by the chat model from its meaning (`judgeLanguage` in `sarvam.ts`).
4. Short English replies (under three words) keep the current language.
5. When the language changes, the voice connection is reopened with the matching `language_code`, and the system prompt is rebuilt with a line telling the model to reply only in that language and script.
6. Before a reply sentence is spoken, its script is checked; if it is Devanagari, the voice switches to match.

Full explanation: see `docs/sarvam-language-flow.md`.

---

## Code

### 1. Start a call: `ai-call-start/index.ts`

```typescript
/**
 * ai-call-start — the assistant phones someone on the logged-in user's behalf (through Vobiz).
 *
 * The app only calls this after the user has said "yes" out loud to a spoken confirmation that
 * named the person, the number and the reason. The AI tells the person it is an AI and that the
 * call is written down. The conversation itself, and the result (status, transcript, summary),
 * are handled by the vobiz-call function.
 *
 * Body: { name?, phone, purpose, details?, language?, confirmed: true }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  checkPhoneNumber,
  cleanName,
  cleanText,
  formatForSpeech,
  normaliseLanguage,
} from "../_shared/aiCall.ts";
import { callToken, placeVobizCall, vobizConfig } from "../_shared/vobiz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * There is no daily limit. The only guard left is against calling the SAME number over and over
 * in seconds, which protects the person being called from a runaway loop; it is short enough that
 * normal use and testing never notice it.
 */
const SAME_NUMBER_WINDOW_MS = 60_000;
const MAX_CALLS_PER_NUMBER_IN_WINDOW = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    // ── Who is asking ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Server configuration ───────────────────────────────────────────────
    const vobiz = vobizConfig();
    const webhookSecret = Deno.env.get("AI_CALL_WEBHOOK_SECRET");
    if (!vobiz || !webhookSecret) {
      console.error("[ai-call-start] missing configuration", { vobiz: !!vobiz, webhookSecret: !!webhookSecret });
      return json({ error: "AI calling is not set up yet." }, 503);
    }

    const { data: settingRows } = await db
      .from("platform_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["ai_call_enabled", "ai_call_price"]);
    const setting = (k: string, fallback: string) =>
      (settingRows?.find((s: { setting_key: string }) => s.setting_key === k)?.setting_value as string | undefined) ?? fallback;

    if (setting("ai_call_enabled", "true") === "false") return json({ error: "AI calls are switched off right now." }, 403);
    const price = Math.max(0, Number(setting("ai_call_price", "0")) || 0);
    // ai_call_daily_limit is deliberately not read any more: there is no cap on how many calls a
    // user may make. The admin switch (ai_call_enabled) and the wallet price still apply.

    // ── What was asked ─────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    if (body.confirmed !== true) {
      return json({ error: "The user must confirm the call first.", needsConfirmation: true }, 400);
    }

    const number = checkPhoneNumber(String(body.phone ?? ""));
    if (!number.ok) return json({ error: number.reason }, 400);

    const purpose = cleanText(body.purpose, 600);
    if (purpose.length < 5) return json({ error: "Please say what the call is for." }, 400);
    const details = cleanText(body.details, 800);
    const toName = cleanName(body.name);
    const language = normaliseLanguage(body.language);

    // The phone service places calls immediately; booking one for later is not supported yet.
    if (body.scheduleAt) {
      return json({ error: "I can't book a call for later yet. I can call them now instead." }, 400);
    }

    // ── Guards for the person being called ─────────────────────────────────
    const { data: priorCalls } = await db
      .from("ai_calls")
      .select("opted_out, created_at")
      .eq("to_phone", number.e164)
      .order("created_at", { ascending: false })
      .limit(20);
    if (priorCalls?.some((c: { opted_out: boolean }) => c.opted_out)) {
      return json({ error: "That person asked not to receive these calls, so the assistant can't call them." }, 403);
    }
    const recent = (priorCalls ?? []).filter((c: { created_at: string }) => Date.now() - new Date(c.created_at).getTime() < SAME_NUMBER_WINDOW_MS).length;
    if (recent >= MAX_CALLS_PER_NUMBER_IN_WINDOW) {
      return json({ error: "That number was called moments ago. Please wait a minute before trying again." }, 429);
    }

    const { data: profile } = await db.from("profiles").select("id, first_name, last_name, wallet_balance").eq("user_id", user.id).maybeSingle();
    if (!profile) return json({ error: "Profile not found." }, 404);
    if (price > 0 && (profile.wallet_balance ?? 0) < price) {
      return json({ error: `An AI call costs ₹${price}. Please add money to your wallet first.` }, 402);
    }
    const userName = cleanName(`${profile.first_name ?? ""} ${profile.last_name ?? ""}`) || "a WishMe customer";

    // ── Record it, then place the call ─────────────────────────────────────
    const { data: row, error: insertError } = await db
      .from("ai_calls")
      .insert({
        user_id: user.id,
        to_name: toName || null,
        to_phone: number.e164,
        purpose,
        details: details || null,
        language,
        status: "queued",
      })
      .select("id")
      .single();
    if (insertError || !row) {
      console.error("[ai-call-start] insert failed:", insertError);
      return json({ error: "Could not start the call." }, 500);
    }

    // Vobiz cannot log in, so the URLs it calls back carry a token tied to this call.
    const token = await callToken(row.id);
    const at = (action: string) => `${url}/functions/v1/vobiz-call/${action}?id=${row.id}&t=${token}`;

    try {
      const placed = await placeVobizCall(vobiz, {
        to: number.e164,
        answerUrl: at("answer"),
        ringUrl: at("ring"),
        hangupUrl: at("hangup"),
        // Vobiz's own ceiling: a little above ours, so our wind-up always happens first.
        timeLimitSeconds: 420,
      });
      // The column predates Vobiz; it holds whichever phone service placed the call.
      await db.from("ai_calls").update({ vapi_call_id: placed.id, updated_at: new Date().toISOString() }).eq("id", row.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[ai-call-start] could not place the call:", message);
      await db.from("ai_calls").update({ status: "failed", error_message: message.slice(0, 300), updated_at: new Date().toISOString() }).eq("id", row.id);
      return json({ error: "The phone service could not place the call. Please try again in a moment." }, 502);
    }

    return json({
      ok: true,
      callId: row.id,
      status: "queued",
      to: { name: toName || null, phone: number.e164, spoken: formatForSpeech(number.e164) },
      scheduledFor: null,
      price,
    });
  } catch (e) {
    console.error("[ai-call-start] failed:", e);
    return json({ error: "Something went wrong starting the call." }, 500);
  }
});

```

### 2. Vobiz webhooks, audio stream and call finish: `vobiz-call/index.ts`

```typescript
/**
 * vobiz-call — the phone side of an AI call. Vobiz talks to this function, never to the app.
 *
 *   POST /ring     the phone started ringing
 *   POST /answer   they picked up → we reply with XML that opens a two-way audio stream
 *   WS   /stream   the live conversation, bridged to whichever engine the admin selected
 *   POST /hangup   the call is over
 *
 * Vobiz cannot log in, so every URL carries a token derived from the call id and the server secret.
 * Results (status, transcript, summary, outcome) are written straight into `ai_calls`.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { CALL_SUMMARY_PROMPT, OUTCOMES, transcriptToText, type CallBrief, type TranscriptLine } from '../_shared/callPrompt.ts';
import { callToken, loadKey, vobizConfig, type Engine } from '../_shared/vobiz.ts';
import { chooseSarvamVoice } from '../_shared/callVoice.ts';
import { putPrivate } from '../_shared/b2.ts';
import { GeminiCallBridge } from './gemini.ts';
import { SarvamCallBridge } from './sarvam.ts';
import type { Bridge, InboundFormat } from './bridge.ts';

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
/**
 * No limit is imposed on how long a call may run — but Supabase stops a function after about
 * 400 seconds whatever we do, so the call is wound up just before that rather than being cut off
 * mid-sentence with no transcript. Raise AI_CALL_MAX_SECONDS only if the platform limit rises.
 */
const MAX_CALL_MS = Math.min(395, Number(Deno.env.get('AI_CALL_MAX_SECONDS')) || 380) * 1000;
/** Told to wrap up this long before the platform would cut us off. */
const WRAP_UP_MS = 30_000;

const db = (): SupabaseClient => createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const xml = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  });

interface CallRow {
  id: string;
  to_name: string | null;
  purpose: string;
  details: string | null;
  language: string;
  status: string;
  user_id: string;
  price_paid: number;
  started_at: string | null;
}

const FINISHED = ['completed', 'no-answer', 'busy', 'voicemail', 'failed'];

async function loadCall(id: string, token: string): Promise<CallRow | null> {
  if (!id || !token || token !== (await callToken(id))) return null;
  const { data } = await db()
    .from('ai_calls')
    .select('id,to_name,purpose,details,language,status,user_id,price_paid,started_at')
    .eq('id', id)
    .maybeSingle();
  return (data as CallRow) ?? null;
}

/** The user's own name, so the AI can say who it is calling for. */
async function callerName(userId: string): Promise<string> {
  const { data } = await db().from('profiles').select('first_name, last_name').eq('user_id', userId).maybeSingle();
  const name = `${data?.first_name ?? ''} ${data?.last_name ?? ''}`.replace(/\s+/g, ' ').trim();
  return name || 'a WishMe customer';
}

// ─── Writing the result back ─────────────────────────────────────────────────

async function summarise(lines: TranscriptLine[], answered: boolean): Promise<string> {
  if (!answered) return 'Nobody answered the call.';
  if (!lines.some((l) => l.role === 'user')) return 'The call connected but the other person did not say anything.';
  const text = transcriptToText(lines);

  const geminiKey = await loadKey('gemini');
  if (geminiKey) {
    try {
      const model = Deno.env.get('GEMINI_TEXT_MODEL') || 'gemini-3.6-flash';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${CALL_SUMMARY_PROMPT}\n\nCALL TRANSCRIPT:\n${text}` }] }] }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        const j = await res.json();
        const out = String(j.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
        if (out) return out.slice(0, 2000);
      }
    } catch { /* fall through to the plain version */ }
  }
  const theirs = lines.filter((l) => l.role === 'user').map((l) => l.message).join(' ');
  return `The call was answered. They said: ${theirs}`.slice(0, 600);
}

interface Finish {
  row: CallRow;
  answered: boolean;
  reason: string;
  lines: TranscriptLine[];
  outcome: Record<string, unknown> | null;
}

/** Ends a call once: writes the transcript, summary and outcome, and charges for it if it connected. */
async function finish({ row, answered, reason, lines, outcome }: Finish) {
  const client = db();
  const { data: fresh } = await client.from('ai_calls').select('status, price_paid').eq('id', row.id).maybeSingle();
  if (fresh && FINISHED.includes(fresh.status)) return; // already written

  // Save the conversation before anything slow happens: the summary needs a round trip to the AI,
  // and the transcript is the one thing that cannot be reconstructed afterwards.
  if (lines.length) {
    await client.from('ai_calls').update({ transcript: transcriptToText(lines), updated_at: new Date().toISOString() }).eq('id', row.id);
  }

  const status = !answered
    ? reason === 'busy' ? 'busy' : 'no-answer'
    : reason.startsWith('engine-error') ? 'failed' : 'completed';
  const startedAt = row.started_at ? new Date(row.started_at).getTime() : 0;
  const heard = lines.some((l) => l.role === 'user');

  const update: Record<string, unknown> = {
    status,
    ended_reason: reason,
    ended_at: new Date().toISOString(),
    duration_seconds: startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0,
    transcript: lines.length ? transcriptToText(lines) : null,
    summary: await summarise(lines, answered),
    updated_at: new Date().toISOString(),
  };
  if (status === 'failed') update.error_message = 'The call could not be completed.';

  const o = outcome ?? { outcome: answered && heard ? 'partial' : 'no_info' };
  if (typeof o.outcome === 'string' && OUTCOMES.has(o.outcome)) update.outcome = o.outcome;
  if (typeof o.next_step === 'string') update.next_step = o.next_step.slice(0, 400);
  if (o.opted_out === true) update.opted_out = true;

  // Charge only for a call that actually reached someone.
  if (status === 'completed' && Number(fresh?.price_paid ?? row.price_paid) === 0) {
    const { data: setting } = await client.from('platform_settings').select('setting_value').eq('setting_key', 'ai_call_price').maybeSingle();
    const price = Math.max(0, Number(setting?.setting_value ?? 0) || 0);
    if (price > 0) {
      const { data: profile } = await client.from('profiles').select('id, wallet_balance').eq('user_id', row.user_id).maybeSingle();
      if (profile) {
        await client.from('profiles').update({ wallet_balance: Math.max(0, (profile.wallet_balance ?? 0) - price) }).eq('id', profile.id);
        await client.from('wallet_transactions').insert({
          user_id: profile.id, amount: price, transaction_type: 'ai_call', status: 'completed', description: 'AI call on your behalf',
        });
        update.price_paid = price;
      }
    }
  }

  const { error } = await client.from('ai_calls').update(update).eq('id', row.id);
  if (error) console.error('[vobiz-call] could not save the result:', error.message);
  console.log(`[vobiz-call ${row.id.slice(0, 8)}] finished: ${status} (${reason})`);
}

// ─── Recording ───────────────────────────────────────────────────────────────

/** Admin switch: whether AI calls are recorded at all. */
async function recordingEnabled(): Promise<boolean> {
  const { data } = await db().from('platform_settings').select('setting_value').eq('setting_key', 'ai_call_record').maybeSingle();
  return (data?.setting_value ?? 'true') !== 'false';
}

/** Copies the finished recording into our own private storage and points the call row at it. */
async function storeRecording(callId: string, source: string, seconds: number) {
  try {
    // Vobiz refuses the download without the account's credentials (401), so they are sent with it.
    const cfg = vobizConfig();
    const res = await fetch(source, {
      signal: AbortSignal.timeout(60_000),
      headers: cfg ? { 'X-Auth-ID': cfg.authId, 'X-Auth-Token': cfg.authToken } : {},
    });
    if (!res.ok) throw new Error(`could not download the recording (${res.status})`);
    const bytes = await res.arrayBuffer();

    // The extension cannot be trusted — Vobiz serves WAV data as .mp3 — so the first bytes decide.
    const head = new Uint8Array(bytes.slice(0, 4));
    const isWav = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46;
    const key = `ai-calls/${callId}.${isWav ? 'wav' : 'mp3'}`;
    await putPrivate(key, bytes, isWav ? 'audio/wav' : 'audio/mpeg');

    const client = db();
    const { data: setting } = await client.from('platform_settings').select('setting_value').eq('setting_key', 'ai_call_recording_days').maybeSingle();
    const days = Math.max(1, Number(setting?.setting_value ?? 30) || 30);
    await client.from('ai_calls').update({
      recording_url: key,
      recording_seconds: seconds || null,
      recording_expires_at: new Date(Date.now() + days * 86_400_000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', callId);
    console.log(`[vobiz-call ${callId.slice(0, 8)}] recording saved (${Math.round(bytes.byteLength / 1024)} kB)`);
  } catch (e) {
    console.error(`[vobiz-call ${callId.slice(0, 8)}] recording not saved:`, e instanceof Error ? e.message : e);
  }
}

// ─── The live conversation ───────────────────────────────────────────────────

async function runConversation(socket: WebSocket, row: CallRow, done: () => void) {
  const lines: TranscriptLine[] = [];
  let outcome: Record<string, unknown> | null = null;
  let streamId: string | null = null;
  let inbound: InboundFormat = { encoding: 'audio/x-mulaw', sampleRate: 8000 };
  let playUntil = 0;
  let ended = false;
  let bridge: Bridge | null = null;
  const timers: number[] = [];
  // Timing for the "how long before it speaks" question: every line shows milliseconds since the stream opened.
  const t0 = Date.now();
  const mark = (what: string) => console.log(`[vobiz-call ${row.id.slice(0, 8)}] +${Date.now() - t0} ms ${what}`);
  let firstAudioSent = false;
  mark(`stream opened, ${row.started_at ? Date.now() - new Date(row.started_at).getTime() : '?'} ms after answer`);

  const client = db();
  let seq = 0;
  // Starts now, in parallel with the settings lookup below.
  const userNameP = callerName(row.user_id);

  const toPhone = (obj: unknown) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(obj));
  };

  const end = (reason: string) => {
    if (ended) return;
    ended = true;
    timers.forEach(clearTimeout);
    bridge?.close();
    try { socket.close(); } catch { /* already closed */ }
    EdgeRuntime.waitUntil(
      finish({ row, answered: true, reason, lines, outcome }).finally(done),
    );
  };

  const events = {
    onSpeak: (mulaw: string, ms: number) => {
      if (!firstAudioSent) {
        firstAudioSent = true;
        mark('first audio sent to the phone');
      }
      playUntil = Math.max(Date.now(), playUntil) + ms;
      toPhone({ event: 'playAudio', streamId, media: { contentType: 'audio/x-mulaw', sampleRate: 8000, payload: mulaw } });
    },
    onClearAudio: () => {
      playUntil = 0;
      toPhone({ event: 'clearAudio', streamId });
    },
    onLine: (role: 'assistant' | 'user', text: string) => {
      lines.push({ role, message: text });
      console.log(`${role === 'assistant' ? 'AI ' : 'Them'} [${row.id.slice(0, 8)}] ${text}`);
      // Saved the moment it is spoken, so a dropped worker or a lost end-of-call write can never
      // take the conversation with it — and the app can follow the call live.
      const n = seq++;
      EdgeRuntime.waitUntil(
        client.from('ai_call_lines').insert({ call_id: row.id, role, message: text, seq: n })
          .then(({ error }: { error: { message: string } | null }) => {
            if (error) console.error(`[vobiz-call ${row.id.slice(0, 8)}] could not save line ${n}: ${error.message}`);
          }),
      );
    },
    onOutcome: (args: Record<string, unknown>) => { outcome = args; },
    onWantsToHangUp: () => {
      // Let the goodbye finish playing before the line drops.
      timers.push(setTimeout(() => end('assistant-ended-call'), Math.max(0, playUntil - Date.now()) + 1200));
    },
    onEnded: (reason: string) => end(reason),
  };

  // Vobiz sends `start` and the first audio the instant the stream opens, long before the engine
  // is ready. Listen from the very first line — before any database call — and hold what arrives
  // early, or the call begins deaf.
  let greeted = false;
  const earlyAudio: string[] = [];
  socket.onmessage = (e) => {
    let msg: Record<string, any>;
    try { msg = JSON.parse(typeof e.data === 'string' ? e.data : ''); } catch { return; }
    if (msg.event === 'start') {
      streamId = msg.start?.streamId ?? msg.streamId ?? null;
      const f = msg.start?.mediaFormat;
      if (f?.encoding || f?.contentType) {
        inbound = { encoding: String(f.encoding ?? f.contentType), sampleRate: Number(f.sampleRate) || 8000 };
        console.log(`[vobiz-call ${row.id.slice(0, 8)}] inbound audio: ${inbound.encoding} @ ${inbound.sampleRate} Hz`);
      }
      bridge?.setInboundFormat(inbound);
      if (bridge && !greeted) { greeted = true; bridge.greet(); }
    } else if (msg.event === 'media' && msg.media?.payload) {
      if (bridge) bridge.onPhoneAudio(msg.media.payload);
      else if (earlyAudio.length < 400) earlyAudio.push(msg.media.payload);
    }
  };
  socket.onclose = () => end('customer-ended-call');
  socket.onerror = () => end('engine-error-stream');

  // Which engine the admin picked, with the other as a fallback if its key is missing.
  const { data: settings } = await client.from('platform_settings').select('setting_key, setting_value').in('setting_key', [
    'ai_call_engine', 'ai_voice_fallback', 'ai_call_record',
    'ai_call_sarvam_model', 'ai_call_sarvam_speaker_english', 'ai_call_sarvam_speaker_hindi',
  ]);
  const get = (k: string) => settings?.find((s: { setting_key: string }) => s.setting_key === k)?.setting_value;
  mark('settings loaded');

  const language = (['english', 'hindi', 'hinglish'].includes(row.language) ? row.language : 'english') as CallBrief['language'];
  // Calls have their own engine setting (Sarvam by default, for Indian languages); the in-app assistant keeps ai_voice_engine.
  const wanted: Engine = get('ai_call_engine') === 'gemini' ? 'gemini' : 'sarvam';
  // The voice is chosen first because its gender decides the Hindi grammar the AI must use.
  const sarvamVoice = chooseSarvamVoice(get, language);

  const brief: CallBrief = {
    userName: await userNameP,
    toName: row.to_name ?? '',
    purpose: row.purpose,
    details: row.details ?? '',
    language,
    // Must match what /answer decided, so the person is told the truth about the recording.
    recorded: (get('ai_call_record') ?? 'true') !== 'false',
    gender: wanted === 'sarvam' ? sarvamVoice.gender : 'female', // Gemini's call voice (Kore) is a woman's
  };
  const mayFallBack = get('ai_voice_fallback') !== 'false';

  const build = async (engine: Engine): Promise<Bridge | null> => {
    const key = await loadKey(engine);
    if (!key) return null;
    return engine === 'sarvam'
      ? new SarvamCallBridge(brief, {
          apiKey: key,
          model: Deno.env.get('SARVAM_LLM_MODEL') ?? 'sarvam-105b-conversations',
          voice: sarvamVoice.voice,
          fallbackVoice: sarvamVoice.fallbackVoice,
        }, events)
      : new GeminiCallBridge(brief, {
          apiKey: key,
          model: Deno.env.get('GEMINI_LIVE_MODEL') ?? 'gemini-3.8-live',
          voice: Deno.env.get('AI_CALL_GEMINI_VOICE') ?? 'Kore',
        }, events);
  };


  const order: Engine[] = mayFallBack ? [wanted, wanted === 'gemini' ? 'sarvam' : 'gemini'] : [wanted];
  for (const engine of order) {
    const candidate = await build(engine);
    if (!candidate) continue;
    try {
      await candidate.start();
      mark(`${engine} connected`);
      bridge = candidate;
      console.log(`[vobiz-call ${row.id.slice(0, 8)}] engine: ${engine}${engine === 'sarvam' ? ` (${sarvamVoice.voice.model} / ${sarvamVoice.voice.speaker})` : ''}`);
      break;
    } catch (e) {
      console.error(`[vobiz-call ${row.id.slice(0, 8)}] ${engine} could not start:`, e instanceof Error ? e.message : e);
      candidate.close();
    }
  }
  if (!bridge) return end('engine-error-no-engine');
  if (ended) return;

  // Speak first, then feed in whatever the person said while we were connecting.
  bridge.setInboundFormat(inbound);
  if (!greeted) { greeted = true; bridge.greet(); mark('greeting requested'); }
  for (const a of earlyAudio.splice(0)) bridge.onPhoneAudio(a);

  // Keep calls short: ask the AI to wrap up, then hang up.
  timers.push(setTimeout(() => bridge?.say('Time is almost up. Wrap up now: say goodbye, call report_outcome, then call end_call.'), MAX_CALL_MS - WRAP_UP_MS));
  timers.push(setTimeout(() => end('exceeded-max-duration'), MAX_CALL_MS));
}

// ─── Routing ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // .../vobiz-call/<action>[/<id>/<token>]. The stream URL carries them as path segments because
  // it travels inside XML, where an "&" between query parameters has to be escaped and may not
  // survive. The webhook URLs are handed over as plain JSON, so they still use a query string.
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.indexOf('vobiz-call');
  const action = at >= 0 ? parts[at + 1] ?? '' : parts[parts.length - 1] ?? '';
  const id = (at >= 0 ? parts[at + 2] : '') || url.searchParams.get('id') || '';
  const token = (at >= 0 ? parts[at + 3] : '') || url.searchParams.get('t') || '';

  // Proves the WebSocket upgrade works on this function without needing a real call.
  if (action === 'selftest') {
    if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('ok');
    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onopen = () => {
      socket.send('ok');
      socket.close();
    };
    return response;
  }

  if (action === 'stream') {
    if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const row = await loadCall(id, token);
    if (!row || FINISHED.includes(row.status)) return new Response('Unknown call', { status: 404 });

    // idleTimeout 0: a quiet moment in the conversation must never drop the line.
    const { socket, response } = Deno.upgradeWebSocket(req, { idleTimeout: 0 });
    let release!: () => void;
    EdgeRuntime.waitUntil(new Promise<void>((r) => (release = r)));
    // Start straight away rather than waiting for `onopen`: the socket can already be open by
    // the time a handler would be attached, and then nothing would ever run.
    runConversation(socket, row, release).catch((e) => {
      console.error('[vobiz-call] conversation failed:', e);
      release();
    });
    return response;
  }

  const row = await loadCall(id, token);
  if (!row) return new Response('Unknown call', { status: 404 });

  switch (action) {
    case 'ring':
      if (!FINISHED.includes(row.status)) {
        await db().from('ai_calls').update({ status: 'ringing', updated_at: new Date().toISOString() }).eq('id', row.id);
      }
      return new Response('ok');

    case 'answer': {
      const answerT0 = Date.now();
      if (FINISHED.includes(row.status)) return xml('<Hangup/>');
      await db().from('ai_calls').update({ status: 'in-progress', started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', row.id);
      console.log(`[vobiz-call ${row.id.slice(0, 8)}] answered (status update took ${Date.now() - answerT0} ms)`);

      const base = `${SUPABASE_URL}/functions/v1/vobiz-call`;
      const wss = `${base.replace('https://', 'wss://')}/stream/${row.id}/${token}`;
      // recordSession with redirect="false" records the whole call in the background, so the audio
      // stream below still runs. The AI says the call is recorded when this is on.
      const record = (await recordingEnabled())
        ? `<Record recordSession="true" redirect="false" playBeep="false" fileFormat="mp3" maxLength="900" callbackUrl="${base}/recording/${row.id}/${token}" callbackMethod="POST"/>`
        : '';
      // contentType asks Vobiz to send us mu-law, the format the engines are fed.
      return xml(`${record}<Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000">${wss}</Stream>`);
    }

    case 'recording': {
      // Vobiz has finished writing the audio. Copy it into our own storage straight away: their
      // link is temporary, and a private conversation should not live on someone else's bucket.
      const form = await req.formData().catch(() => null);
      const field = (k: string) => String(form?.get(k) ?? '');
      const source = field('RecordUrl') || field('RecordFile');
      const seconds = Math.round(Number(field('RecordingDuration')) || 0);
      if (!source) {
        console.error(`[vobiz-call ${row.id.slice(0, 8)}] recording callback had no file`);
        return new Response('ok');
      }
      EdgeRuntime.waitUntil(storeRecording(row.id, source, seconds));
      return new Response('ok');
    }

    case 'hangup': {
      if (FINISHED.includes(row.status)) return new Response('ok');

      // The call was answered, so the live stream holds the conversation and writes the result
      // itself. Hanging up fires this webhook and closes that stream at the same moment, and this
      // request would win the race — saving an empty call and throwing the real transcript away.
      // So leave it alone, and only step in if the stream never writes anything.
      if (row.status === 'in-progress') {
        EdgeRuntime.waitUntil((async () => {
          await new Promise((r) => setTimeout(r, 30_000));
          const { data: fresh } = await db().from('ai_calls').select('status').eq('id', row.id).maybeSingle();
          if (fresh && !FINISHED.includes(fresh.status)) {
            console.log(`[vobiz-call ${row.id.slice(0, 8)}] the stream never saved a result; closing the call`);
            await finish({ row, answered: true, reason: 'customer-ended-call', lines: [], outcome: null });
          }
        })());
        return new Response('ok');
      }

      // Never answered: there is no stream and nothing else will close this call.
      await finish({ row, answered: false, reason: 'customer-did-not-answer', lines: [], outcome: null });
      return new Response('ok');
    }

    default:
      return new Response('Not found', { status: 404 });
  }
});

```

### 3. Sarvam: listen, think, speak, language switching: `vobiz-call/sarvam.ts`

```typescript
/**
 * Sarvam bridge for a phone call. Unlike Gemini, Sarvam is three services chained together:
 *
 *   person's voice ──(mu-law 8k → PCM 16k)──► speech-to-text ──► chat model ──► text-to-speech
 *   person's ear   ◄──(PCM 24k → mu-law 8k)──────────────────────────────────────────┘
 *
 * Each finished sentence is spoken as soon as the model produces it, so the person does not wait
 * for the whole answer. The same report_outcome / end_call tools as the Gemini bridge are used.
 */

import NodeWebSocket from 'npm:ws';
import { PhoneEncoder, phoneToEngine } from '../_shared/callAudio.ts';
import { languageOfSpeech, romanLanguage, scriptLanguage, speakPhoneNumbers } from '../_shared/spokenDigits.ts';
import { CALL_TOOLS, callSystemPrompt, openingLine, type CallBrief } from '../_shared/callPrompt.ts';
import type { Bridge, BridgeEvents, InboundFormat } from './bridge.ts';

const STT_URL =
  'wss://api.sarvam.ai/speech-to-text-realtime/ws?model=saaras:v3-realtime&sample_rate=16000&encoding=linear16&stream_type=fast&endpointing=vad&silence_duration_ms=400&language_code=';
const TTS_URL = 'wss://api.sarvam.ai/text-to-speech/ws?send_completion_event=true';
const CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions';

interface Sock {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

/** Supabase's runtime cannot put headers on the built-in WebSocket, so the `ws` package is used. */
function openSarvamSocket(url: string, header: string, key: string): Sock {
  const ws = new NodeWebSocket(url, { headers: { [header]: key } });
  const sock: Sock = {
    readyState: 0,
    send: (d) => ws.send(d),
    close: () => ws.close(),
    onopen: null, onmessage: null, onclose: null, onerror: null,
  };
  ws.on('open', () => { sock.readyState = 1; sock.onopen?.(); });
  ws.on('message', (data: unknown, isBinary: boolean) => sock.onmessage?.({ data: isBinary ? '' : String(data) }));
  ws.on('close', () => { sock.readyState = 3; sock.onclose?.(); });
  ws.on('error', () => sock.onerror?.());
  return sock;
}

type Json = Record<string, unknown>;

/** A Sarvam voice: the speech model and a speaker that belongs to it (a speaker from the other model is refused). */
export interface SarvamVoice {
  model: string;
  speaker: string;
}

/** Every language the voice can speak; anything else is read as the language the call started in. */
const SPEAKABLE = new Set<string>(['en-IN', 'hi-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN']);

/** Names given to the model, so it knows which language to write its reply in. */
const LANGUAGE_NAME: Record<string, string> = {
  'en-IN': 'English', 'hi-IN': 'Hindi', 'mr-IN': 'Marathi', 'bn-IN': 'Bengali', 'gu-IN': 'Gujarati', 'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam', 'od-IN': 'Odia', 'pa-IN': 'Punjabi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
};

/**
 * Sarvam's bulbul:v4 speakers are for English and Hindi only. Every other language is spoken by the bulbul:v3
 * speaker that the in-app assistant already uses for all of them.
 */
const indicVoice = (gender: 'female' | 'male'): SarvamVoice => ({ model: 'bulbul:v3', speaker: gender === 'male' ? 'shubh' : 'ritu' });

const toOpenAiTools = (decls: typeof CALL_TOOLS) =>
  decls.map((d) => ({
    type: 'function',
    function: {
      name: d.name,
      description: d.description,
      parameters: JSON.parse(JSON.stringify(d.parameters).replace(/"type":"([A-Z]+)"/g, (_m, t) => `"type":"${String(t).toLowerCase()}"`)),
    },
  }));

export class SarvamCallBridge implements Bridge {
  private stt: Sock | null = null;
  private tts: Sock | null = null;
  private sttQueue: string[] = [];
  private messages: Json[] = [];
  /** The language the voice speaks now. It follows the other person, whatever language the call started in. */
  private ttsLang: string;
  /** The language the other person last spoke, so the model can be told to answer in it. */
  private replyLang: string;
  private closed = false;
  /** Bumped whenever the person interrupts, so stale audio and replies are dropped. */
  private gen = 0;
  private abort: AbortController | null = null;
  private speaking = 0;
  private playUntil = 0;
  private inbound: InboundFormat = { encoding: 'audio/x-mulaw', sampleRate: 8000 };
  /** The voice in use. If Sarvam refuses it before it has ever spoken, the fallback voice takes over. */
  private voice: SarvamVoice;
  private voiceWorked = false;
  private usedFallback = false;
  /** Everything sent to the voice that has not finished yet, so it can be said again if the voice is swapped. */
  private unfinished: { text: string; gen: number }[] = [];
  private phone = new PhoneEncoder(24000);
  /** Settles when the current speech connection has opened (or failed): a sentence must never be sent before. */
  private ttsReady: Promise<void> = Promise.resolve();
  private pinger: ReturnType<typeof setInterval> | null = null;

  constructor(
    private brief: CallBrief,
    private opts: { apiKey: string; model: string; voice: SarvamVoice; fallbackVoice?: SarvamVoice },
    private events: BridgeEvents,
  ) {
    this.voice = opts.voice;
    this.ttsLang = brief.language === 'english' ? 'en-IN' : 'hi-IN';
    this.replyLang = this.ttsLang;
    this.messages = [{ role: 'system', content: callSystemPrompt(brief) }];
  }

  async start(): Promise<void> {
    this.connectStt();
    await this.connectTts();
    // Sarvam closes a speech connection that sits idle for about a minute; keep it open between turns so the
    // next sentence never waits for a reconnect.
    this.pinger = setInterval(() => {
      if (this.tts?.readyState === 1) this.tts.send(JSON.stringify({ type: 'ping' }));
    }, 20_000);
  }

  greet() {
    const line = openingLine(this.brief);
    this.messages.push({ role: 'assistant', content: line });
    this.events.onLine('assistant', line);
    void this.speak(line, this.gen);
  }

  setInboundFormat(format: InboundFormat) {
    this.inbound = format;
  }

  onPhoneAudio(b64: string) {
    if (this.closed) return;
    // Whatever the phone sends → PCM 16 kHz, which is what the recogniser expects.
    const pcm16k = phoneToEngine(b64, this.inbound.encoding, this.inbound.sampleRate);
    const frame = JSON.stringify({ event: 'audio_input', audio: pcm16k });
    if (this.stt?.readyState === 1) this.stt.send(frame);
    else if (this.sttQueue.length < 100) this.sttQueue.push(frame);
  }

  say(text: string) {
    this.messages.push({ role: 'user', content: `[Note to you, not spoken by the other person] ${text}` });
    void this.runTurn();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.gen++;
    this.abort?.abort();
    if (this.pinger) clearInterval(this.pinger);
    for (const s of [this.stt, this.tts]) {
      try { s?.close(); } catch { /* already closed */ }
    }
  }

  private isSpeaking() {
    return this.abort !== null || this.speaking > 0 || Date.now() < this.playUntil;
  }

  // ─── Hearing ───────────────────────────────────────────────────────────────

  private connectStt() {
    // Always auto-detect: the other person may speak any language, and may change language mid-call. A fixed
    // language here would make the recogniser mishear everything else.
    const ws = openSarvamSocket(`${STT_URL}auto`, 'api-subscription-key', this.opts.apiKey);
    this.stt = ws;
    ws.onopen = () => {
      for (const f of this.sttQueue.splice(0)) ws.send(f);
    };
    ws.onmessage = (e) => {
      let j: Json;
      try { j = JSON.parse(e.data); } catch { return; }
      if (j.event === 'vad.speech_start' && this.isSpeaking()) this.interrupt();
      else if (j.event === 'transcript.final' && typeof j.text === 'string') {
        // The realtime endpoint names the detected language `language` (BCP-47, e.g. "mr-IN"). Odia comes as "or-IN".
        const detected = String(j.language ?? j.language_code ?? '').replace(/^or-IN$/, 'od-IN');
        console.log(`[sarvam-call] stt final keys=${Object.keys(j).join(',')} language=${j.language ?? 'none'} conf=${j.language_confidence ?? 'none'} text="${String(j.text).slice(0, 60)}"`);
        void this.onHeard(j.text, detected);
      }
    };
    ws.onclose = () => {
      if (!this.closed) setTimeout(() => !this.closed && this.connectStt(), 300);
    };
    ws.onerror = () => {};
  }

  private async onHeard(text: string, label: string) {
    const spoken = text.trim();
    if (spoken.length < 2) return;
    // Stop the old reply at once, so the caller is not talked over while the language is being worked out.
    if (this.isSpeaking()) this.interrupt();
    const script = scriptLanguage(spoken);
    const shortLatin = script === 'latin' && spoken.split(/\s+/).length < 3;
    let heard: string | null;
    if (script === 'latin') {
      // Latin letters can be English, or any Indian language typed in English letters. The recogniser's own label
      // is trusted when it names an Indian language; otherwise the model judges the language from its meaning.
      const labelIndian = SPEAKABLE.has(label) && label !== 'en-IN' ? label : null;
      heard = labelIndian ?? (shortLatin ? null : await this.judgeLanguage(spoken));
    } else {
      heard = languageOfSpeech(spoken, label);
    }
    console.log(`[sarvam-call] heard (${label || 'no label'}, ${script ?? 'no letters'}): ${heard ?? 'kept current language'}`);
    const before = this.replyLang;
    if (heard && SPEAKABLE.has(heard)) this.switchLanguage(heard);
    this.events.onLine('user', spoken);
    // The model writes its reply in the language it is told about here, so it must hear about every change.
    const changed = this.replyLang !== before;
    const name = LANGUAGE_NAME[this.replyLang] ?? 'English';
    // The note travels with the speech itself, so the model cannot answer it in English out of habit.
    const note = changed || this.replyLang !== 'en-IN'
      ? `[Note, not spoken by them] They are speaking ${name}. Reply ONLY in ${name}, in its own script, with no English sentence.\n`
      : '';
    this.messages.push({ role: 'user', content: note + spoken });
    void this.runTurn();
  }

  /**
   * Which Indian language a Latin-letter sentence is in, judged by the chat model from its meaning. Works for any
   * language, whatever its spelling. Falls back to the word lists, then to English, if the model does not answer.
   */
  private async judgeLanguage(spoken: string): Promise<string | null> {
    const codes = [...SPEAKABLE].join(', ');
    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(2500),
        headers: { 'api-subscription-key': this.opts.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.opts.model,
          messages: [
            { role: 'system', content: `The text is a phone caller's speech written in Latin letters. It may be English, or any Indian language (Hindi, Marathi, Kannada, Tamil, Telugu, Malayalam, Bengali, Gujarati, Punjabi, Odia) typed in English letters. Reply with only one code from this list: ${codes}. Judge by the meaning, not the spelling.` },
            { role: 'user', content: spoken },
          ],
          temperature: 0,
          max_tokens: 8,
          stream: false,
        }),
      });
      if (res.ok) {
        const j = await res.json() as { choices?: { message?: { content?: string } }[] };
        const code = (j.choices?.[0]?.message?.content ?? '').match(/[a-z]{2}-IN/i)?.[0]?.toLowerCase();
        const found = code ? [...SPEAKABLE].find((c) => c.toLowerCase() === code) : undefined;
        if (found) return found;
      }
    } catch (e) {
      console.error('[sarvam-call] language judge failed:', e instanceof Error ? e.message : e);
    }
    return romanLanguage(spoken) ?? 'en-IN';
  }

  /**
   * Moves the voice to another language. Sarvam fixes the language when a speech connection opens, so the
   * connection is dropped and the next sentence opens a fresh one. Indian languages other than English and
   * Hindi use the bulbul:v3 voice, so the model is changed too.
   */
  private switchLanguage(code: string) {
    console.log(`[sarvam-call] voice lang ${this.ttsLang} -> ${code}`);
    if (code === this.replyLang) return;
    this.replyLang = code;
    if (code === this.ttsLang) return;
    this.ttsLang = code;
    this.voice = code === 'en-IN' || code === 'hi-IN' ? this.opts.voice : indicVoice(this.brief.gender ?? 'female');
    try { this.tts?.close(); } catch { /* already closed */ }
    this.tts = null;
  }

  private interrupt() {
    this.gen++;
    this.abort?.abort();
    this.abort = null;
    this.speaking = 0;
    this.playUntil = 0;
    this.unfinished = [];
    this.phone.reset();
    this.events.onClearAudio();
    // Synthesis in flight cannot be cancelled: drop the socket and open a clean one.
    try { this.tts?.close(); } catch { /* already closed */ }
    this.tts = null;
    void this.connectTts();
  }

  // ─── Speaking ──────────────────────────────────────────────────────────────

  private connectTts(): Promise<void> {
    const ws = openSarvamSocket(
      `${TTS_URL}&model=${encodeURIComponent(this.voice.model)}`,
      'Api-Subscription-Key',
      this.opts.apiKey,
    );
    this.tts = ws;
    const ready = new Promise<void>((resolve) => {
      // Resolve whether it opens or fails, so a refused connection can never leave the call waiting forever.
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'config',
          data: {
            language_code: this.ttsLang, speaker: this.voice.speaker, pace: 1.0,
            speech_sample_rate: '24000', output_audio_codec: 'linear16', min_buffer_size: 30, max_chunk_length: 120,
          },
        }));
        resolve();
      };
      ws.onmessage = (e) => {
        let j: { type?: string; data?: { audio?: string; message?: string } };
        try { j = JSON.parse(e.data); } catch { return; }
        if (j.type === 'event') {
          this.speaking = Math.max(0, this.speaking - 1);
          this.unfinished.shift();
        } else if (j.type === 'audio' && j.data?.audio && this.tts === ws) {
          this.voiceWorked = true;
          // Sarvam speaks at 24 kHz; the phone needs mu-law at 8 kHz, filtered properly on the way down.
          const { payload, ms } = this.phone.encode(j.data.audio);
          this.playUntil = Math.max(Date.now(), this.playUntil) + ms;
          this.events.onSpeak(payload, ms);
        } else if (j.type === 'error') {
          console.error('[sarvam-call] speech error:', j.data?.message);
          if (this.tts === ws) this.voiceFailed(ws);
        }
      };
      ws.onclose = () => {
        if (this.tts === ws) {
          this.tts = null;
          if (!this.voiceWorked) this.voiceFailed(ws);
        }
        resolve();
      };
      ws.onerror = () => resolve();
    });
    this.ttsReady = ready;
    return ready;
  }

  /**
   * Sarvam refused the voice before it ever spoke (for instance a speaker that belongs to another model). Without a
   * fallback the call would be silent, so switch to the proven voice and say again what was waiting.
   */
  private voiceFailed(ws: Sock) {
    if (this.voiceWorked || this.usedFallback || !this.opts.fallbackVoice || this.closed) return;
    this.usedFallback = true;
    this.voice = this.opts.fallbackVoice;
    console.error(`[sarvam-call] switching to the fallback voice ${this.voice.model} / ${this.voice.speaker}`);
    const waiting = this.unfinished.filter((u) => u.gen === this.gen);
    this.unfinished = [];
    this.speaking = 0;
    try { ws.close(); } catch { /* already closed */ }
    this.tts = null;
    void (async () => {
      await this.connectTts();
      for (const u of waiting) this.sendToVoice(u.text, u.gen);
    })();
  }

  private sendToVoice(clean: string, gen: number) {
    if (gen !== this.gen || this.tts?.readyState !== 1) return;
    this.speaking++;
    this.unfinished.push({ text: clean, gen });
    this.tts.send(JSON.stringify({ type: 'text', data: { text: clean } }));
    this.tts.send(JSON.stringify({ type: 'flush' }));
  }

  private async speak(text: string, gen: number) {
    // Phone numbers are written out digit by digit in the language of the sentence, so the voice cannot
    // read them in the wrong one.
    const plain = text.replace(/[*_`#]/g, '').trim();
    // The voice follows the language the reply is actually written in (the model may answer in Devanagari Marathi).
    const written = scriptLanguage(plain);
    if (written && written !== 'latin' && SPEAKABLE.has(written) && written !== this.ttsLang) this.switchLanguage(written);
    const clean = speakPhoneNumbers(plain, this.ttsLang);
    if (!clean) return;
    if (!this.tts || this.tts.readyState > 1) await this.connectTts();
    else await this.ttsReady; // still opening (for instance right after an interruption): wait, do not drop the sentence
    this.sendToVoice(clean, gen);
  }

  // ─── Thinking ──────────────────────────────────────────────────────────────

  private async runTurn() {
    this.abort?.abort();
    const gen = ++this.gen;
    // The language rule goes in the system prompt, not only in a note: the model follows it far more reliably.
    // Without this, the model kept answering in English after the caller had switched.
    const replyName = LANGUAGE_NAME[this.replyLang];
    this.messages[0] = {
      role: 'system',
      content: replyName && this.replyLang !== 'en-IN'
        ? `${callSystemPrompt(this.brief)}\n\nLANGUAGE FOR THIS REPLY: the caller is speaking ${replyName}. Write every word of your reply in ${replyName}, in its own script. Never answer in English while the caller is speaking ${replyName}.`
        : callSystemPrompt(this.brief),
    };
    console.log(`[sarvam-call] reply language: ${replyName ?? this.replyLang}`);
    const abort = new AbortController();
    this.abort = abort;

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        signal: abort.signal,
        headers: { 'api-subscription-key': this.opts.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.opts.model,
          messages: this.messages,
          tools: toOpenAiTools(CALL_TOOLS),
          tool_choice: 'auto',
          temperature: 0.3,
          max_tokens: 300,
          reasoning_effort: 'low',
          stream: true,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`model error ${res.status}`);

      let content = '';
      let spokenUpTo = 0;
      const calls = new Map<number, { id: string; name: string; args: string }>();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      /** Speaks every complete sentence as soon as it arrives, so the reply starts sooner. */
      const speakReady = (final: boolean) => {
        let rest = content.slice(spokenUpTo);
        for (;;) {
          const m = rest.match(/^[\s\S]*?[.!?।\n]+(?=\s|$)/);
          if (!m) break;
          spokenUpTo += m[0].length;
          rest = content.slice(spokenUpTo);
          void this.speak(m[0], gen);
        }
        if (final && rest.trim()) {
          spokenUpTo = content.length;
          void this.speak(rest, gen);
        }
      };

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          let j: { choices?: { delta?: { content?: string; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[] };
          try { j = JSON.parse(payload); } catch { continue; }
          const d = j.choices?.[0]?.delta;
          if (!d) continue;
          if (d.content) {
            content += d.content;
            speakReady(false);
          }
          for (const tc of d.tool_calls ?? []) {
            const i = tc.index ?? 0;
            const cur = calls.get(i) ?? { id: '', name: '', args: '' };
            if (tc.id) cur.id = tc.id;
            if (tc.function?.name) cur.name = tc.function.name;
            if (tc.function?.arguments) cur.args += tc.function.arguments;
            calls.set(i, cur);
          }
        }
      }
      if (gen !== this.gen) return;
      speakReady(true);

      const said = content.trim();
      if (said) {
        this.events.onLine('assistant', said);
        this.messages.push({ role: 'assistant', content: said });
      }

      for (const c of calls.values()) {
        if (!c.name) continue;
        let args: Json = {};
        try { args = c.args ? JSON.parse(c.args) : {}; } catch { /* leave empty */ }
        if (c.name === 'report_outcome') this.events.onOutcome(args);
        else if (c.name === 'end_call') {
          // Let the goodbye finish playing first.
          setTimeout(() => this.events.onWantsToHangUp(), Math.max(0, this.playUntil - Date.now()) + 800);
        }
        this.messages.push({ role: 'assistant', content: null, tool_calls: [{ id: c.id || c.name, type: 'function', function: { name: c.name, arguments: c.args || '{}' } }] });
        this.messages.push({ role: 'tool', tool_call_id: c.id || c.name, content: '{"ok":true}' });
      }
    } catch (e) {
      if (gen === this.gen && !(e instanceof DOMException && e.name === 'AbortError')) {
        console.error('[sarvam-call] turn failed:', e instanceof Error ? e.message : e);
      }
    } finally {
      if (this.abort === abort) this.abort = null;
    }
  }
}

```

### 4. Bridge interface: `vobiz-call/bridge.ts` (project file)

```typescript
/** What every call engine (Gemini, Sarvam) must provide, and how it talks back to the phone. */

export interface BridgeEvents {
  /** Audio for the person to hear: base64 mu-law 8 kHz, plus how long it plays. */
  onSpeak: (mulawBase64: string, ms: number) => void;
  /** The person talked over the AI: throw away whatever is still queued to play. */
  onClearAudio: () => void;
  /** A finished line of the conversation, for the transcript. */
  onLine: (role: 'assistant' | 'user', text: string) => void;
  /** The AI's own verdict on how the call went. */
  onOutcome: (args: Record<string, unknown>) => void;
  /** The AI has said goodbye and wants to hang up. */
  onWantsToHangUp: () => void;
  /** The engine itself stopped. */
  onEnded: (reason: string) => void;
}

/** What the phone network says it is sending us, from the stream's `start` event. */
export interface InboundFormat {
  encoding: string;
  sampleRate: number;
}

export interface Bridge {
  /** Connects to the engine. Rejects if it cannot be reached. */
  start(): Promise<void>;
  /** Speaks the agreed opening line. */
  greet(): void;
  /** The audio format the phone network is actually sending, if it told us. */
  setInboundFormat(format: InboundFormat): void;
  /** One frame of the person's voice, base64, in the format above. */
  onPhoneAudio(b64: string): void;
  /** Tells the engine something out of band (for example that time is nearly up). */
  say(text: string): void;
  close(): void;
}

```

### 5. Vobiz call request and call token: `_shared/vobiz.ts`

```typescript
/**
 * Vobiz (the phone line) plus the bits both call functions need: the per-call token that lets
 * Vobiz reach us without a login, and the API keys for the two AI engines.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

export type Engine = 'gemini' | 'sarvam';

/**
 * Vobiz cannot log in, so answer/ring/hangup/stream URLs carry this instead. It is derived from
 * the call id and the server secret, so it needs no database column and cannot be guessed.
 */
export async function callToken(callId: string): Promise<string> {
  const secret = Deno.env.get('AI_CALL_WEBHOOK_SECRET') ?? '';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`ai-call:${callId}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/** The engine's API key: the admin panel's encrypted store first, then the server secret. */
export async function loadKey(engine: Engine): Promise<string> {
  const vaultName = engine === 'sarvam' ? 'ai_sarvam_api_key' : 'ai_gemini_api_key';
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data } = await db.rpc('ai_secret_get', { p_name: vaultName });
    if (typeof data === 'string' && data) return data;
  } catch { /* fall back to the server secret */ }
  for (const name of engine === 'sarvam' ? ['SARVAM_API_KEY'] : ['GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY']) {
    const v = Deno.env.get(name);
    if (v) return v;
  }
  return '';
}

export interface VobizConfig {
  authId: string;
  authToken: string;
  phoneNumber: string;
}

export function vobizConfig(): VobizConfig | null {
  const authId = Deno.env.get('VOBIZ_AUTH_ID') ?? '';
  const authToken = Deno.env.get('VOBIZ_AUTH_TOKEN') ?? '';
  const phoneNumber = Deno.env.get('VOBIZ_PHONE_NUMBER') ?? '';
  return authId && authToken && phoneNumber ? { authId, authToken, phoneNumber } : null;
}

const digits = (n: string) => n.replace(/\D/g, '');

/**
 * Asks Vobiz to ring a number. A success here only means the call was accepted; whether anyone
 * answers arrives later on the ring/answer/hangup URLs.
 */
export async function placeVobizCall(
  cfg: VobizConfig,
  opts: { to: string; answerUrl: string; ringUrl: string; hangupUrl: string; timeLimitSeconds: number },
): Promise<{ id: string | null }> {
  const res = await fetch(`https://api.vobiz.ai/api/v1/Account/${cfg.authId}/Call/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-ID': cfg.authId, 'X-Auth-Token': cfg.authToken },
    body: JSON.stringify({
      from: digits(cfg.phoneNumber),
      to: digits(opts.to),
      answer_url: opts.answerUrl,
      answer_method: 'POST',
      ring_url: opts.ringUrl,
      ring_method: 'POST',
      hangup_url: opts.hangupUrl,
      hangup_method: 'POST',
      ring_timeout: '40',
      time_limit: String(opts.timeLimitSeconds),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok) {
    const reason = String(body.message ?? body.error ?? text.slice(0, 200) ?? `HTTP ${res.status}`);
    throw new Error(`Vobiz refused the call (${res.status}): ${reason}`);
  }
  return { id: (body.request_uuid ?? body.call_uuid ?? body.id ?? null) as string | null };
}

```

### 6. The prompt, speaking style, language rules and tools: `_shared/callPrompt.ts`

```typescript
/**
 * What the AI says and how it behaves while it is on a phone call for a user.
 * Shared by both call engines (Gemini Live and Sarvam), so they behave identically.
 */

import type { CallLanguage } from './aiCall.ts';

export interface CallBrief {
  userName: string;
  toName: string;
  purpose: string;
  details: string;
  language: CallLanguage;
  /** True when the audio is kept, which changes what the person is told at the start. */
  recorded: boolean;
  /** Whether the voice is a woman's or a man's. Hindi verbs change with it ("कर रही हूँ" / "कर रहा हूँ"). Default: female. */
  gender?: 'female' | 'male';
}

const LANGUAGE_RULE: Record<CallLanguage, string> = {
  english: 'Open in clear, simple English, then follow the language of the other person, spoken with a natural Indian English accent and Indian English rhythm, like an educated person from India. Not American, not British.',
  hindi: 'Start in everyday spoken Hindi.',
  hinglish: 'Start in natural Hinglish: everyday Hindi mixed with common English words.',
};

/** Applies to every call, whatever language it starts in. */
const SWITCHING_RULE = `LANGUAGE (most important rule on this call):
- Judge the language from the meaning, not the letters. Marathi or Hindi typed in English letters (for example "tumhi kon ahat" or "aap kaun hain") is Marathi or Hindi: answer in that language in its own script, even on your first reply. Your opening line was in English only because the language was not yet known.
- The other person decides the language. Reply in the language they are speaking right now: Hindi, Marathi, Kannada, Tamil, Telugu, Malayalam, Bengali, Gujarati, Punjabi, Odia, English, or a mix.
- If they say they want to speak a language (for example "Marathi madhe bola" or "Kannada alli maatadi"), switch to it at once and keep using it for the rest of the call unless they switch again.
- Never answer in English after they have started speaking another language. Never translate their words into English for them.
- Whenever you speak English, use an Indian English accent and rhythm, never an American or British accent.
- Speak every language with its own native pronunciation and vocabulary, not with an English accent. Marathi sounds Marathi, Kannada sounds Kannada. Use everyday words that people actually use in that language, and keep only the names, numbers and product words that are normally said in English.
- Write Marathi and Hindi in Devanagari, Kannada in Kannada script, Tamil in Tamil script, and so on. Write English words in English letters.
- If you did not understand what they said, ask them in the language they used: "माफ करा, पुन्हा सांगाल का?" for Marathi, "ಕ್ಷಮಿಸಿ, ಮತ್ತೆ ಹೇಳುತ್ತೀರಾ?" for Kannada.`;

/** The first thing the person hears. It names the AI and says the call is written down. */
export function openingLine(brief: Pick<CallBrief, 'userName' | 'toName' | 'language' | 'recorded'>): string {
  const who = brief.userName || 'a customer';
  if (brief.language === 'hindi' || brief.language === 'hinglish') {
    const name = brief.toName ? ` ${brief.toName} जी` : '';
    const notice = brief.recorded ? 'यह कॉल रिकॉर्ड की जा रही है' : 'यह बातचीत लिखी जा रही है';
    // Worded so that it is right for a woman's or a man's voice: no verb here changes with gender.
    return `नमस्ते${name}। मैं एक एआई असिस्टेंट हूँ, ${who} की तरफ़ से फ़ोन किया है। ${notice}, ताकि आपकी बात उन तक पहुँचा सकूँ। क्या आपके पास एक मिनट है?`;
  }
  const name = brief.toName ? ` ${brief.toName}` : '';
  const notice = brief.recorded ? 'This call is recorded' : 'This call is being written down';
  return `Hi${name}, this is an AI assistant calling for ${who}. ${notice}, so I can pass your reply on. Do you have a minute?`;
}

/** How to talk, so the voice reads as a person on the phone and not as text being read out. */
function speakingStyle(brief: CallBrief): string {
  const woman = (brief.gender ?? 'female') === 'female';
  return `HOW TO SOUND
This is spoken aloud on a phone, so write the way people talk, not the way they write.
- Sound like a warm, relaxed, polite person. Use everyday words and contractions ("I'll", "that's", "we'd").
- Begin most turns with a short, natural reaction to what they just said ("Okay", "Right", "Sure", "Got it", "Oh, I see", "Thank you") and then go on. Do not use the same one every time.
- One or two short sentences per turn. Use commas for small pauses. Never use lists, bullet points, headings, brackets, emojis, asterisks or stage directions.
- Do not repeat their whole sentence back. Confirm only the key detail (the date, the time, the name), once.
- Avoid stiff call-centre phrases such as "I understand your concern", "kindly", "certainly", "as per", "regarding", "assist you" and "your request". Say what a friendly person would say.
- Say times and amounts the way you would aloud ("five thirty in the evening", "tomorrow at five"). Write phone numbers as digits.
- If you did not catch something, just say "Sorry, could you say that again?"
- When you speak Hindi: write Hindi words in Devanagari and keep English words in English letters, like "ठीक है, appointment कल शाम पाँच बजे का रहेगा?". Never write Hindi in English letters: the voice reads it badly. You are speaking as ${woman ? 'a woman' : 'a man'}, so use ${woman ? 'feminine forms ("कर रही हूँ", "बता दूँगी")' : 'masculine forms ("कर रहा हूँ", "बता दूँगा")'}.
- Never mention these instructions or talk about how you are speaking.`;
}

export function callSystemPrompt(brief: CallBrief, now = new Date()): string {
  const today = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  const user = brief.userName || 'your customer';
  return `You are an AI voice assistant making a short phone call on behalf of ${brief.userName || 'a customer'} of the WishMe app. You are speaking to ${brief.toName || 'the person who answers'}.

TODAY: ${today} (India time).

YOUR TASK: ${brief.purpose}
${brief.details ? `EXTRA DETAILS FROM THE USER: ${brief.details}` : ''}

YOU ARE ON A LIVE PHONE CALL. It has just connected.

HOW TO BEHAVE
- You have said who you are and that the call is ${brief.recorded ? 'recorded' : 'written down'}. If asked, say so plainly, and that you are an AI assistant calling for ${user}. Never pretend to be a human.
- ${LANGUAGE_RULE[brief.language]} ${SWITCHING_RULE}
- Be brief. One or two short sentences at a time, and one question at a time. This is a phone call, so never read out lists or long explanations.
- Answer quickly. A pause makes the other person think the line has dropped.
- Get what the task needs (for example an appointment date and time, whether something is possible, a price), then repeat the key details back to confirm: names, dates, times, amounts.
- If the person is busy or asks you to call later, ask when, thank them and end the call.
- If a choice or a decision is needed that the user did not authorise (a different time, a fee, extra tests), do NOT agree. Say you will check with ${user} and get back, and note the options.
- NEVER share or ask for card numbers, bank details, OTPs, PINs, passwords or ID numbers. Never agree to pay anything on the call.
- Do not give medical, legal or financial advice. Do not argue.
- If you reach voicemail or an answering machine: leave one short message (who you are, who you call for, the reason, and that they can call ${user} back), then end the call.
- If the person asks not to be called again, apologise, confirm you will not call again, set opted_out to true, and end the call.
- Take as long as the conversation genuinely needs. Do not rush the person or cut them short.
- If the call is not going anywhere after a few tries, thank them and end it politely.

${speakingStyle(brief)}

ENDING THE CALL
When the conversation is finished: say a short goodbye out loud, then call report_outcome once, then call end_call. Never call end_call before you have said goodbye.`;
}

export const CALL_SUMMARY_PROMPT =
  'Summarise this phone call in 2 to 4 short plain sentences for the person who asked for it. Say what the other person said and what was decided: dates, times, names, prices, anything promised, and anything the user still needs to do. If nobody picked up or it went to voicemail, say so. Do not invent details.';

/** Gemini-style tool declarations. The Sarvam bridge converts these to its own format. */
export const CALL_TOOLS = [
  {
    name: 'report_outcome',
    description: 'Record how the call went. Call it once, after saying goodbye.',
    parameters: {
      type: 'OBJECT',
      properties: {
        outcome: {
          type: 'STRING',
          enum: ['success', 'partial', 'declined', 'no_info', 'callback_requested'],
          description: 'success = the task was done; partial = some of it; declined = they said no; no_info = nothing useful learned; callback_requested = they asked to be called back later',
        },
        next_step: { type: 'STRING', description: 'What the user should do next, in one short sentence. Empty if nothing.' },
        opted_out: { type: 'BOOLEAN', description: 'True only if the person asked not to be called again.' },
      },
      required: ['outcome'],
    },
  },
  {
    name: 'end_call',
    description: 'Hang up. Only after you have said goodbye out loud and called report_outcome.',
    parameters: { type: 'OBJECT', properties: {} },
  },
];

export const OUTCOMES = new Set(['success', 'partial', 'declined', 'no_info', 'callback_requested']);

export interface TranscriptLine { role: 'assistant' | 'user'; message: string }

export const transcriptToText = (lines: TranscriptLine[]): string =>
  lines.map((l) => `${l.role === 'assistant' ? 'AI' : 'Them'}: ${l.message}`).join('\n').slice(0, 12000);

```

### 7. Sarvam voice choice: `_shared/callVoice.ts`

```typescript
/**
 * Which Sarvam voice speaks on a phone call.
 *
 * Sarvam has two speech models, and a speaker belongs to exactly one of them: asking `bulbul:v4-flash` for the old
 * speaker "ritu" is refused outright (and a refused voice means a silent call). So the model and the speaker are
 * always chosen together here, and the proven voice (`bulbul:v3` / ritu) is kept as the fallback.
 *
 * The admin can change the choice without a code change, through platform_settings:
 *   ai_call_sarvam_model             bulbul:v4-flash (default) or bulbul:v3
 *   ai_call_sarvam_speaker_english   a speaker of that model, for calls in English
 *   ai_call_sarvam_speaker_hindi     a speaker of that model, for calls in Hindi or Hinglish
 */

export const V3 = 'bulbul:v3';
export const V4 = 'bulbul:v4-flash';

export interface SarvamVoice {
  model: string;
  speaker: string;
}

type Group = 'english' | 'hindi';

/** Conversational-style voices: the style meant for two people talking, rather than announcements or ads. */
const DEFAULTS: Record<string, Record<Group, string>> = {
  [V4]: { english: 'sophia_en_conversational', hindi: 'ritu_hi_conversation' },
  [V3]: { english: 'ritu', hindi: 'ritu' },
};

const SPEAKER_FORMAT = /^[a-z0-9_]{2,40}$/;

/** First names of Sarvam's male speakers; everyone else is treated as a woman's voice. */
const MALE = new Set([
  'aayan', 'aditya', 'advait', 'amit', 'anand', 'aravind', 'aryaman', 'ashok', 'ashutosh', 'ashwin', 'bhavik', 'chetan',
  'chirag', 'dev', 'deven', 'girish', 'gokul', 'harpreet', 'jaspal', 'kabir', 'kalpit', 'kunal', 'mahesh', 'manan',
  'mani', 'mohit', 'mukul', 'nachiket', 'nilesh', 'ojas', 'rahul', 'ratan', 'rehan', 'rohan', 'rustom', 'shubh',
  'soham', 'sumit', 'tarun', 'vaibhav', 'varun', 'vijay', 'vipul',
]);

export function speakerGender(speaker: string): 'female' | 'male' {
  return MALE.has(speaker.split('_')[0]) ? 'male' : 'female';
}

export interface VoiceChoice {
  voice: SarvamVoice;
  /** Used instead if Sarvam refuses `voice`; absent when `voice` already is the proven one. */
  fallbackVoice?: SarvamVoice;
  gender: 'female' | 'male';
}

export function chooseSarvamVoice(
  setting: (key: string) => string | undefined | null,
  language: 'english' | 'hindi' | 'hinglish',
): VoiceChoice {
  const model = String(setting('ai_call_sarvam_model') ?? '').trim() === V3 ? V3 : V4;
  const group: Group = language === 'english' ? 'english' : 'hindi';
  const custom = String(setting(`ai_call_sarvam_speaker_${group}`) ?? '').trim().toLowerCase();
  const speaker = SPEAKER_FORMAT.test(custom) ? custom : DEFAULTS[model][group];

  const voice: SarvamVoice = { model, speaker };
  const proven: SarvamVoice = { model: V3, speaker: DEFAULTS[V3][group] };
  const isProven = voice.model === proven.model && voice.speaker === proven.speaker;
  return { voice, fallbackVoice: isProven ? undefined : proven, gender: speakerGender(speaker) };
}

```

### 8. Script and language detection, phone numbers: `_shared/spokenDigits.ts`

```typescript
/**
 * Saying phone numbers in the language the user is speaking, and working out that language.
 *
 * Why this exists: the text-to-speech voice reads digits in whatever language the voice was opened in, and that
 * was picked from the speech recogniser's guess about the user's last sentence (or "Hindi" before they had said
 * anything). So an English speaker was read "98765 43210" in Hindi, and a Kannada speaker in Hindi too.
 *
 * Instead of trusting the voice, the digits are written out as words before the sentence is synthesised, in the
 * language the SENTENCE is written in: English words for Latin letters, Kannada words for Kannada script, and so
 * on. The voice then has nothing to get wrong. Pure code (no Deno APIs): see scripts/spokenDigits.selfcheck.ts.
 */

/** Sarvam text-to-speech language codes. */
export type TtsLang = 'en-IN' | 'hi-IN' | 'mr-IN' | 'bn-IN' | 'gu-IN' | 'kn-IN' | 'ml-IN' | 'od-IN' | 'pa-IN' | 'ta-IN' | 'te-IN';

/** Digit words, 0..9. */
const DIGITS: Record<TtsLang, string[]> = {
  'en-IN': ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
  'hi-IN': ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ'],
  'mr-IN': ['शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ'],
  'kn-IN': ['ಸೊನ್ನೆ', 'ಒಂದು', 'ಎರಡು', 'ಮೂರು', 'ನಾಲ್ಕು', 'ಐದು', 'ಆರು', 'ಏಳು', 'ಎಂಟು', 'ಒಂಬತ್ತು'],
  'ta-IN': ['பூஜ்யம்', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது'],
  'te-IN': ['సున్నా', 'ఒకటి', 'రెండు', 'మూడు', 'నాలుగు', 'ఐదు', 'ఆరు', 'ఏడు', 'ఎనిమిది', 'తొమ్మిది'],
  'ml-IN': ['പൂജ്യം', 'ഒന്ന്', 'രണ്ട്', 'മൂന്ന്', 'നാല്', 'അഞ്ച്', 'ആറ്', 'ഏഴ്', 'എട്ട്', 'ഒമ്പത്'],
  'bn-IN': ['শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'],
  'gu-IN': ['શૂન્ય', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ'],
  'pa-IN': ['ਸਿਫ਼ਰ', 'ਇੱਕ', 'ਦੋ', 'ਤਿੰਨ', 'ਚਾਰ', 'ਪੰਜ', 'ਛੇ', 'ਸੱਤ', 'ਅੱਠ', 'ਨੌਂ'],
  'od-IN': ['ଶୂନ୍ୟ', 'ଏକ', 'ଦୁଇ', 'ତିନି', 'ଚାରି', 'ପାଞ୍ଚ', 'ଛଅ', 'ସାତ', 'ଆଠ', 'ନଅ'],
};

/** Unicode block → language, for the Indic scripts (each block is 128 code points wide). */
const SCRIPT_LANG: [number, number, TtsLang][] = [
  [0x0900, 0x097f, 'hi-IN'], // Devanagari (Hindi, and Marathi, which the caller can tell apart)
  [0x0980, 0x09ff, 'bn-IN'],
  [0x0a00, 0x0a7f, 'pa-IN'],
  [0x0a80, 0x0aff, 'gu-IN'],
  [0x0b00, 0x0b7f, 'od-IN'],
  [0x0b80, 0x0bff, 'ta-IN'],
  [0x0c00, 0x0c7f, 'te-IN'],
  [0x0c80, 0x0cff, 'kn-IN'],
  [0x0d00, 0x0d7f, 'ml-IN'],
];

/** At least this share of the letters must be in an Indic script for the sentence to count as Indic. */
const INDIC_SHARE = 0.3;

/**
 * Which language a piece of text is written in, judged by its script: an Indic language code, 'latin' for
 * English-looking text, or null when there are no letters at all (just digits and punctuation).
 */
export function scriptLanguage(text: string): TtsLang | 'latin' | null {
  const counts = new Map<TtsLang, number>();
  let latin = 0;
  let indic = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a) || (cp >= 0xc0 && cp <= 0x24f)) {
      latin++;
      continue;
    }
    for (const [from, to, lang] of SCRIPT_LANG) {
      // Count letters only, not digits (0x66-0x6f), signs or punctuation inside the block.
      const off = cp - from;
      if (cp >= from && cp <= to && off >= 0x05 && !(off >= 0x66 && off <= 0x6f)) {
        counts.set(lang, (counts.get(lang) ?? 0) + 1);
        indic++;
        break;
      }
    }
  }
  if (!latin && !indic) return null;
  if (indic && indic >= (latin + indic) * INDIC_SHARE) {
    let best: TtsLang = 'hi-IN';
    let bestCount = -1;
    for (const [lang, n] of counts) {
      if (n > bestCount) {
        best = lang;
        bestCount = n;
      }
    }
    return best;
  }
  return 'latin';
}

/**
 * The voice language for what the user just said. The script of the transcript is more reliable than the
 * recogniser's own label, which tags a lot of Indian-accented English as Hindi. Returns null if there is
 * nothing to go on (so the caller keeps the language it already has).
 */
/** Romanised (Latin-letter) Marathi and Hindi words. Used only when the text has no Indic script at all. */
const ROMAN_MARATHI = /\b(tumhi|tumhala|tumhe|kon|ahat|aahat|aahe|ahe|mala|majha|mazha|kay|kasa|kashi|nahi|bola|sanga|aamhi|pahije|madhe|tumcha|tumchi)\b/gi;
const ROMAN_HINDI = /\b(aap|kya|hai|hain|kaun|mujhe|mera|meri|kyun|bataiye|kaise|kahan|hum|tum)\b/gi;

/** Marathi or Hindi typed in English letters ("tumhi kon ahat", "aap kaun hain"), judged by its words. */
export function romanLanguage(text: string): 'mr-IN' | 'hi-IN' | null {
  const mr = (text.match(ROMAN_MARATHI) ?? []).length;
  const hi = (text.match(ROMAN_HINDI) ?? []).length;
  if (mr >= 2 || (mr > hi && mr >= 1)) return 'mr-IN';
  if (hi >= 2 || (hi > mr && hi >= 1)) return 'hi-IN';
  return null;
}

/** Words that only Marathi uses (Hindi has है, था, किया, आप, चाहिए, मेरा where Marathi has आहे, होता, केले, तुम्ही, पाहिजे, माझा). */
const MARATHI_WORDS = /(?:^|[\s,।?!])(?:आहे|आहेत|आहात|आहोत|होता|होती|होते|केले|केली|झाले|झाली|पाहिजे|माझा|माझी|माझे|तुम्ही|तुमचा|तुमची|आम्ही|सांगा|बोला|मराठी|सांगतो|करतो|करते)(?=[\s,।?!]|$)/g;
/** Words that only Hindi uses in the same places. */
const HINDI_WORDS = /(?:^|[\s,।?!])(?:है|हैं|था|थी|थे|किया|किये|हुआ|हुई|चाहिए|मेरा|मेरी|मेरे|आप|बताइए|बताएं|कीजिए|करता|करती|हिंदी)(?=[\s,।?!]|$)/g;

/** Devanagari is shared by Hindi and Marathi; the words used decide which one was spoken. */
function devanagariLanguage(text: string): TtsLang {
  const mr = (text.match(MARATHI_WORDS) ?? []).length;
  const hi = (text.match(HINDI_WORDS) ?? []).length;
  return mr > hi ? 'mr-IN' : 'hi-IN';
}

export function languageOfSpeech(text: string, label: string): TtsLang | null {
  const guess = scriptLanguage(text);
  if (guess === 'latin') return 'en-IN';
  // The recogniser's own label wins when it names Marathi; otherwise the words decide.
  if (guess === 'hi-IN' && label === 'mr-IN') return 'mr-IN';
  if (guess === 'hi-IN') return devanagariLanguage(text);
  if (guess) return guess;
  return label in DIGITS ? (label as TtsLang) : null;
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** Digit groups of two or more, split by single spaces or dashes: a candidate phone number. */
const PHONE = /(?<![\d₹])(?<!₹ )\+?\d{2,}(?:[ -]\d{2,})*(?!\d)/g;
/** 12-05-2026 is a date, not a phone number. */
const DATE = /^\d{1,2}[ -]\d{1,2}[ -]\d{2,4}$/;
/** Landlines have 8 digits and mobiles 10; with 0 or 91 in front that is up to 13. Longer than that is not a phone number. */
const MIN_DIGITS = 8;
const MAX_DIGITS = 13;
function groups(digits: string, hadSeparators: boolean, original: string): string[] {
  if (hadSeparators) {
    const parts = original.replace(/^\+/, '').split(/[ -]+/).filter(Boolean);
    // "+91 98765 43210": the country code is always India's here, and saying it only slows the sentence down.
    if (parts[0] === '91' && parts.length > 1 && /^\+/.test(original)) parts.shift();
    return parts;
  }
  const d = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  const out: string[] = [];
  for (let i = 0; i < d.length; i += 5) out.push(d.slice(i, i + 5));
  // Never leave a lone digit as the last group: "98765 43210" and "98765 4321 0" sound very different.
  if (out.length > 1 && out[out.length - 1].length === 1) out.splice(-2, 2, out[out.length - 2] + out[out.length - 1]);
  return out;
}

/**
 * Rewrites every phone number in `sentence` as digit words, in the language the sentence is written in.
 * `fallback` is used only when the sentence has no letters to judge by (for example just "9876543210.").
 */
export function speakPhoneNumbers(sentence: string, fallback: string): string {
  const guess = scriptLanguage(sentence);
  const wanted = guess === 'latin' ? 'en-IN' : guess ?? fallback;
  // Devanagari is shared by Hindi and Marathi: the voice's own language settles it.
  const lang: TtsLang = wanted === 'hi-IN' && fallback === 'mr-IN' ? 'mr-IN' : wanted in DIGITS ? (wanted as TtsLang) : 'en-IN';
  const words = DIGITS[lang];

  return sentence.replace(PHONE, (match) => {
    const all = match.replace(/\D/g, '');
    if (all.length < MIN_DIGITS || all.length > MAX_DIGITS || DATE.test(match)) return match;
    const hadSeparators = /[ -]/.test(match);
    const parts = groups(all, hadSeparators, match);
    return parts.map((p) => [...p].map((c) => words[Number(c)]).join(' ')).join(', ');
  });
}

```

### 9. Audio conversion: `_shared/callAudio.ts`

```typescript
/**
 * Audio for phone calls: G.711 mu-law (what the phone network uses, 8 kHz) <-> linear PCM
 * (what the AI engines use, 16 kHz in and 24 kHz out). Pure functions, no dependencies.
 */

const BIAS = 0x84;
const CLIP = 32635;
const SEG_END = [0xff, 0x1ff, 0x3ff, 0x7ff, 0xfff, 0x1fff, 0x3fff, 0x7fff];

export function pcm16ToMulaw(sample: number): number {
  let s = sample < 0 ? -sample : sample;
  const sign = sample < 0 ? 0x80 : 0;
  if (s > CLIP) s = CLIP;
  s += BIAS;
  let seg = 0;
  while (seg < SEG_END.length && s > SEG_END[seg]) seg++;
  if (seg >= 8) return ~sign & 0xff;
  const mantissa = (s >> (seg + 3)) & 0x0f;
  return ~(sign | (seg << 4) | mantissa) & 0xff;
}

export function mulawToPcm16(u: number): number {
  u = ~u & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + BIAS) << exponent;
  sample -= BIAS;
  return sign ? -sample : sample;
}

/** mu-law bytes -> 16-bit little-endian PCM (same sample rate). */
export function decodeMulaw(mu: Uint8Array): Uint8Array {
  const out = new Uint8Array(mu.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < mu.length; i++) view.setInt16(i * 2, mulawToPcm16(mu[i]), true);
  return out;
}

/** 16-bit little-endian PCM -> mu-law bytes (same sample rate). */
export function encodeMulaw(pcm: Uint8Array): Uint8Array {
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const n = Math.floor(pcm.byteLength / 2);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = pcm16ToMulaw(view.getInt16(i * 2, true));
  return out;
}

/** 8 kHz -> 16 kHz, interpolating between samples so the result is not harsh. */
export function upsample8kTo16k(pcm8k: Uint8Array): Uint8Array {
  const src = new DataView(pcm8k.buffer, pcm8k.byteOffset, pcm8k.byteLength);
  const n = Math.floor(pcm8k.byteLength / 2);
  const out = new Uint8Array(n * 4);
  const dst = new DataView(out.buffer);
  for (let i = 0; i < n; i++) {
    const a = src.getInt16(i * 2, true);
    const b = i + 1 < n ? src.getInt16((i + 1) * 2, true) : a;
    dst.setInt16(i * 4, a, true);
    dst.setInt16(i * 4 + 2, (a + b) >> 1, true);
  }
  return out;
}

/** 24 kHz or 16 kHz -> 8 kHz, averaging each group so it does not sound grainy. */
export function downsampleTo8k(pcm: Uint8Array, fromRate = 24000): Uint8Array {
  const step = Math.round(fromRate / 8000);
  if (step <= 1) return pcm;
  const src = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const inSamples = Math.floor(pcm.byteLength / 2);
  const outSamples = Math.floor(inSamples / step);
  const out = new Uint8Array(outSamples * 2);
  const dst = new DataView(out.buffer);
  for (let i = 0; i < outSamples; i++) {
    let sum = 0;
    for (let k = 0; k < step; k++) sum += src.getInt16((i * step + k) * 2, true);
    dst.setInt16(i * 2, Math.round(sum / step), true);
  }
  return out;
}

// ─── base64 (chunked, so long frames never blow the call stack) ───────────────

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Phone audio -> base64 PCM 16 kHz for the AI. Gateways differ: most send mu-law at 8 kHz, some
 * send linear PCM, so the format the stream announced decides how it is read.
 */
export function phoneToEngine(b64: string, encoding = 'audio/x-mulaw', sampleRate = 8000): string {
  const raw = base64ToBytes(b64);
  const enc = encoding.toLowerCase();
  const isLinear = (enc.includes('l16') || enc.includes('pcm')) && !enc.includes('pcmu');
  const pcm = isLinear ? raw : decodeMulaw(raw);
  const rate = isLinear ? sampleRate : 8000;
  return bytesToBase64(rate === 16000 ? pcm : upsample8kTo16k(pcm));
}

/** AI audio (base64 PCM at `rate`) -> base64 mu-law 8 kHz for the phone. */
export const engineToPhone = (b64: string, rate = 24000): string =>
  bytesToBase64(encodeMulaw(downsampleTo8k(base64ToBytes(b64), rate)));

/** How long (ms) a block of mu-law 8 kHz audio takes to play: 8 bytes per millisecond. */
export const mulawMs = (b64Length: number): number => ((b64Length * 3) / 4) / 8;

// ─── Phone-quality conversion ─────────────────────────────────────────────────
//
// The helpers above convert each chunk on its own and average groups of samples, which is a very weak filter:
// everything the voice has above 4 kHz is folded back into the speech band as a metallic, "radio" buzz, and any
// chunk that does not hold a whole number of samples loses its tail and clicks at the join. This section does the
// job properly: a long low-pass filter before the sample rate is cut, kept running across chunks, followed by a
// gentle level stage so the voice sits at a comfortable volume without clipping on the narrow phone codec.

/** Zeroth-order modified Bessel function, needed by the Kaiser window. */
function bessel0(x: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; k < 60; k++) {
    term *= (x / (2 * k)) ** 2;
    sum += term;
    if (term < 1e-12 * sum) break;
  }
  return sum;
}

/**
 * Low-pass filter taps (Kaiser-windowed sinc): flat up to `passHz`, at least `stopDb` quieter from `stopHz` on,
 * and exactly unity gain at DC.
 */
export function designLowpass(fs: number, passHz: number, stopHz: number, stopDb = 70): Float64Array {
  const dw = (2 * Math.PI * (stopHz - passHz)) / fs;
  let taps = Math.ceil((stopDb - 8) / (2.285 * dw)) + 1;
  if (taps % 2 === 0) taps++;
  const beta = 0.1102 * (stopDb - 8.7);
  const fc = (passHz + stopHz) / 2 / fs; // cycles per sample, centre of the transition band
  const mid = (taps - 1) / 2;
  const h = new Float64Array(taps);
  const norm = bessel0(beta);
  let sum = 0;
  for (let n = 0; n < taps; n++) {
    const x = n - mid;
    const sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
    const r = mid === 0 ? 0 : x / mid;
    h[n] = sinc * (bessel0(beta * Math.sqrt(Math.max(0, 1 - r * r))) / norm);
    sum += h[n];
  }
  for (let n = 0; n < taps; n++) h[n] /= sum;
  return h;
}

/** Telephone speech lives below about 3.4 kHz; anything from 4.6 kHz up would fold back into it at 8 kHz. */
const PASS_HZ = 3400;
const STOP_HZ = 4600;

/**
 * Cuts the sample rate to 8 kHz (from 16 or 24 kHz) with a proper anti-aliasing filter. It remembers the end of
 * the previous chunk, so audio can arrive in chunks of any size (even a half sample) and still come out as one
 * continuous signal.
 */
export class Decimator {
  private readonly h: Float64Array;
  private hist: Float64Array;
  /** Where the next output sample falls inside the next input block. */
  private phase = 0;
  /** A chunk that ended in the middle of a 16-bit sample leaves its first byte here. */
  private odd = -1;

  readonly factor: number;

  constructor(fromRate: number) {
    if (fromRate % 8000 !== 0) throw new Error(`Cannot convert ${fromRate} Hz to 8 kHz`);
    this.factor = fromRate / 8000;
    this.h = this.factor === 1 ? new Float64Array([1]) : designLowpass(fromRate, PASS_HZ, STOP_HZ);
    this.hist = new Float64Array(this.h.length - 1);
  }

  reset() {
    this.hist = new Float64Array(this.h.length - 1);
    this.phase = 0;
    this.odd = -1;
  }

  /** 16-bit little-endian PCM at `fromRate` in; samples at 8 kHz out (on the 16-bit scale, not rounded). */
  process(pcm: Uint8Array): Float64Array {
    let bytes = pcm;
    if (this.odd >= 0) {
      bytes = new Uint8Array(pcm.length + 1);
      bytes[0] = this.odd;
      bytes.set(pcm, 1);
    }
    this.odd = bytes.length & 1 ? bytes[bytes.length - 1] : -1;
    const n = bytes.length >> 1;
    const view = new DataView(bytes.buffer, bytes.byteOffset, n * 2);

    const taps = this.h.length;
    const x = new Float64Array(taps - 1 + n);
    x.set(this.hist);
    for (let i = 0; i < n; i++) x[taps - 1 + i] = view.getInt16(i * 2, true);

    const out: number[] = [];
    let i = this.phase;
    for (; i < n; i += this.factor) {
      let acc = 0;
      const base = i + taps - 1;
      for (let j = 0; j < taps; j++) acc += this.h[j] * x[base - j];
      out.push(acc);
    }
    this.phase = i - n;
    this.hist = x.slice(n); // the last taps-1 samples
    return Float64Array.from(out);
  }
}

/** Soft limiter: untouched up to `knee`, then rounded off smoothly so peaks never reach full scale or clip. */
export function softLimit(x: number, knee = 0.8 * 32767): number {
  const a = Math.abs(x);
  if (a <= knee) return x;
  const room = 32767 - knee;
  const y = knee + room * Math.tanh((a - knee) / room);
  return x < 0 ? -y : y;
}

export interface ConditionerOptions {
  /** Level speech is brought to, in dB below full scale (RMS). Voices land around -19 measured as active speech with the default of -21. */
  targetDb?: number;
  /** Most it will ever turn quiet speech up, in dB. */
  maxBoostDb?: number;
  /** Most it will ever turn loud speech down, in dB. */
  maxCutDb?: number;
}

/**
 * Keeps the voice at a steady, comfortable level whichever voice is speaking: quiet speech is lifted toward
 * `targetDb` (a quiet voice sounds hissy because the phone codec's own noise stays the same size) and a very
 * loud one is brought down (a hot signal gets squashed by the network). The gain moves smoothly, on a time scale
 * that does not depend on how big the chunks happen to be, and peaks go through the soft limiter. Silence between
 * words is not amplified.
 */
export class VoiceConditioner {
  /** Smoothed mean square of the speech so far (energy, not an average of RMS values, which under-reads lively speech). */
  private energy = 0;
  private gain = 1;
  private readonly target: number;
  private readonly maxGain: number;
  private readonly minGain: number;
  /** Frames quieter than this (dB below full scale) are treated as silence. */
  private static readonly GATE = 10 ** (-50 / 20) * 32767;
  /** How quickly the measured level and the gain follow the voice, in seconds. */
  private static readonly LEVEL_TAU = 0.4;
  private static readonly GAIN_TAU = 0.25;

  constructor(opts: ConditionerOptions = {}) {
    this.target = 10 ** ((opts.targetDb ?? -21) / 20) * 32767;
    this.maxGain = 10 ** ((opts.maxBoostDb ?? 9) / 20);
    this.minGain = 10 ** (-(opts.maxCutDb ?? 8) / 20);
  }

  /** Forgets the level. (The filter is reset separately; the level carries on between sentences on purpose.) */
  reset() {
    this.energy = 0;
    this.gain = 1;
  }

  process(samples: Float64Array): Int16Array {
    const n = samples.length;
    const out = new Int16Array(n);
    if (!n) return out;
    const seconds = n / 8000;

    let sq = 0;
    for (let i = 0; i < n; i++) sq += samples[i] * samples[i];
    const meanSquare = sq / n;
    if (Math.sqrt(meanSquare) > VoiceConditioner.GATE) {
      this.energy = this.energy === 0
        ? meanSquare
        : this.energy + (1 - Math.exp(-seconds / VoiceConditioner.LEVEL_TAU)) * (meanSquare - this.energy);
    }
    const level = Math.sqrt(this.energy);
    const wanted = level > 0 ? Math.min(this.maxGain, Math.max(this.minGain, this.target / level)) : 1;
    // Ramp across the chunk so a change in gain is never a step.
    const next = this.gain + (1 - Math.exp(-seconds / VoiceConditioner.GAIN_TAU)) * (wanted - this.gain);
    for (let i = 0; i < n; i++) {
      const g = this.gain + ((next - this.gain) * (i + 1)) / n;
      out[i] = Math.round(softLimit(samples[i] * g));
    }
    this.gain = next;
    return out;
  }
}

/**
 * Everything between the AI's voice and the phone line, for one direction of one call: filter down to 8 kHz,
 * level, limit, and encode as mu-law. Keep one per call (the filter and level stages remember the last chunk).
 */
export class PhoneEncoder {
  private readonly decimator: Decimator;
  private readonly conditioner: VoiceConditioner;

  constructor(fromRate = 24000, opts: ConditionerOptions = {}) {
    this.decimator = new Decimator(fromRate);
    this.conditioner = new VoiceConditioner(opts);
  }

  /** Call when the caller talks over the AI: the next sentence starts with a clean filter (the level carries on). */
  reset() {
    this.decimator.reset();
  }

  /** Base64 16-bit PCM from the AI → base64 mu-law 8 kHz for the phone, plus how long it plays (ms). */
  encode(b64: string): { payload: string; ms: number } {
    const pcm = this.conditioner.process(this.decimator.process(base64ToBytes(b64)));
    const mu = new Uint8Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) mu[i] = pcm16ToMulaw(pcm[i]);
    return { payload: bytesToBase64(mu), ms: mu.length / 8 };
  }
}

```

### 10. Call-related helpers: `_shared/aiCall.ts`

```typescript
/**
 * Shared logic for AI calls (the assistant phones someone on the user's behalf).
 * Pure functions only, so they can be tested without Deno or the network.
 */

// ─── Phone numbers ───────────────────────────────────────────────────────────

/** Emergency and public-service short codes in India. Never dialled by the assistant. */
const EMERGENCY = new Set(['100', '101', '102', '108', '112', '181', '1070', '1077', '1078', '1091', '1098', '1363', '1930']);

export type NumberCheck = { ok: true; e164: string } | { ok: false; reason: string };

/**
 * Accepts Indian mobile and landline numbers in the usual formats and returns +91XXXXXXXXXX.
 * Rejects emergency numbers, short codes, premium lines and numbers from other countries.
 */
export function checkPhoneNumber(input: string): NumberCheck {
  const raw = (input ?? '').trim();
  const digitsOnly = raw.replace(/\D/g, '');
  if (EMERGENCY.has(digitsOnly)) {
    return { ok: false, reason: 'The assistant never calls emergency numbers. Please dial them yourself.' };
  }

  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) {
    if (!d.startsWith('+91')) return { ok: false, reason: 'AI calls only work for Indian phone numbers (+91) for now.' };
    d = d.slice(3);
  } else if (d.startsWith('0091')) {
    d = d.slice(4);
  } else if (d.startsWith('91') && d.length === 12) {
    d = d.slice(2);
  } else if (d.startsWith('0') && d.length === 11) {
    d = d.slice(1); // STD code form such as 022 1234 5678
  }

  if (!/^[2-9]\d{9}$/.test(d)) {
    return { ok: false, reason: 'That does not look like a valid 10-digit Indian phone number.' };
  }
  // Premium / toll style ranges are not something a personal assistant should dial.
  if (/^(19|18)/.test(d) || d.startsWith('900') || d.startsWith('909')) {
    return { ok: false, reason: 'That number cannot be called by the assistant.' };
  }
  return { ok: true, e164: `+91${d}` };
}

/** Speakable form for confirmations: "+91 98765 43210". */
export function formatForSpeech(e164: string): string {
  const d = e164.replace(/^\+91/, '');
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

// ─── Request cleaning ────────────────────────────────────────────────────────

/** Trims, collapses whitespace and removes control characters. */
export function cleanText(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Names go into spoken sentences and prompts, so keep them to plain text. */
export function cleanName(value: unknown): string {
  return cleanText(String(value ?? '').replace(/["'`<>{}\\]/g, ''), 60);
}

export type CallLanguage = 'english' | 'hindi' | 'hinglish';

export function normaliseLanguage(value: unknown): CallLanguage {
  const v = String(value ?? '').toLowerCase();
  return v === 'hindi' || v === 'hinglish' ? v : 'english';
}

// ─── The AI's instructions for the call ──────────────────────────────────────

export interface CallBrief {
  userName: string;
  toName: string;
  purpose: string;
  details: string;
  language: CallLanguage;
  now: Date;
}

const LANGUAGE_RULE: Record<CallLanguage, string> = {
  english: 'Speak in clear, simple English. If the other person answers in Hindi, switch to Hindi.',
  hindi: 'Speak in Hindi (Devanagari-friendly, everyday spoken Hindi). If the other person prefers English, switch to English.',
  hinglish: 'Speak in natural Hinglish: everyday Hindi mixed with common English words. Match whichever the other person uses.',
};

export function openingLine(brief: Pick<CallBrief, 'userName' | 'toName' | 'language'>): string {
  const who = brief.userName || 'a customer';
  const name = brief.toName ? `, ${brief.toName}` : '';
  if (brief.language === 'hindi' || brief.language === 'hinglish') {
    return `नमस्ते${name}। मैं एक एआई असिस्टेंट हूँ और ${who} की तरफ़ से कॉल कर रहा हूँ। यह कॉल रिकॉर्ड हो रही है ताकि मैं आपकी बात उन तक पहुँचा सकूँ। क्या आपके पास एक मिनट है?`;
  }
  return `Hello${name}. I'm an AI assistant calling on behalf of ${who}. This call is recorded so I can pass your reply on. Do you have a minute?`;
}

export function closingLine(language: CallLanguage): string {
  return language === 'english'
    ? 'Thank you for your time. Goodbye!'
    : 'आपके समय के लिए धन्यवाद। नमस्ते!';
}

/** The system prompt that keeps the AI on task and safe. */
export function callSystemPrompt(brief: CallBrief): string {
  const today = brief.now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  return `You are an AI voice assistant making a short phone call on behalf of ${brief.userName || 'a customer'} of the WishMe app. You are speaking to ${brief.toName || 'the person who answers'}.

TODAY: ${today} (India time).

YOUR TASK: ${brief.purpose}
${brief.details ? `EXTRA DETAILS FROM THE USER: ${brief.details}` : ''}

HOW TO BEHAVE
- You have already said who you are and that the call is recorded. If asked, say plainly that you are an AI assistant calling for ${brief.userName || 'your customer'}. Never pretend to be a human.
- ${LANGUAGE_RULE[brief.language]}
- Be polite, brief and natural. One or two short sentences at a time. Ask one question at a time.
- Get what the task needs (for example an appointment date and time, whether something is possible, a price), then repeat the key details back to confirm: names, dates, times, amounts.
- If the person is busy or asks you to call later, ask when, thank them and end the call.
- If a choice or a decision is needed that the user did not authorise (a different time, a fee, extra tests), do NOT agree. Say you will check with ${brief.userName || 'them'} and get back, and note the options.
- NEVER share or ask for card numbers, bank details, OTPs, PINs, passwords or ID numbers. Never agree to pay anything on the call.
- Do not give medical, legal or financial advice. Do not argue.
- If you reach voicemail or an answering machine: leave one short message (who you are, who you call for, the reason, and that they can call ${brief.userName || 'them'} back), then end the call.
- If the person asks not to be called again, apologise, confirm you will not call again, and end the call.
- If the call is not going anywhere after a few tries, thank them and end it politely. Keep the whole call under about 3 minutes.`;
}

export const SUMMARY_PROMPT =
  "Summarise this phone call in 2 to 4 short plain sentences for the person who asked for it. Say what the other person said and what was decided: dates, times, names, prices, anything promised, and anything the user still needs to do. If nobody picked up or it went to voicemail, say so. Do not invent details.";

export const STRUCTURED_SCHEMA = {
  type: 'object',
  properties: {
    outcome: {
      type: 'string',
      enum: ['success', 'partial', 'declined', 'no_info', 'callback_requested'],
      description: 'success = the task was done; partial = some of it; declined = they said no; no_info = nothing useful learned; callback_requested = they asked to be called back later',
    },
    next_step: { type: 'string', description: 'What the user should do next, in one short sentence. Empty if nothing.' },
    opted_out: { type: 'boolean', description: 'True only if the person asked not to be called again.' },
  },
  required: ['outcome'],
};

/** The assistant object sent to Vapi for one call. */
export function buildVapiAssistant(brief: CallBrief, opts: { voiceId: string; webhookUrl: string; webhookSecret: string }) {
  return {
    name: 'WishMe call assistant',
    firstMessageMode: 'assistant-speaks-first',
    firstMessage: openingLine(brief),
    endCallMessage: closingLine(brief.language),
    endCallPhrases: ['goodbye', 'bye bye', 'dhanyavaad', 'namaste'],
    maxDurationSeconds: 240,
    silenceTimeoutSeconds: 25,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [{ role: 'system', content: callSystemPrompt(brief) }],
    },
    voice: {
      provider: '11labs',
      voiceId: opts.voiceId,
      model: 'eleven_multilingual_v2',
      stability: 0.6,
      similarityBoost: 0.75,
    },
    transcriber: { provider: 'deepgram', model: 'nova-3', language: 'multi' },
    server: { url: opts.webhookUrl, secret: opts.webhookSecret },
    serverMessages: ['end-of-call-report', 'status-update'],
    artifactPlan: { recordingEnabled: true },
    analysisPlan: {
      summaryPrompt: SUMMARY_PROMPT,
      structuredDataPlan: { enabled: true, schema: STRUCTURED_SCHEMA },
    },
  };
}

// ─── Webhook helpers ─────────────────────────────────────────────────────────

/** Maps Vapi's "ended reason" to a status the app can show. */
export function statusFromEndedReason(reason: string | undefined | null): 'completed' | 'no-answer' | 'busy' | 'voicemail' | 'failed' {
  const r = String(reason ?? '').toLowerCase();
  if (r.includes('voicemail')) return 'voicemail';
  if (r.includes('did-not-answer') || r.includes('no-answer')) return 'no-answer';
  if (r.includes('busy')) return 'busy';
  if (r.includes('error') || r.includes('failed') || r.includes('invalid') || r.includes('unreachable') || r.includes('rejected')) return 'failed';
  return 'completed';
}

export function formatTranscript(raw: unknown): string {
  if (typeof raw === 'string') return raw.slice(0, 12000);
  if (!Array.isArray(raw)) return '';
  return raw
    .map((t: { role?: string; message?: string; text?: string }) => {
      const who = t.role === 'assistant' || t.role === 'bot' ? 'AI' : t.role === 'user' ? 'Them' : '';
      const text = (t.message ?? t.text ?? '').trim();
      return who && text ? `${who}: ${text}` : '';
    })
    .filter(Boolean)
    .join('\n')
    .slice(0, 12000);
}

/** Constant-time string comparison (for the webhook secret). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

```

---

## What is not verified from the code alone

- **Actual prompt wording as sent to the model at runtime** comes from `callPrompt.ts` plus the per-call purpose and details. The purpose text is written by the user's request, so it differs per call.
- **Vobiz billing and the Vobiz time-limit behaviour** are not in the code; they come from Vobiz. The rate per minute is not in the docs (see the Vobiz console).
- **Settings values in the database** can change; check `platform_settings` for the current values.
- **Sarvam voice quality and the speaker names** (`ritu`, `shubh`) for every Indian language are not confirmed by listening tests in this document.
