import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * voice-token — tells the app which voice engine to use and how to start it.
 *
 *   engine "gemini": returns a single-use, short-lived Gemini Live token (the key stays on the server)
 *   engine "sarvam": returns the relay URL; the app then connects to the sarvam-voice function
 *
 * The admin chooses the engine in the admin panel (platform_settings.ai_voice_engine). An app that
 * does not say it supports Sarvam (send {"supports": ["gemini","sarvam"]}) always gets Gemini.
 * An app that sends {"want": "gemini"} gets a Gemini token whatever the admin chose, with the admin's choice
 * (engine, fallback_engine, relay_url) in the same answer, so it needs only one request to start up.
 * API keys come from the encrypted store managed in the admin panel, falling back to server secrets.
 *
 * The token is minted with a plain HTTPS call. The Google SDK used to be loaded for this, and importing it was
 * the slowest part of a cold start; it is now only loaded if the plain call fails.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LIVE_MODEL = Deno.env.get('GEMINI_LIVE_MODEL') || 'gemini-3.8-live';

// Token is valid for a single session start within 1 minute, and the session may
// keep sending messages for 30 minutes (the app reconnects with session resumption).
const NEW_SESSION_WINDOW_MS = 60 * 1000;
const SESSION_LIFETIME_MS = 30 * 60 * 1000;
// A spare token (asked for by the app right after it connects, and saved on the phone for the next connection) may wait up to 12 hours
// before its session starts, and then still has at least 7 hours to run. Google allows a token to live for at most 20 hours, so the
// life is set a little under that (clocks differ by seconds).
const SPARE_WINDOW_MS = 12 * 60 * 60 * 1000;
const SPARE_LIFETIME_MS = 19 * 60 * 60 * 1000 + 50 * 60 * 1000;

/**
 * What the admin chose and the API keys change rarely, and reading them was four database round trips, one after the other,
 * on every tap. They are kept for a minute per worker instead. The login check still runs on every request.
 */
const CONFIG_TTL_MS = 60 * 1000;
let configCache: { at: number; settings: { setting_key: string; setting_value: string }[]; geminiKey: string; sarvamKey: string } | null = null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Mints a single-use Live token: POST /v1beta/auth_tokens, exactly what the SDK sends. */
let lastWindowMs = NEW_SESSION_WINDOW_MS;
async function mintGeminiToken(apiKey: string, now: number, spare = false): Promise<string> {
  lastWindowMs = NEW_SESSION_WINDOW_MS;
  if (spare) {
    // Longer-lived: if Google refuses these times, an ordinary token is minted below instead.
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ uses: 1, expireTime: new Date(now + SPARE_LIFETIME_MS).toISOString(), newSessionExpireTime: new Date(now + SPARE_WINDOW_MS).toISOString() }),
        signal: AbortSignal.timeout(6000),
      });
      const text = await res.text();
      if (res.ok) {
        const name = (JSON.parse(text) as { name?: string }).name;
        if (name) {
          lastWindowMs = SPARE_WINDOW_MS;
          return name;
        }
      }
      console.error('[voice-token] spare token request failed:', res.status, text.slice(0, 200));
    } catch (e) {
      console.error('[voice-token] spare token request threw:', e);
    }
  }
  const config = {
    uses: 1,
    expireTime: new Date(now + SESSION_LIFETIME_MS).toISOString(),
    newSessionExpireTime: new Date(now + NEW_SESSION_WINDOW_MS).toISOString(),
    // Deliberately NOT locked with liveConnectConstraints: a locked token makes Gemini
    // ignore the tools and system instruction the app sends. The token is still
    // single-use, short-lived and only issued to logged-in users.
  };
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(6000),
    });
    const text = await res.text();
    if (res.ok) {
      const name = (JSON.parse(text) as { name?: string }).name;
      if (name) return name;
    }
    console.error('[voice-token] plain token request failed:', res.status, text.slice(0, 200));
  } catch (e) {
    console.error('[voice-token] plain token request threw:', e);
  }
  // Fall back to the SDK, loaded only now (it is slow to import).
  const { GoogleGenAI } = await import('npm:@google/genai');
  const client = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
  const token = await client.authTokens.create({ config });
  return token.name as string;
}

/**
 * Checks a login token's signature here, without a round trip to Supabase's auth service. Needs the project's JWT secret as the
 * function secret WISHME_JWT_SECRET; without it (or when the token does not pass) the caller falls back to the auth service,
 * which stays the authority, so a forged token is still refused and a rotated secret cannot lock everyone out.
 * Returns the user id, or null.
 */
