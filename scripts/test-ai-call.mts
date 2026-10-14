/**
 * Places ONE real test call and follows it to the end, so you can pick up and talk to the AI.
 *
 *   node scripts/test-ai-call.mts            full path: your WishMe login -> ai-call-start -> Vapi -> webhook -> ai_calls
 *   node scripts/test-ai-call.mts direct     Vapi only (needs VAPI_API_KEY and VAPI_PHONE_NUMBER_ID in your shell)
 *   DRY_RUN=1 node scripts/test-ai-call.mts  prints what the AI would be told, calls nobody
 *
 * Optional: TEST_PHONE (default +91 7038997834), TEST_PURPOSE, WISHME_EMAIL, WISHME_PASSWORD.
 * Nothing secret is ever printed. The password is typed hidden, and the call only starts after you press Enter.
 */

import { readFileSync } from 'node:fs';
import {
  buildVapiAssistant,
  callSystemPrompt,
  checkPhoneNumber,
  formatForSpeech,
  statusFromEndedReason,
} from '../supabase/functions/_shared/aiCall.ts';

const SUPABASE_URL = 'https://eqikeuqwbphwongtfzhe.supabase.co';
const DEFAULT_PURPOSE =
  'This is a short test call from the WishMe app. Say hello, explain that it is a test of the WishMe AI assistant, then have a friendly chat of about two minutes: ask how their day is going, ask what their favourite food is and why, react naturally to what they say, then thank them and say goodbye.';

const mode = process.argv[2] === 'direct' ? 'direct' : 'full';
const dryRun = process.env.DRY_RUN === '1';
const purpose = (process.env.TEST_PURPOSE ?? DEFAULT_PURPOSE).slice(0, 600);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const say = (s = '') => console.log(s);
function die(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

// ─── Terminal input ──────────────────────────────────────────────────────────

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const raw = hidden && stdin.isTTY;
    let buf = '';
    const finish = () => {
      stdin.off('data', onData);
      if (raw) stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
      resolve(buf.trim());
    };
    const onData = (chunk: string) => {
      for (const c of chunk) {
        if (c === '\u0003') {
          process.stdout.write('\n');
          process.exit(130);
        }
        if (c === '\r' || c === '\n') return finish();
        if (raw) {
          if (c === '\u007f' || c === '\b') buf = buf.slice(0, -1);
          else buf += c;
        } else buf += c;
      }
    };
    if (raw) stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

// ─── Shared ──────────────────────────────────────────────────────────────────

const number = checkPhoneNumber(process.env.TEST_PHONE ?? '+91 7038997834');
if (!number.ok) die(number.reason);
const e164 = number.e164;

const brief = {
  userName: 'a WishMe tester',
  toName: '',
  purpose,
  details: '',
  language: 'english' as const,
  now: new Date(),
};

if (dryRun) {
  say(`Would call: ${formatForSpeech(e164)}  (${mode} mode)\n`);
  say('— First thing the AI says —');
  say(buildVapiAssistant(brief, { voiceId: 'x', webhookUrl: 'x', webhookSecret: 'x' }).firstMessage);
  say('\n— What the AI is told —');
  say(callSystemPrompt(brief));
  process.exit(0);
}

function anonKey(): string {
  if (process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
  try {
    const file = new URL('../../wishme-mobile-app/artifacts/mobile/constants/supabase.ts', import.meta.url);
    const m = readFileSync(file, 'utf8').match(/eyJ[\w.-]+/);
    if (m) return m[0];
  } catch {
    /* fall through */
  }
  return die('Could not find the Supabase anon key. Set SUPABASE_ANON_KEY and run again.');
}

const ACTIVE = new Set(['queued', 'scheduled', 'ringing', 'in-progress']);
const LIMIT_MS = 7 * 60_000;

// ─── Full path: the same thing the app does ──────────────────────────────────

async function full() {
  const key = anonKey();
  const email = process.env.WISHME_EMAIL || (await ask('WishMe login email: '));
  const password = process.env.WISHME_PASSWORD || (await ask('Password (typing is hidden): ', true));
  if (!email || !password) die('An email and password are needed to place the call as you.');

  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = (await login.json().catch(() => ({}))) as { access_token?: string; error_description?: string; msg?: string };
  if (!login.ok || !session.access_token) die(`Login failed: ${session.error_description ?? session.msg ?? login.status}`);
  const token = session.access_token;
  say('✓ Logged in.');

  await ask(`\nReady to call ${formatForSpeech(e164)}. Keep your phone near you and pick up when it rings.\nPress Enter to place the call (Ctrl+C to cancel) `);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-call-start`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: e164, purpose, language: 'english', confirmed: true }),
  });
  const started = (await res.json().catch(() => ({}))) as { callId?: string; error?: string };
  if (!res.ok || !started.callId) {
    const hint: Record<number, string> = {
      503: 'The server is missing a secret. Set VAPI_API_KEY, VAPI_PHONE_NUMBER_ID and AI_CALL_WEBHOOK_SECRET in Supabase (supabase secrets set ...).',
      502: 'Vapi refused to place the call. Check the ai-call-start function logs in Supabase: usually a bad VAPI_API_KEY / VAPI_PHONE_NUMBER_ID, or the Vapi number is not allowed to dial India.',
      429: 'Limit reached (5 AI calls per day, or the same number was called twice in 30 minutes).',
      402: 'Wallet balance is too low for the call price.',
    };
    die(`ai-call-start answered ${res.status}: ${started.error ?? 'no message'}${hint[res.status] ? `\n  → ${hint[res.status]}` : ''}`);
  }
  say(`✓ Call requested (id ${started.callId}). Your phone should ring shortly.\n`);

  const began = Date.now();
  let last = '';
  let row: Record<string, any> | null = null;
  while (Date.now() - began < LIMIT_MS) {
    await sleep(4000);
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_calls?id=eq.${started.callId}&select=status,duration_seconds,ended_reason,transcript,summary,outcome,next_step,error_message,recording_url`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } },
    );
    row = r.ok ? ((await r.json()) as Record<string, any>[])[0] ?? null : null;
    if (!row) continue;
    if (row.status !== last) {
      last = row.status;
      say(`  [${Math.round((Date.now() - began) / 1000)}s] status: ${row.status}`);
    }
    if (!ACTIVE.has(row.status)) break;
    if (row.status === 'queued' && Date.now() - began > 90_000) {
      say('  … still "queued" after 90 s. Vapi has not reported back: the webhook secret (AI_CALL_WEBHOOK_SECRET) probably does not match the one Vapi was given.');
      break;
    }
  }
  if (!row) die('Could not read the call back from the database.');
  report(row);
}

