/**
 * ai-assistant-admin — admin-only control of the voice assistant:
 *   status      → active engine, fallback flag, and which API keys are set (last 4 characters only)
 *   set_engine  → choose Gemini or Sarvam (refuses an engine that has no API key)
 *   set_key     → store a Gemini / Sarvam / OpenAI API key encrypted in Supabase Vault (tested first)
 *   clear_key   → remove a stored key (the server secret, if any, is used again)
 *   test_key    → check that a key really works (the typed one, or the one currently in use)
 *
 * Keys are never returned to the browser. Callers must be logged-in admins.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// gemini and sarvam are the two voice engines; openai is not an engine: its key powers the assistant's internet search
// (function web-search), so it can be stored, tested and removed here but never chosen as the voice engine.
type Provider = 'gemini' | 'sarvam' | 'openai';
const PROVIDERS: Record<Provider, { vault: string; env: string[]; label: string }> = {
  gemini: { vault: 'ai_gemini_api_key', env: ['GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY'], label: 'Google Gemini' },
  sarvam: { vault: 'ai_sarvam_api_key', env: ['SARVAM_API_KEY'], label: 'Sarvam AI' },
  openai: { vault: 'ai_openai_api_key', env: ['OPENAI_API_KEY'], label: 'OpenAI (internet search)' },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const envKey = (p: Provider) => {
  for (const name of PROVIDERS[p].env) {
    const v = Deno.env.get(name);
    if (v) return v;
  }
  return '';
};

/** Checks a key against the real service. Gemini: can it mint a Live token? Sarvam: does a tiny chat call work? */
async function testKey(provider: Provider, key: string): Promise<{ ok: boolean; detail: string; ms: number }> {
  const t0 = Date.now();
  try {
    if (provider === 'gemini') {
      const now = Date.now();
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uses: 1,
          expireTime: new Date(now + 5 * 60_000).toISOString(),
          newSessionExpireTime: new Date(now + 60_000).toISOString(),
        }),
      });
      const ms = Date.now() - t0;
      if (res.ok) return { ok: true, detail: 'Key works and can start live voice sessions.', ms };
      return { ok: false, detail: await explain(res, 'Gemini'), ms };
    }
    if (provider === 'openai') {
      // A tiny answer from the same Responses API the search uses (a few tokens, no search call), so a key that is valid
      // but not allowed to use it, or has no credit, is caught here and not in the middle of a user's question.
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4.1-mini', input: 'Reply with the word ok.', max_output_tokens: 16, store: false }),
      });
      const ms = Date.now() - t0;
      if (res.ok) return { ok: true, detail: 'Key works. The assistant will use it to search the internet.', ms };
      return { ok: false, detail: await explain(res, 'OpenAI'), ms };
    }
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'sarvam-105b-conversations', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5, reasoning_effort: 'low' }),
    });
    const ms = Date.now() - t0;
    if (res.ok) return { ok: true, detail: 'Key works.', ms };
    return { ok: false, detail: await explain(res, 'Sarvam'), ms };
  } catch (e) {
    return { ok: false, detail: `Could not reach the service: ${e instanceof Error ? e.message : 'network error'}`, ms: Date.now() - t0 };
  }
}

