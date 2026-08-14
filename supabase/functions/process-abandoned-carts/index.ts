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

    console.log("Processing abandoned carts...");

    // Get delay setting
    const { data: delaySetting } = await supabase
      .from('messaging_settings')
      .select('setting_value')
      .eq('setting_key', 'abandoned_cart_delay_minutes')
      .single();

    const delayMinutes = parseInt(delaySetting?.setting_value || '60');
    const cutoffTime = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString();

    // Find abandoned carts older than the delay that haven't been reminded
    const { data: abandonedCarts, error: fetchError } = await supabase
      .from('abandoned_cart_tracking')
      .select(`
        *,
        profiles:user_id (id, email, first_name),
        celebrities:celebrity_id (name)
      `)
      .eq('checkout_completed', false)
      .eq('reminder_sent', false)
      .lt('checkout_started_at', cutoffTime)
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch abandoned carts: ${fetchError.message}`);
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      console.log("No abandoned carts to process");
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${abandonedCarts.length} abandoned carts to process`);

    let processed = 0;

    for (const cart of abandonedCarts) {
      try {
        const profile = cart.profiles as any;
        const celebrity = cart.celebrities as any;

        if (!profile?.email) {
          console.log(`No email for cart ${cart.id}, skipping`);
          continue;
        }

        // Send abandoned cart reminder
        const { error: sendError } = await supabase.functions.invoke('send-unified-message', {
          body: {
            channel: 'email',
            recipient_email: profile.email,
            event_key: 'PAYMENT_ABANDONED',
            variables: {
              first_name: profile.first_name || 'there',
              celebrity_name: celebrity?.name || 'your selected celebrity',
              checkout_url: `https://wishmefinal.lovable.app/celebrities/${cart.celebrity_id}`
            },
            user_id: profile.id,
          }
        });

        if (sendError) throw sendError;

        // Mark as reminded
        await supabase
          .from('abandoned_cart_tracking')
          .update({
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString()
          })
          .eq('id', cart.id);

        processed++;
        console.log(`Sent reminder for cart ${cart.id}`);

      } catch (sendError: any) {
        console.error(`Failed to send reminder for cart ${cart.id}:`, sendError);
      }
    }

    console.log(`Processed ${processed} abandoned cart reminders`);

    return new Response(JSON.stringify({ processed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error processing abandoned carts:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
