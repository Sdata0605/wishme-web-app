/**
 * ai-call-webhook — Vapi reports on AI calls here: ringing, answered, and the final report with
 * the transcript, summary and outcome. Anyone could try to post to this URL, so every request must
 * carry the shared secret that was set on the call; anything else is rejected.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { formatTranscript, safeEqual, statusFromEndedReason } from "../_shared/aiCall.ts";

const ok = () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });

const OUTCOMES = new Set(["success", "partial", "declined", "no_info", "callback_requested"]);

serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const secret = Deno.env.get("AI_CALL_WEBHOOK_SECRET") ?? "";
  const sent = req.headers.get("x-vapi-secret") ?? "";
  if (!secret || !safeEqual(sent, secret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const payload = await req.json();
    const message = payload.message ?? payload;
    const type: string = message.type ?? "";
    const call = message.call ?? {};
    const vapiCallId: string | undefined = call.id ?? message.callId;
    if (!vapiCallId) return ok();

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await db.from("ai_calls").select("id, status, price_paid, user_id").eq("vapi_call_id", vapiCallId).maybeSingle();
    if (!row) return ok(); // not one of ours (e.g. a celebrity wish call)

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (type === "status-update") {
      const status = String(message.status ?? "");
      // Never move a finished call back to an earlier state.
      const finished = ["completed", "no-answer", "busy", "voicemail", "failed"].includes(row.status);
      if (!finished) {
        if (status === "ringing") update.status = "ringing";
        else if (status === "in-progress") {
          update.status = "in-progress";
          update.started_at = new Date().toISOString();
        } else if (status === "scheduled") update.status = "scheduled";
      }
    } else if (type === "end-of-call-report") {
      const reason = String(message.endedReason ?? call.endedReason ?? "");
      const status = statusFromEndedReason(reason);
      const analysis = message.analysis ?? {};
      const structured = analysis.structuredData ?? {};
      const artifact = message.artifact ?? {};

      update.status = status;
      update.ended_reason = reason || null;
      update.ended_at = new Date().toISOString();
      if (message.startedAt) update.started_at = message.startedAt;
      const seconds = message.durationSeconds ?? (message.startedAt && message.endedAt
        ? Math.round((new Date(message.endedAt).getTime() - new Date(message.startedAt).getTime()) / 1000)
        : null);
      if (seconds != null) update.duration_seconds = Math.round(Number(seconds));

      update.transcript = formatTranscript(artifact.transcript ?? message.transcript ?? artifact.messages) || null;
      update.summary = typeof (analysis.summary ?? message.summary) === "string" ? String(analysis.summary ?? message.summary).slice(0, 2000) : null;
      update.recording_url = artifact.recordingUrl ?? message.recordingUrl ?? null;
      if (typeof structured.outcome === "string" && OUTCOMES.has(structured.outcome)) update.outcome = structured.outcome;
      if (typeof structured.next_step === "string") update.next_step = structured.next_step.slice(0, 400);
      if (structured.opted_out === true) update.opted_out = true;
      if (status === "failed") update.error_message = `Call failed: ${reason || "unknown"}`;
      // Nobody picked up: say so plainly, so the assistant can tell the user.
      if (status === "no-answer" && !update.summary) update.summary = "Nobody answered the call.";
      if (status === "busy" && !update.summary) update.summary = "The line was busy.";
      if (status === "voicemail" && !update.summary) update.summary = "The call went to voicemail.";

      // Charge only for calls that actually reached someone or their voicemail.
      if (["completed", "voicemail"].includes(status) && Number(row.price_paid) === 0) {
        const { data: setting } = await db.from("platform_settings").select("setting_value").eq("setting_key", "ai_call_price").maybeSingle();
        const price = Math.max(0, Number(setting?.setting_value ?? 0) || 0);
        if (price > 0) {
          const { data: profile } = await db.from("profiles").select("id, wallet_balance").eq("user_id", row.user_id).maybeSingle();
          if (profile) {
            await db.from("profiles").update({ wallet_balance: Math.max(0, (profile.wallet_balance ?? 0) - price) }).eq("id", profile.id);
            await db.from("wallet_transactions").insert({
              user_id: profile.id,
              amount: price,
              transaction_type: "ai_call",
              status: "completed",
              description: "AI call on your behalf",
            });
            update.price_paid = price;
          }
        }
      }
    } else {
      return ok();
    }

    const { error } = await db.from("ai_calls").update(update).eq("id", row.id);
    if (error) console.error("[ai-call-webhook] update failed:", error.message);
    return ok();
  } catch (e) {
    console.error("[ai-call-webhook] failed:", e);
    return ok(); // never make Vapi retry on our own parse errors
  }
});
