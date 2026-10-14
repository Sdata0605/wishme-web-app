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
