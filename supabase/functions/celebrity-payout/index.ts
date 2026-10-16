import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Sends a celebrity's withdrawal straight to their bank account through RazorpayX.
 *
 * Order of events, chosen so money can never be lost or sent twice:
 *  1. Check the payout service is configured. If it is not, stop BEFORE touching any money.
 *  2. Reserve the money with request_celebrity_payout (checks the amount against the real balance, files the
 *     request and lowers the balance in one step). It runs as the celebrity, so only they can spend their balance.
 *  3. Create the RazorpayX contact, fund account and payout. The request id doubles as the idempotency key, so a
 *     retry can never pay twice.
 *  4. If any step fails, the request is marked 'failed' and a database trigger returns the money. The final
 *     result (paid, or failed later at the bank) arrives from the razorpayx-webhook function.
 *
 * Secrets: RAZORPAYX_ACCOUNT_NUMBER (the RazorpayX account the money is paid from), and the API key pair in
 * RAZORPAYX_KEY_ID / RAZORPAYX_KEY_SECRET (they fall back to RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET, which are the
 * same keys when RazorpayX is enabled on the same Razorpay account).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

async function razorpayx(path: string, body: unknown, auth: string, idempotencyKey?: string) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Payout-Idempotency": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.description || `RazorpayX error ${res.status}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const keyId = Deno.env.get("RAZORPAYX_KEY_ID") ?? Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAYX_KEY_SECRET") ?? Deno.env.get("RAZORPAY_KEY_SECRET");
    const accountNumber = Deno.env.get("RAZORPAYX_ACCOUNT_NUMBER");
    if (!url || !anonKey || !serviceKey) return json(500, { error: "Server is not configured." });

    // 1. Not set up yet: say so without moving any money.
    if (!keyId || !keySecret || !accountNumber) {
      return json(503, { error: "Instant payouts are not switched on yet. Your balance has not been touched. Please try again later." });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const input = await req.json().catch(() => ({}));
    const amount = Number(input.amount);
    const accountNo = String(input.account_number ?? "").replace(/\s+/g, "");
    const ifsc = String(input.ifsc_code ?? "").trim().toUpperCase();
    const holder = String(input.account_holder_name ?? "").trim();
    const bankName = String(input.bank_name ?? "").trim();

    if (!Number.isInteger(amount) || amount <= 0) return json(400, { error: "Enter a valid amount." });
    if (!/^\d{6,18}$/.test(accountNo)) return json(400, { error: "Enter a valid bank account number (digits only)." });
    if (!IFSC.test(ifsc)) return json(400, { error: "Enter a valid IFSC code, like HDFC0001234." });
    if (holder.length < 3) return json(400, { error: "Enter the account holder's name exactly as the bank has it." });
    if (!bankName) return json(400, { error: "Enter the bank name." });

    // 2. Reserve the money as the signed-in celebrity.
    const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: reserved, error: reserveError } = await asUser.rpc("request_celebrity_payout", {
      p_bank_name: bankName,
      p_account_number: accountNo,
      p_ifsc_code: ifsc,
      p_account_holder_name: holder,
      p_amount: amount,
    });
    if (reserveError) return json(400, { error: reserveError.message });

    const requestId = reserved.request_id as string;
    const admin = createClient(url, serviceKey);
    const auth = btoa(`${keyId}:${keySecret}`);

    // 3. Send it.
    try {
      const { data: request } = await admin
        .from("payout_requests")
        .select("celebrity_id, profile_id")
        .eq("id", requestId)
        .single();
      const { data: profile } = await admin
        .from("profiles")
        .select("first_name, last_name, email, phone")
        .eq("id", request!.profile_id)
        .maybeSingle();

      const phone = String(profile?.phone ?? "").replace(/\D/g, "").slice(-10);
      const contact = await razorpayx("/contacts", {
        name: holder,
        ...(profile?.email ? { email: profile.email } : {}),
        ...(phone.length === 10 ? { contact: phone } : {}),
        type: "vendor",
        reference_id: String(request!.celebrity_id).slice(0, 40),
      }, auth);

      const fund = await razorpayx("/fund_accounts", {
        contact_id: contact.id,
        account_type: "bank_account",
        bank_account: { name: holder, ifsc, account_number: accountNo },
      }, auth);

      const payout = await razorpayx("/payouts", {
        account_number: accountNumber,
        fund_account_id: fund.id,
        amount: amount * 100, // paise
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: false,
        reference_id: requestId.slice(0, 40),
        narration: "WishMe payout",
      }, auth, requestId);

      if (["rejected", "cancelled", "failed", "reversed"].includes(payout.status)) {
        throw new Error(payout.status_details?.description || `The bank transfer was ${payout.status}.`);
      }

      const paidAlready = payout.status === "processed";
      await admin.from("payout_requests").update({
        status: paidAlready ? "processed" : "processing",
        provider: "razorpayx",
        provider_payout_id: payout.id,
        provider_status: payout.status,
        utr: payout.utr ?? null,
        processed_at: paidAlready ? new Date().toISOString() : null,
      }).eq("id", requestId);

      return json(200, {
        success: true,
        request_id: requestId,
        status: paidAlready ? "processed" : "processing",
        available_balance: reserved.available_balance,
      });
    } catch (e: any) {
      // 4. The transfer could not be started: mark it failed; the trigger returns the money.
      const reason = e?.message || "The bank transfer could not be started.";
      console.error("Payout failed:", requestId, reason);
      await admin.from("payout_requests").update({ status: "failed", failure_reason: reason }).eq("id", requestId);
      return json(502, { error: `The transfer could not be sent (${reason}). Your money is back in your balance.` });
    }
  } catch (e: any) {
    console.error("celebrity-payout error:", e);
    return json(500, { error: e?.message || "Something went wrong." });
  }
});
