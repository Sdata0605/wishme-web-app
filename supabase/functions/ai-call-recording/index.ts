/**
 * ai-call-recording — hands back a short-lived link to one call's recording.
 *
 * Recordings are private conversations, so the file is never public and the generic signing
 * endpoint is not used: the caller must be logged in and must own the call.
 *
 * GET/POST { callId }  ->  { url, expiresInSeconds }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { deleteObject, signedUrl } from '../_shared/b2.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;

    // Nightly tidy-up, woken by pg_cron. It only ever touches recordings that have already passed
    // their expiry date, so there is nothing a caller could abuse: the worst case is a no-op.
    if (new URL(req.url).pathname.endsWith('/expire')) {
      const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: stale } = await admin
        .from('ai_calls')
        .select('id, recording_url')
        .not('recording_url', 'is', null)
        .lt('recording_expires_at', new Date().toISOString())
        .limit(200);

      let removed = 0;
      for (const call of stale ?? []) {
        await deleteObject(call.recording_url as string);
        // The written conversation stays: it is tiny, and it is what the assistant actually reads.
        await admin.from('ai_calls').update({ recording_url: null, recording_expires_at: null, updated_at: new Date().toISOString() }).eq('id', call.id);
        removed++;
      }
      if (removed) console.log(`[ai-call-recording] deleted ${removed} expired recordings`);
      return json({ removed });
    }
    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return json({ error: 'Unauthorized' }, 401);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const callId = String(body.callId ?? new URL(req.url).searchParams.get('callId') ?? '');
    if (!callId) return json({ error: 'callId is required' }, 400);

    // Read through the user's own session: row-level security decides whether this call is theirs.
    const { data: call } = await userClient
      .from('ai_calls')
      .select('id, recording_url, recording_expires_at')
      .eq('id', callId)
      .maybeSingle();
    if (!call) return json({ error: 'Call not found' }, 404);
    if (!call.recording_url) return json({ error: 'There is no recording for this call.' }, 404);
    if (call.recording_expires_at && new Date(call.recording_expires_at) < new Date()) {
      return json({ error: 'That recording has been deleted. The written conversation is still there.' }, 410);
    }

    return json({ url: await signedUrl(call.recording_url), expiresInSeconds: 86_400 });
  } catch (e) {
    console.error('[ai-call-recording] failed:', e);
    return json({ error: 'Could not prepare the recording.' }, 500);
  }
});