const b64url = (part: string) => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
let hmacKey: CryptoKey | null = null;
let hmacFor = '';
async function verifyLocally(token: string, supabaseUrl: string): Promise<string | null> {
  const secret = Deno.env.get('WISHME_JWT_SECRET');
  if (!secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
    if (header.alg !== 'HS256') return null;
    if (!hmacKey || hmacFor !== secret) {
      hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      hmacFor = secret;
    }
    const signed = await crypto.subtle.verify('HMAC', hmacKey, b64url(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!signed) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
    if (!claims.sub || claims.role !== 'authenticated') return null;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;
    if (claims.iss && !String(claims.iss).startsWith(supabaseUrl)) return null;
    return String(claims.sub);
  } catch {
    return null;
  }
}

/** True until this worker has answered its first request (a cold start). */
let workerWarm = false;

Deno.serve(async (req) => {
  const startedAt = Date.now();
  // Milliseconds since this isolate started: on a cold start that is mostly the time spent loading the imports.
  const isolateAgeMs = Math.round(performance.now());
  const cold = !workerWarm;
  workerWarm = true;
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin-managed settings and keys (service role: not readable from the app).
    const db = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const keyFor = async (vaultName: string, envNames: string[]) => {
      const { data } = await db.rpc('ai_secret_get', { p_name: vaultName });
      if (typeof data === 'string' && data) return data;
      for (const n of envNames) {
        const v = Deno.env.get(n);
        if (v) return v;
      }
      return '';
    };
    const loadConfig = async () => {
      if (configCache && Date.now() - configCache.at < CONFIG_TTL_MS) return configCache;
      const [{ data: settings }, geminiKey, sarvamKey] = await Promise.all([
        db.from('platform_settings').select('setting_key, setting_value').in('setting_key', ['ai_voice_engine', 'ai_voice_fallback']),
        keyFor('ai_gemini_api_key', ['GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY']),
        keyFor('ai_sarvam_api_key', ['SARVAM_API_KEY']),
      ]);
      configCache = { at: Date.now(), settings: settings ?? [], geminiKey, sarvamKey };
      return configCache;
    };

    // Everything that does not depend on the other runs at once: the login check (only logged-in users may open a voice
    // session; the anon key alone is rejected) and the cached configuration.
    const bearer = authHeader.replace(/^Bearer\s+/i, '');
    const mark = { auth: 0, config: 0 };
    const timed = async <T>(key: 'auth' | 'config', work: Promise<T>) => {
      const t = Date.now();
      try {
        return await work;
      } finally {
        mark[key] = Date.now() - t;
      }
    };
    const body = await req.json().catch(() => ({}));
    // A keep-warm ping (sent every minute by a schedule): boots this worker and fills its cache, reveals nothing.
    if (body?.ping === true) {
      const t = Date.now();
      await loadConfig();
      return json({ ok: true, cold, config_ms: Date.now() - t });
    }
    const [localUser, config] = await Promise.all([timed('auth', verifyLocally(bearer, supabaseUrl)), timed('config', loadConfig())]);
    let authMode: 'local' | 'remote' = 'local';
    if (!localUser) {
      authMode = 'remote';
      const t = Date.now();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      mark.auth += Date.now() - t;
      if (authError || !user) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }
    const supports: string[] = Array.isArray(body?.supports) ? body.supports : ['gemini'];
    const { geminiKey, sarvamKey } = config;
    const setting = (k: string) => config.settings.find((s) => s.setting_key === k)?.setting_value;

    const wanted = setting('ai_voice_engine') === 'sarvam' ? 'sarvam' : 'gemini';
    const fallbackOn = setting('ai_voice_fallback') !== 'false';
    // Only use an engine the app understands and that has a key.
    const canUse = (e: string) => supports.includes(e) && (e === 'sarvam' ? !!sarvamKey : !!geminiKey);
    const engine = canUse(wanted) ? wanted : canUse('gemini') ? 'gemini' : canUse('sarvam') ? 'sarvam' : null;
    if (!engine) return json({ error: 'Voice assistant is not configured' }, 500);
    const other = engine === 'sarvam' ? 'gemini' : 'sarvam';
    const fallbackEngine = fallbackOn && canUse(other) ? other : null;

    const relayUrl = `${supabaseUrl.replace('https://', 'wss://')}/functions/v1/sarvam-voice`;
    // The app asks which engine is active at start-up without wanting a token yet.
    if (body?.probe === true) return json({ engine, fallback_engine: fallbackEngine, relay_url: relayUrl });

    // Sarvam is chosen and the app did not ask for a Gemini token: just point it at the relay.
    if (engine === 'sarvam' && !(body?.want === 'gemini' && geminiKey)) {
      return json({ engine, relay_url: relayUrl, fallback_engine: fallbackEngine });
    }

    const mintStart = Date.now();
    const token = await mintGeminiToken(geminiKey, Date.now(), body?.spare === true);
    const timing = { auth_ms: mark.auth, auth_mode: authMode, config_ms: mark.config, mint_ms: Date.now() - mintStart, total_ms: Date.now() - startedAt, cold, isolate_age_ms: isolateAgeMs, spare: body?.spare === true, window_ms: lastWindowMs };
    console.log('[voice-token] timing', JSON.stringify(timing));

    // The admin's choice rides along, so the app learns which engine is active without a second request.
    return new Response(JSON.stringify({ engine, token, model: LIVE_MODEL, fallback_engine: fallbackEngine, relay_url: relayUrl, timing }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Server-Timing': 'auth;dur=' + timing.auth_ms + ', config;dur=' + timing.config_ms + ', mint;dur=' + timing.mint_ms + ', total;dur=' + timing.total_ms,
      },
    });
  } catch (err) {
    console.error('[voice-token] failed:', err);
    return json({ error: 'Could not start voice session' }, 500);
  }
});
