import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApiTestResult {
  name: string;
  status: "configured" | "missing" | "error";
  message: string;
  lastTested?: string;
}

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

    // Verify admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { testKey } = await req.json().catch(() => ({}));

    const results: ApiTestResult[] = [];

    // Helper to test API
    const testApi = async (
      name: string,
      envKey: string,
      testFn: (key: string) => Promise<boolean>
    ): Promise<ApiTestResult> => {
      const key = Deno.env.get(envKey);
      if (!key) {
        return { name, status: "missing", message: "API key not configured" };
      }
      
      if (testKey && testKey !== envKey) {
        return { name, status: "configured", message: "Key is configured", lastTested: new Date().toISOString() };
      }
      
      try {
        const success = await testFn(key);
        return {
          name,
          status: success ? "configured" : "error",
          message: success ? "Connection successful" : "Connection failed",
          lastTested: new Date().toISOString(),
        };
      } catch (error: any) {
        return {
          name,
          status: "error",
          message: error.message || "Connection test failed",
          lastTested: new Date().toISOString(),
        };
      }
    };

    // Test HeyGen
    results.push(
      await testApi("HEYGEN_API_KEY", "HEYGEN_API_KEY", async (key) => {
        const res = await fetch("https://api.heygen.com/v2/avatars", {
          headers: { "X-Api-Key": key },
        });
        return res.ok;
      })
    );

    // Test ElevenLabs
    results.push(
      await testApi("ELEVENLABS_API_KEY", "ELEVENLABS_API_KEY", async (key) => {
        const res = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": key },
        });
        return res.ok;
      })
    );

    // Test Resend
    results.push(
      await testApi("RESEND_API_KEY", "RESEND_API_KEY", async (key) => {
        const res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${key}` },
        });
        return res.ok;
      })
    );

    // Test WhatsApp
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    results.push(
      await testApi("WHATSAPP_ACCESS_TOKEN", "WHATSAPP_ACCESS_TOKEN", async (key) => {
        if (!whatsappPhoneId) return false;
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${whatsappPhoneId}`,
          { headers: { Authorization: `Bearer ${key}` } }
        );
        return res.ok;
      })
    );

    // Test Razorpay
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    results.push({
      name: "RAZORPAY_KEY_ID",
      status: razorpayKeyId ? "configured" : "missing",
      message: razorpayKeyId ? "Key is configured" : "API key not configured",
    });
    results.push({
      name: "RAZORPAY_KEY_SECRET",
      status: razorpayKeySecret ? "configured" : "missing",
      message: razorpayKeySecret ? "Key is configured" : "API key not configured",
    });

    // Test Vapi - use /assistant endpoint for reliable health check
    const vapiKey = Deno.env.get("VAPI_API_KEY");
    const vapiPhoneId = Deno.env.get("VAPI_PHONE_NUMBER_ID");
    if (!vapiKey) {
      results.push({ name: "VAPI_API_KEY", status: "missing", message: "API key not configured" });
    } else {
      try {
        const vapiRes = await fetch("https://api.vapi.ai/assistant", {
          method: "GET",
          headers: { Authorization: `Bearer ${vapiKey}` },
        });
        const vapiBody = await vapiRes.text();
        if (vapiRes.ok) {
          results.push({
            name: "VAPI_API_KEY",
            status: "configured",
            message: "Connection successful",
            lastTested: new Date().toISOString(),
          });
        } else {
          results.push({
            name: "VAPI_API_KEY",
            status: "error",
            message: `Vapi returned ${vapiRes.status}: ${vapiBody.substring(0, 200)}`,
            lastTested: new Date().toISOString(),
          });
        }
      } catch (netErr: any) {
        results.push({
          name: "VAPI_API_KEY",
          status: "error",
          message: `Network error: ${netErr.message}`,
          lastTested: new Date().toISOString(),
        });
      }
    }

    // Check VAPI_PHONE_NUMBER_ID separately
    results.push({
      name: "VAPI_PHONE_NUMBER_ID",
      status: vapiPhoneId ? "configured" : "missing",
      message: vapiPhoneId ? "Phone number ID is configured" : "Phone number ID not configured — outbound calls will fail",
    });

    // Test B2
    const b2KeyId = Deno.env.get("B2_KEY_ID");
    const b2AppKey = Deno.env.get("B2_APPLICATION_KEY");
    results.push({
      name: "B2_APPLICATION_KEY",
      status: b2KeyId && b2AppKey ? "configured" : "missing",
      message: b2KeyId && b2AppKey ? "B2 credentials configured" : "B2 credentials not configured",
    });

    // Test OpenRouter (text + image generation)
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterKey) {
      results.push({ name: "OPENROUTER_API_KEY", status: "missing", message: "API key not configured" });
    } else {
      try {
        const orRes = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${openRouterKey}` },
        });
        if (orRes.ok) {
          results.push({
            name: "OPENROUTER_API_KEY",
            status: "configured",
            message: "Connection successful",
            lastTested: new Date().toISOString(),
          });
        } else {
          const body = await orRes.text();
          results.push({
            name: "OPENROUTER_API_KEY",
            status: "error",
            message: `OpenRouter returned ${orRes.status}: ${body.substring(0, 200)}`,
            lastTested: new Date().toISOString(),
          });
        }
      } catch (netErr: any) {
        results.push({
          name: "OPENROUTER_API_KEY",
          status: "error",
          message: `Network error: ${netErr.message}`,
          lastTested: new Date().toISOString(),
        });
      }
    }

    // Test OpenAI
    results.push(
      await testApi("OPENAI_API_KEY", "OPENAI_API_KEY", async (key) => {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        return res.ok;
      })
    );

    // Test Google Gemini
    results.push(
      await testApi("GOOGLE_GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY", async (key) => {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        );
        return res.ok;
      })
    );

    // Test Music API (legacy)
    results.push({
      name: "MUSIC_API_KEY",
      status: Deno.env.get("MUSIC_API_KEY") ? "configured" : "missing",
      message: Deno.env.get("MUSIC_API_KEY") ? "Key is configured" : "API key not configured",
    });

    // Test Suno (AI Music Studio)
    const sunoKey = Deno.env.get("SUNO_API_KEY");
    if (!sunoKey) {
      results.push({ name: "SUNO_API_KEY", status: "missing", message: "API key not configured" });
    } else {
      try {
        const sunoRes = await fetch("https://api.sunoapi.org/api/v1/generate/credit", {
          headers: { Authorization: `Bearer ${sunoKey}`, "Content-Type": "application/json" },
        });
        const sunoBody = await sunoRes.json().catch(() => ({}));
        if (sunoRes.ok && (sunoBody?.code === 200 || typeof sunoBody?.data === "number")) {
          results.push({
            name: "SUNO_API_KEY",
            status: "configured",
            message: `Connection successful. Credits: ${sunoBody.data ?? "unknown"}`,
            lastTested: new Date().toISOString(),
          });
        } else {
          results.push({
            name: "SUNO_API_KEY",
            status: "error",
            message: `Suno returned ${sunoRes.status}: ${sunoBody?.msg || JSON.stringify(sunoBody).substring(0, 200)}`,
            lastTested: new Date().toISOString(),
          });
        }
      } catch (netErr: any) {
        results.push({
          name: "SUNO_API_KEY",
          status: "error",
          message: `Network error: ${netErr.message}`,
          lastTested: new Date().toISOString(),
        });
      }
    }

    // Log audit
    await supabase.from("api_key_audit_log").insert({
      admin_user_id: claimsData.user.id,
      key_name: testKey || "all",
      action: "tested",
      success: true,
    });

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error testing API connections:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
