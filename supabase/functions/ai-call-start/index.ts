/**
 * ai-call-start — the assistant phones someone on the logged-in user's behalf (through Vobiz).
 *
 * The app only calls this after the user has said "yes" out loud to a spoken confirmation that
 * named the person, the number and the reason. The AI tells the person it is an AI and that the
 * call is written down. The conversation itself, and the result (status, transcript, summary),
 * are handled by the vobiz-call function.
 *
 * Body: { name?, phone, purpose, details?, language?, confirmed: true }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  checkPhoneNumber,
  cleanName,
  cleanText,
  formatForSpeech,
  normaliseLanguage,
} from "../_shared/aiCall.ts";
import { callToken, placeVobizCall, vobizConfig } from "../_shared/vobiz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * There is no daily limit. The only guard left is against calling the SAME number over and over
 * in seconds, which protects the person being called from a runaway loop; it is short enough that
 * normal use and testing never notice it.
 */
const SAME_NUMBER_WINDOW_MS = 60_000;
const MAX_CALLS_PER_NUMBER_IN_WINDOW = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    // ── Who is asking ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Server configuration ───────────────────────────────────────────────
    const vobiz = vobizConfig();
    const webhookSecret = Deno.env.get("AI_CALL_WEBHOOK_SECRET");
    if (!vobiz || !webhookSecret) {
      console.error("[ai-call-start] missing configuration", { vobiz: !!vobiz, webhookSecret: !!webhookSecret });
      return json({ error: "AI calling is not set up yet." }, 503);
    }

    const { data: settingRows } = await db
      .from("platform_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["ai_call_enabled", "ai_call_price"]);
    const setting = (k: string, fallback: string) =>
      (settingRows?.find((s: { setting_key: string }) => s.setting_key === k)?.setting_value as string | undefined) ?? fallback;

    if (setting("ai_call_enabled", "true") === "false") return json({ error: "AI calls are switched off right now." }, 403);
    const price = Math.max(0, Number(setting("ai_call_price", "0")) || 0);
    // ai_call_daily_limit is deliberately not read any more: there is no cap on how many calls a
    // user may make. The admin switch (ai_call_enabled) and the wallet price still apply.

    // ── What was asked ─────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    if (body.confirmed !== true) {
      return json({ error: "The user must confirm the call first.", needsConfirmation: true }, 400);
    }

    const number = checkPhoneNumber(String(body.phone ?? ""));
    if (!number.ok) return json({ error: number.reason }, 400);

    const purpose = cleanText(body.purpose, 600);
    if (purpose.length < 5) return json({ error: "Please say what the call is for." }, 400);
    const details = cleanText(body.details, 800);
    const toName = cleanName(body.name);
    const language = normaliseLanguage(body.language);

    // The phone service places calls immediately; booking one for later is not supported yet.
    if (body.scheduleAt) {
      return json({ error: "I can't book a call for later yet. I can call them now instead." }, 400);
    }

    // ── Guards for the person being called ─────────────────────────────────
    const { data: priorCalls } = await db
      .from("ai_calls")
      .select("opted_out, created_at")
      .eq("to_phone", number.e164)
      .order("created_at", { ascending: false })
      .limit(20);
    if (priorCalls?.some((c: { opted_out: boolean }) => c.opted_out)) {
      return json({ error: "That person asked not to receive these calls, so the assistant can't call them." }, 403);
    }
    const recent = (priorCalls ?? []).filter((c: { created_at: string }) => Date.now() - new Date(c.created_at).getTime() < SAME_NUMBER_WINDOW_MS).length;
    if (recent >= MAX_CALLS_PER_NUMBER_IN_WINDOW) {
      return json({ error: "That number was called moments ago. Please wait a minute before trying again." }, 429);
    }

    const { data: profile } = await db.from("profiles").select("id, first_name, last_name, wallet_balance").eq("user_id", user.id).maybeSingle();
    if (!profile) return json({ error: "Profile not found." }, 404);
    if (price > 0 && (profile.wallet_balance ?? 0) < price) {
      return json({ error: `An AI call costs ₹${price}. Please add money to your wallet first.` }, 402);
    }
    const userName = cleanName(`${profile.first_name ?? ""} ${profile.last_name ?? ""}`) || "a WishMe customer";

    // ── Record it, then place the call ─────────────────────────────────────
    const { data: row, error: insertError } = await db
      .from("ai_calls")
      .insert({
        user_id: user.id,
        to_name: toName || null,
        to_phone: number.e164,
        purpose,
        details: details || null,
        language,
        status: "queued",
      })
      .select("id")
      .single();
    if (insertError || !row) {
      console.error("[ai-call-start] insert failed:", insertError);
      return json({ error: "Could not start the call." }, 500);
    }

    // Vobiz cannot log in, so the URLs it calls back carry a token tied to this call.
    const token = await callToken(row.id);
    const at = (action: string) => `${url}/functions/v1/vobiz-call/${action}?id=${row.id}&t=${token}`;

    try {
      const placed = await placeVobizCall(vobiz, {
        to: number.e164,
        answerUrl: at("answer"),
        ringUrl: at("ring"),
        hangupUrl: at("hangup"),
        // Vobiz's own ceiling: a little above ours, so our wind-up always happens first.
        timeLimitSeconds: 420,
      });
      // The column predates Vobiz; it holds whichever phone service placed the call.
      await db.from("ai_calls").update({ vapi_call_id: placed.id, updated_at: new Date().toISOString() }).eq("id", row.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[ai-call-start] could not place the call:", message);
      await db.from("ai_calls").update({ status: "failed", error_message: message.slice(0, 300), updated_at: new Date().toISOString() }).eq("id", row.id);
      return json({ error: "The phone service could not place the call. Please try again in a moment." }, 502);
    }

    return json({
      ok: true,
      callId: row.id,
      status: "queued",
      to: { name: toName || null, phone: number.e164, spoken: formatForSpeech(number.e164) },
      scheduledFor: null,
      price,
    });
  } catch (e) {
    console.error("[ai-call-start] failed:", e);
    return json({ error: "Something went wrong starting the call." }, 500);
  }
});