async function explain(res: Response, who: string): Promise<string> {
  let msg = '';
  try {
    const j = await res.json();
    msg = String(j?.error?.message ?? j?.message ?? j?.error ?? '').slice(0, 160);
  } catch { /* not JSON */ }
  if (res.status === 401 || res.status === 403) return `${who} rejected this key (${res.status}). Check that it is copied correctly. ${msg}`.trim();
  if (res.status === 429) return `${who} says the quota is used up (429). The key is valid but has no capacity right now (check the billing and limits on the provider's dashboard). ${msg}`.trim();
  return `${who} returned ${res.status}. ${msg}`.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    const { data: isAdmin } = await userClient.rpc('is_admin_by_auth_uid');
    if (isAdmin !== true) return json({ error: 'Admin access required' }, 403);
    const adminId = userData.user.id;

    // The service client reads/writes encrypted keys, which no browser or user token can.
    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const audit = async (key_name: string, action: string, success: boolean, error_message?: string) => {
      try {
        await db.from('api_key_audit_log').insert({ admin_user_id: adminId, key_name, action, success, error_message: error_message ?? null });
      } catch { /* the audit trail must never break the action */ }
    };

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'status');

    const loadStatus = async () => {
      const { data: rows } = await db.rpc('ai_secret_status');
      const byName = new Map<string, { last4: string; updated_at: string }>((rows ?? []).map((r: { name: string; last4: string; updated_at: string }) => [r.name, r]));
      const { data: settings } = await db.from('platform_settings').select('setting_key, setting_value, updated_at').in('setting_key', ['ai_voice_engine', 'ai_voice_fallback']);
      const get = (k: string) => settings?.find((s: { setting_key: string }) => s.setting_key === k);
      const keys = {} as Record<Provider, { configured: boolean; source: 'database' | 'server' | 'none'; last4: string | null; updatedAt: string | null }>;
      for (const p of Object.keys(PROVIDERS) as Provider[]) {
        const stored = byName.get(PROVIDERS[p].vault);
        const server = envKey(p);
        keys[p] = stored
          ? { configured: true, source: 'database', last4: stored.last4, updatedAt: stored.updated_at }
          : server
            ? { configured: true, source: 'server', last4: server.slice(-4), updatedAt: null }
            : { configured: false, source: 'none', last4: null, updatedAt: null };
      }
      return {
        engine: get('ai_voice_engine')?.setting_value === 'sarvam' ? 'sarvam' : 'gemini',
        fallback: get('ai_voice_fallback')?.setting_value !== 'false',
        changedAt: get('ai_voice_engine')?.updated_at ?? null,
        keys,
      };
    };

    // The key currently in use for a provider: database value first, then the server secret.
    const activeKey = async (p: Provider) => {
      const { data } = await db.rpc('ai_secret_get', { p_name: PROVIDERS[p].vault });
      return (typeof data === 'string' && data) || envKey(p);
    };

    switch (action) {
      case 'status':
        return json(await loadStatus());

      case 'set_engine': {
        const engine = body.engine as Provider;
        if (engine !== 'gemini' && engine !== 'sarvam') return json({ error: 'Choose gemini or sarvam.' }, 400);
        const status = await loadStatus();
        if (!status.keys[engine].configured) {
          return json({ error: `Add a ${PROVIDERS[engine].label} API key first, then switch to it.` }, 400);
        }
        const now = new Date().toISOString();
        const rows = [
          { setting_key: 'ai_voice_engine', setting_value: engine, description: 'Active voice assistant engine: gemini or sarvam', updated_at: now },
          { setting_key: 'ai_voice_fallback', setting_value: body.fallback === false ? 'false' : 'true', description: 'Fall back to the other voice engine if the active one fails', updated_at: now },
        ];
        const { error } = await db.from('platform_settings').upsert(rows, { onConflict: 'setting_key' });
        if (error) {
          await audit(`engine:${engine}`, 'updated', false, error.message);
          return json({ error: 'Could not save the engine choice.' }, 500);
        }
        await audit(`engine:${engine}`, 'updated', true);
        return json(await loadStatus());
      }

      case 'test_key': {
        const provider = body.provider as Provider;
        if (!PROVIDERS[provider]) return json({ error: 'Unknown provider.' }, 400);
        const typed = typeof body.value === 'string' ? body.value.trim() : '';
        const key = typed || (await activeKey(provider));
        if (!key) return json({ ok: false, detail: `No ${PROVIDERS[provider].label} key is set yet.`, ms: 0 });
        return json(await testKey(provider, key));
      }

      case 'set_key': {
        const provider = body.provider as Provider;
        if (!PROVIDERS[provider]) return json({ error: 'Unknown provider.' }, 400);
        const value = typeof body.value === 'string' ? body.value.trim() : '';
        if (value.length < 8 || value.length > 400 || /\s/.test(value)) {
          return json({ error: 'That does not look like an API key. Paste it without spaces or line breaks.' }, 400);
        }
        // Test before saving, so a typo never replaces a working key. "force" skips this for quota-limited keys.
        if (body.force !== true) {
          const result = await testKey(provider, value);
          if (!result.ok) return json({ error: `Not saved. ${result.detail}`, canForce: true }, 400);
        }
        const { error } = await db.rpc('ai_secret_set', { p_name: PROVIDERS[provider].vault, p_value: value });
        if (error) {
          await audit(PROVIDERS[provider].vault, 'updated', false, error.message);
          return json({ error: 'Could not store the key.' }, 500);
        }
        await audit(PROVIDERS[provider].vault, 'updated', true);
        return json(await loadStatus());
      }

      case 'clear_key': {
        const provider = body.provider as Provider;
        if (!PROVIDERS[provider]) return json({ error: 'Unknown provider.' }, 400);
        const status = await loadStatus();
        // Don't leave the active engine without any key.
        if (provider !== 'openai' && status.engine === provider && status.keys[provider].source === 'database' && !envKey(provider)) {
          return json({ error: `${PROVIDERS[provider].label} is the active engine. Switch to the other engine before removing its only key.` }, 400);
        }
        const { error } = await db.rpc('ai_secret_delete', { p_name: PROVIDERS[provider].vault });
        if (error) {
          await audit(PROVIDERS[provider].vault, 'deleted', false, error.message);
          return json({ error: 'Could not remove the key.' }, 500);
        }
        await audit(PROVIDERS[provider].vault, 'deleted', true);
        return json(await loadStatus());
      }

      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (e) {
    console.error('[ai-assistant-admin] failed:', e);
    return json({ error: 'Something went wrong.' }, 500);
  }
});
