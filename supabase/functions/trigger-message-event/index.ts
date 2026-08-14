import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriggerEventRequest {
  event_key: string;
  user_id?: string;
  email?: string;
  phone?: string;
  variables: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TriggerEventRequest = await req.json();
    const { event_key, user_id, email, phone, variables } = body;

    console.log("Triggering message event:", event_key);

    // Check if event is enabled
    const { data: eventData, error: eventError } = await supabase
      .from('message_events')
      .select('*')
      .eq('event_key', event_key)
      .eq('is_enabled', true)
      .single();

    if (eventError || !eventData) {
      console.log(`Event ${event_key} not found or disabled`);
      return new Response(JSON.stringify({ success: false, message: 'Event not found or disabled' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user info if user_id provided but no email/phone
    let recipientEmail = email;
    let recipientPhone = phone;

    if (user_id && (!recipientEmail || !recipientPhone)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('id', user_id)
        .single();

      if (profile) {
        recipientEmail = recipientEmail || profile.email;
        recipientPhone = recipientPhone || profile.phone;
      }
    }

    const results = {
      email: { sent: false, error: null as string | null },
      whatsapp: { sent: false, error: null as string | null },
    };

    // Send email if template configured
    if (eventData.email_template_id && recipientEmail) {
      try {
        const { error } = await supabase.functions.invoke('send-unified-message', {
          body: {
            channel: 'email',
            recipient_email: recipientEmail,
            template_id: eventData.email_template_id,
            variables,
            user_id,
          }
        });

        if (error) throw error;
        results.email.sent = true;
      } catch (e: any) {
        results.email.error = e.message;
        console.error("Email send failed:", e);
      }
    }

    // Send WhatsApp if template configured
    if (eventData.whatsapp_template_id && recipientPhone) {
      try {
        const { error } = await supabase.functions.invoke('send-unified-message', {
          body: {
            channel: 'whatsapp',
            recipient_phone: recipientPhone,
            template_id: eventData.whatsapp_template_id,
            variables,
            user_id,
          }
        });

        if (error) throw error;
        results.whatsapp.sent = true;
      } catch (e: any) {
        results.whatsapp.error = e.message;
        console.error("WhatsApp send failed:", e);
      }
    }

    console.log("Event trigger results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error triggering message event:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
