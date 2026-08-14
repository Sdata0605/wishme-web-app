import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing scheduled messages...");

    // Get all pending messages that are due
    const { data: dueMessages, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled messages: ${fetchError.message}`);
    }

    if (!dueMessages || dueMessages.length === 0) {
      console.log("No scheduled messages due");
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${dueMessages.length} messages to process`);

    let processed = 0;
    let failed = 0;

    for (const message of dueMessages) {
      try {
        // Call the unified message sender
        const { data, error } = await supabase.functions.invoke('send-unified-message', {
          body: {
            channel: message.channel,
            recipient_email: message.recipient_email,
            recipient_phone: message.recipient_whatsapp,
            template_id: message.template_id,
            variables: message.payload || {},
            user_id: message.user_id,
          }
        });

        if (error) throw error;

        // Update status to sent
        await supabase
          .from('scheduled_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', message.id);

        processed++;
        console.log(`Message ${message.id} sent successfully`);

      } catch (sendError: any) {
        console.error(`Failed to send message ${message.id}:`, sendError);

        // Update status to failed
        await supabase
          .from('scheduled_messages')
          .update({
            status: 'failed',
            error_message: sendError.message
          })
          .eq('id', message.id);

        failed++;
      }
    }

    console.log(`Processed ${processed} messages, ${failed} failed`);

    return new Response(JSON.stringify({ processed, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error processing scheduled messages:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
