import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// List of manageable API keys
const MANAGEABLE_KEYS = [
  "HEYGEN_API_KEY",
  "ELEVENLABS_API_KEY", 
  "RESEND_API_KEY",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "VAPI_API_KEY",
  "VAPI_PHONE_NUMBER_ID",
  "B2_KEY_ID",
  "B2_APPLICATION_KEY",
  "B2_BUCKET_ID",
  "B2_BUCKET_NAME",
  "B2_ENDPOINT",
  "OPENAI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "MUSIC_API_KEY",
  "SUNO_API_KEY",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, keyName, keyValue } = await req.json();

    if (action === "list") {
      // Return status of all keys (configured or not)
      const keyStatuses = MANAGEABLE_KEYS.map((key) => {
        const value = Deno.env.get(key);
        return {
          name: key,
          configured: !!value,
          maskedValue: value ? `****${value.slice(-4)}` : null,
        };
      });

      return new Response(JSON.stringify({ keys: keyStatuses }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!keyName || !MANAGEABLE_KEYS.includes(keyName)) {
        return new Response(JSON.stringify({ error: "Invalid key name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!keyValue || typeof keyValue !== "string" || keyValue.trim().length < 5) {
        return new Response(JSON.stringify({ error: "Invalid key value" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Note: In production, this would use Supabase Management API to update secrets
      // For now, we log the attempt and inform the admin to update in Supabase dashboard
      
      // Log the update attempt
      await supabase.from("api_key_audit_log").insert({
        admin_user_id: userData.user.id,
        key_name: keyName,
        action: "updated",
        success: true,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `API key update request logged. To actually update the secret, please go to Supabase Dashboard > Project Settings > Edge Functions > Secrets and update ${keyName}.`,
          dashboardUrl: `https://supabase.com/dashboard/project/eqikeuqwbphwongtfzhe/settings/functions`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error managing API keys:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
