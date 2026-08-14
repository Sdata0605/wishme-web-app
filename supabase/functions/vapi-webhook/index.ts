import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Vapi webhook received:', JSON.stringify(payload).substring(0, 500));

    const message = payload.message || payload;
    const eventType = message.type || payload.type;
    const call = message.call || payload.call || {};
    const callId = call.id || message.id || payload.id;

    if (!callId) {
      console.log('No call ID found in webhook payload');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Event: ${eventType}, Call ID: ${callId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find the voice_call_wishes record by vapi_call_id
    const { data: callRecord, error: findError } = await supabase
      .from('voice_call_wishes')
      .select('id, call_status')
      .eq('vapi_call_id', callId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding call record:', findError);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!callRecord) {
      console.log(`No voice_call_wishes record found for vapi_call_id: ${callId}`);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updateData: Record<string, unknown> = {
      webhook_payload: payload,
    };

    switch (eventType) {
      case 'call.ringing':
      case 'status-update': {
        const status = message.status || call.status;
        if (status === 'ringing' || eventType === 'call.ringing') {
          updateData.call_status = 'ringing';
        } else if (status === 'in-progress') {
          updateData.call_status = 'in-progress';
        } else if (status === 'queued') {
          updateData.call_status = 'queued';
        }
        break;
      }

      case 'call.in-progress':
        updateData.call_status = 'in-progress';
        break;

      case 'call.ended':
      case 'end-of-call-report': {
        updateData.call_status = 'completed';
        updateData.completed_at = new Date().toISOString();

        // Duration
        const durationSeconds = message.durationSeconds
          || call.duration
          || message.duration
          || (message.endedAt && message.startedAt
            ? Math.round((new Date(message.endedAt).getTime() - new Date(message.startedAt).getTime()) / 1000)
            : null);
        if (durationSeconds != null) {
          updateData.call_duration_seconds = Math.round(Number(durationSeconds));
        }

        // Disconnect reason
        const endedReason = message.endedReason
          || call.endedReason
          || message.ended_reason
          || call.ended_reason;
        if (endedReason) {
          updateData.disconnect_reason = endedReason;
        }

        // Transcript
        const transcript = message.transcript || message.artifact?.transcript;
        if (transcript) {
          if (typeof transcript === 'string') {
            updateData.call_transcript = transcript;
          } else if (Array.isArray(transcript)) {
            updateData.call_transcript = transcript
              .map((t: { role?: string; text?: string; message?: string }) =>
                `${t.role || 'unknown'}: ${t.text || t.message || ''}`
              )
              .join('\n');
          }
        }
        break;
      }

      case 'call.failed': {
        updateData.call_status = 'failed';
        const failReason = message.endedReason || call.endedReason || 'unknown';
        updateData.disconnect_reason = failReason;
        updateData.error_message = `Call failed: ${failReason}`;
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}, storing payload only`);
        break;
    }

    const { error: updateError } = await supabase
      .from('voice_call_wishes')
      .update(updateData)
      .eq('id', callRecord.id);

    if (updateError) {
      console.error('Error updating call record:', updateError);
    } else {
      console.log(`Updated voice_call_wishes ${callRecord.id}: status=${updateData.call_status || 'unchanged'}, disconnect_reason=${updateData.disconnect_reason || 'none'}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Always return 200 to prevent Vapi retries on parse errors
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
