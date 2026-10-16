import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Receives RazorpayX payout events and settles the matching payout request:
 *   payout.processed                    -> 'processed' (paid), with the bank's UTR
 *   payout.failed / rejected / reversed -> 'failed' / 'reversed' (a database trigger returns the money, once)
 *
 * Set it up in the RazorpayX dashboard: Settings -> Webhooks -> add this function's URL
 * (https://<project>.supabase.co/functions/v1/razorpayx-webhook), tick the payout.* events, and put the secret you
 * choose there into the RAZORPAYX_WEBHOOK_SECRET Supabase secret. Deployed without JWT checks because Razorpay
 * cannot send one; the request is trusted only if its signature matches.
 */

const encoder = new TextEncoder();

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison, so the signature cannot be guessed byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("RAZORPAYX_WEBHOOK_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !url || !serviceKey) return new Response("Not configured", { status: 503 });

  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!safeEqual(signature, await hmacHex(secret, body))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const payout = event?.payload?.payout?.entity;
  if (!payout?.id || typeof event?.event !== "string" || !event.event.startsWith("payout.")) {
    return new Response("Ignored", { status: 200 });
  }

  const admin = createClient(url, serviceKey);
  const nextStatus =
    event.event === "payout.processed" ? "processed" :
    event.event === "payout.reversed" ? "reversed" :
    event.event === "payout.failed" || event.event === "payout.rejected" ? "failed" :
    null;
  if (!nextStatus) return new Response("Ignored", { status: 200 }); // payout.queued / pending / initiated: nothing to settle yet

  // Settle only a request that is still waiting: a repeated webhook must not pay or refund twice.
  const { data: settled, error } = await admin
    .from("payout_requests")
    .update({
      status: nextStatus,
      provider_status: payout.status ?? nextStatus,
      utr: payout.utr ?? null,
      failure_reason: nextStatus === "processed" ? null : (payout.failure_reason ?? payout.status_details?.description ?? null),
      processed_at: new Date().toISOString(),
    })
    .eq("provider_payout_id", payout.id)
    .in("status", ["pending", "processing"])
    .select("id");

  if (error) {
    console.error("Webhook update failed:", error.message);
    return new Response("Error", { status: 500 }); // Razorpay will retry
  }

  if (!settled || settled.length === 0) {
    // Either this event was already applied (fine), or it beat celebrity-payout to saving the payout id
    // (the request is not linked yet): answer with an error so Razorpay delivers it again a little later.
    const { data: known } = await admin.from("payout_requests").select("id").eq("provider_payout_id", payout.id).maybeSingle();
    if (!known) return new Response("Request not linked yet", { status: 500 });
  }
  return new Response("OK", { status: 200 });
});
