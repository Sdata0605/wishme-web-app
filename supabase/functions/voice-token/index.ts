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
async function mintGeminiToken(apiKey: string, now: number): Promise<string> {
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

Deno.serve(async (req) => {
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
    // session; the anon key alone is rejected), the request body and the cached configuration.
    const [authResult, body, config] = await Promise.all([
      supabase.auth.getUser(),
      req.json().catch(() => ({})),
      loadConfig(),
    ]);
    const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
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

    const token = await mintGeminiToken(geminiKey, Date.now());

    // The admin's choice rides along, so the app learns which engine is active without a second request.
    return json({ engine, token, model: LIVE_MODEL, fallback_engine: fallbackEngine, relay_url: relayUrl });
  } catch (err) {
    console.error('[voice-token] failed:', err);
    return json({ error: 'Could not start voice session' }, 500);
  }
});
