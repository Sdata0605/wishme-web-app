import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";

/**
 * voice-token — tells the app which voice engine to use and how to start it.
 *
 *   engine "gemini": returns a single-use, short-lived Gemini Live token (the key stays on the server)
 *   engine "sarvam": returns the relay URL; the app then connects to the sarvam-voice function
 *
 * The admin chooses the engine in the admin panel (platform_settings.ai_voice_engine). An app that
 * does not say it supports Sarvam (send {"supports": ["gemini","sarvam"]}) always gets Gemini.
 * API keys come from the encrypted store managed in the admin panel, falling back to server secrets.
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Only logged-in users may open a voice session (the anon key alone is rejected).
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const supports: string[] = Array.isArray(body?.supports) ? body.supports : ['gemini'];

    // Admin-managed settings and keys (service role: not readable from the app).
    const db = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: settings } = await db
      .from('platform_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['ai_voice_engine', 'ai_voice_fallback']);
    const setting = (k: string) => settings?.find((s: { setting_key: string }) => s.setting_key === k)?.setting_value;

    const keyFor = async (vaultName: string, envNames: string[]) => {
      const { data } = await db.rpc('ai_secret_get', { p_name: vaultName });
      if (typeof data === 'string' && data) return data;
      for (const n of envNames) {
        const v = Deno.env.get(n);
        if (v) return v;
      }
      return '';
    };
    const geminiKey = await keyFor('ai_gemini_api_key', ['GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY']);
    const sarvamKey = await keyFor('ai_sarvam_api_key', ['SARVAM_API_KEY']);

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

    if (engine === 'sarvam') {
      return json({ engine, relay_url: relayUrl, fallback_engine: fallbackEngine });
    }

    const client = new GoogleGenAI({ apiKey: geminiKey, httpOptions: { apiVersion: 'v1beta' } });
    const now = Date.now();

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + SESSION_LIFETIME_MS).toISOString(),
        newSessionExpireTime: new Date(now + NEW_SESSION_WINDOW_MS).toISOString(),
        // Deliberately NOT locked with liveConnectConstraints: a locked token makes Gemini
        // ignore the tools and system instruction the app sends. The token is still
        // single-use, short-lived and only issued to logged-in users.
      },
    });

    return json({ engine, token: token.name, model: LIVE_MODEL, fallback_engine: fallbackEngine });
  } catch (err) {
    console.error('[voice-token] failed:', err);
    return json({ error: 'Could not start voice session' }, 500);
  }
});
