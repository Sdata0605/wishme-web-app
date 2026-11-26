// Receives Setu BBPS webhooks (BILL_FETCH, BILL_PAY, BILL_DISPUTE) from Setu.
// Setu cannot log in, so the gateway runs with verify_jwt = false and this function
// checks a shared secret header instead. Events are logged (secrets and full mobile numbers
// stripped) and acknowledged with 200. Nothing is stored yet; see the BBPS integration notes.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { redact } from "../_shared/bbps.ts";

const SECRET_HEADER = "x-bbps-webhook-secret";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const expected = Deno.env.get("BBPS_WEBHOOK_SECRET") ?? "";
  const got = req.headers.get(SECRET_HEADER) ?? "";
  if (!expected || got !== expected) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Body must be JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = typeof payload.event === "string" ? payload.event : "UNKNOWN";
  console.log(`[bbps-webhook] ${event}`, JSON.stringify(redact(payload)));

  return new Response(JSON.stringify({ success: true, received: event }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
