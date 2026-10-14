// Checks a 6-digit sign-up code.
//
// No supabase-js (slow cold start); the whole check-and-redeem is one RPC (`otp_verify`), which
// also makes redeeming atomic so a code can never be used twice.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashOTP(otp: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(otp));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return json({ verified: false, error: "Email and OTP are required" }, 400);
    }
    if (!/^\d{6}$/.test(otp)) {
      return json({ verified: false, error: "Invalid OTP format" }, 400);
    }

    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/otp_verify`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_email: String(email).toLowerCase(), p_hash: await hashOTP(otp) }),
    });
    if (!rpc.ok) {
      console.error("Error verifying OTP:", rpc.status, await rpc.text());
      return json({ verified: false, error: "Verification failed" }, 500);
    }
    const status = (await rpc.json()) as string;

    switch (status) {
      case "ok":
        return json({ verified: true, message: "Email verified successfully" });
      case "used":
        return json({ verified: false, error: "This code has already been used" }, 400);
      case "expired":
        return json({ verified: false, error: "This code has expired. Please request a new one." }, 400);
      default:
        return json({ verified: false, error: "Invalid verification code" }, 400);
    }
  } catch (error) {
    console.error("Error in verify-email-otp:", error);
    return json({ verified: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
