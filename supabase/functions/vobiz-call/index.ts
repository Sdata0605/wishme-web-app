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
import { callToken, loadKey, type Engine } from '../_shared/vobiz.ts';
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
    const res = await fetch(source, { signal: AbortSignal.timeout(60_000) });
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

  const client = db();
  let seq = 0;

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
    'ai_voice_engine', 'ai_voice_fallback', 'ai_call_record',
    'ai_call_sarvam_model', 'ai_call_sarvam_speaker_english', 'ai_call_sarvam_speaker_hindi',
  ]);
  const get = (k: string) => settings?.find((s: { setting_key: string }) => s.setting_key === k)?.setting_value;

  const language = (['english', 'hindi', 'hinglish'].includes(row.language) ? row.language : 'english') as CallBrief['language'];
  const wanted: Engine = get('ai_voice_engine') === 'sarvam' ? 'sarvam' : 'gemini';
  // The voice is chosen first because its gender decides the Hindi grammar the AI must use.
  const sarvamVoice = chooseSarvamVoice(get, language);

  const brief: CallBrief = {
    userName: await callerName(row.user_id),
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
  if (!greeted) { greeted = true; bridge.greet(); }
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
      if (FINISHED.includes(row.status)) return xml('<Hangup/>');
      await db().from('ai_calls').update({ status: 'in-progress', started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', row.id);
      console.log(`[vobiz-call ${row.id.slice(0, 8)}] answered`);

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