// ─── Direct: Vapi only ───────────────────────────────────────────────────────

async function direct() {
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!apiKey || !phoneNumberId) die('Direct mode needs VAPI_API_KEY and VAPI_PHONE_NUMBER_ID set in your shell.');

  const assistant: Record<string, unknown> = buildVapiAssistant(brief, {
    voiceId: process.env.VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM',
    webhookUrl: '',
    webhookSecret: '',
  });
  delete assistant.server; // nothing to report back to: this run follows the call itself
  delete assistant.serverMessages;

  await ask(`Ready to call ${formatForSpeech(e164)} through Vapi. Pick up when it rings.\nPress Enter to place the call (Ctrl+C to cancel) `);
  const res = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumberId, customer: { number: e164 }, assistant }),
  });
  const text = await res.text();
  if (!res.ok) die(`Vapi answered ${res.status}: ${text.slice(0, 500)}`);
  const id = (JSON.parse(text) as { id: string }).id;
  say(`✓ Call requested (id ${id}). Your phone should ring shortly.\n`);

  const began = Date.now();
  let last = '';
  let call: Record<string, any> = {};
  while (Date.now() - began < LIMIT_MS) {
    await sleep(4000);
    const r = await fetch(`https://api.vapi.ai/call/${id}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!r.ok) continue;
    call = (await r.json()) as Record<string, any>;
    if (call.status !== last) {
      last = call.status;
      say(`  [${Math.round((Date.now() - began) / 1000)}s] status: ${call.status}`);
    }
    if (call.status === 'ended') break;
  }
  // The summary is written a few seconds after the call ends.
  for (let i = 0; i < 6 && call.status === 'ended' && !call.analysis?.summary; i++) {
    await sleep(4000);
    const r = await fetch(`https://api.vapi.ai/call/${id}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (r.ok) call = (await r.json()) as Record<string, any>;
  }
  report({
    status: call.status === 'ended' ? statusFromEndedReason(call.endedReason) : call.status,
    ended_reason: call.endedReason,
    duration_seconds: call.startedAt && call.endedAt ? Math.round((+new Date(call.endedAt) - +new Date(call.startedAt)) / 1000) : null,
    transcript: call.artifact?.transcript ?? call.transcript,
    summary: call.analysis?.summary,
    outcome: call.analysis?.structuredData?.outcome,
    next_step: call.analysis?.structuredData?.next_step,
  });
}

function report(row: Record<string, any>) {
  say('\n──────── Result ────────');
  say(`Status      : ${row.status}${row.ended_reason ? `  (${row.ended_reason})` : ''}`);
  if (row.duration_seconds != null) say(`Duration    : ${row.duration_seconds}s`);
  if (row.outcome) say(`Outcome     : ${row.outcome}`);
  if (row.summary) say(`Summary     : ${row.summary}`);
  if (row.next_step) say(`Next step   : ${row.next_step}`);
  if (row.error_message) say(`Error       : ${row.error_message}`);
  if (row.transcript) say(`\nTranscript:\n${row.transcript}`);
  if (ACTIVE.has(row.status)) say('\n⚠ The call had not finished when this script stopped waiting.');
  else if (row.status === 'completed') say('\n✓ The AI placed the call, spoke with you, and the result came back.');
  else say(`\n⚠ The call ended as "${row.status}", so the pipeline works but nobody had a conversation.`);
}

await (mode === 'direct' ? direct() : full());
process.exit(0);
