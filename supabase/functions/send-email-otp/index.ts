// Sends a 6-digit sign-up code.
//
// Kept deliberately light so it starts fast: no supabase-js or Resend SDK (both are large to load
// on a cold start), the database work is a single RPC (`otp_request`), and the email goes out
// after the response so the app moves to the code screen without waiting for Resend.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const dbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

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

function generateOTP(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return (100000 + n).toString();
}

function emailHtml(otp: string): string {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Verification Code</title>
      </head>
      <body style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #0f0d1a; color: #f1f0f3;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <!-- Header with Logo -->
          <div style="background: linear-gradient(135deg, #F97316, #EC4899, #8B5CF6); padding: 3px; border-radius: 16px 16px 0 0;">
            <div style="background-color: #1a1625; padding: 32px; border-radius: 14px 14px 0 0; text-align: center;">
              <img src="https://wishmefinal.lovable.app/wish-me-logo.png" alt="Wish Me" style="height: 40px; margin-bottom: 12px;" />
              <p style="color: #9b95a8; margin: 0; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">Email Verification</p>
            </div>
          </div>

          <!-- Content -->
          <div style="background-color: #1a1625; padding: 40px 32px; border: 1px solid #2a2540; border-top: none;">
            <h2 style="color: #f1f0f3; margin: 0 0 8px; text-align: center; font-size: 22px; font-weight: 600;">Here's your code ✨</h2>
            <p style="color: #9b95a8; text-align: center; margin: 0 0 28px; font-size: 14px;">Enter it to verify your email address</p>

            <!-- OTP Code Box with Gradient Border -->
            <div style="background: linear-gradient(135deg, #F97316, #EC4899, #8B5CF6); padding: 3px; border-radius: 12px; margin: 0 auto; max-width: 320px;">
              <div style="background-color: #0f0d1a; padding: 24px; border-radius: 10px; text-align: center;">
                <span style="font-size: 38px; font-weight: 700; letter-spacing: 10px; background: linear-gradient(135deg, #F97316, #EC4899, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'SF Mono', 'Fira Code', monospace;">
                  ${otp}
                </span>
              </div>
            </div>

            <p style="color: #9b95a8; text-align: center; margin: 24px 0 0; font-size: 13px;">
              This code expires in <span style="color: #F97316; font-weight: 600;">10 minutes</span>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #1a1625; padding: 24px 32px; border: 1px solid #2a2540; border-top: none; border-radius: 0 0 16px 16px; text-align: center;">
            <p style="color: #6b6580; font-size: 12px; margin: 0;">
              If you didn't request this code, you can safely ignore this email.
            </p>
            <p style="color: #4a4460; font-size: 11px; margin: 12px 0 0;">
              © ${new Date().getFullYear()} Wish Me · <a href="https://wishme.today" style="color: #8B5CF6; text-decoration: none;">wishme.today</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
}

/** Sends the email; if Resend refuses, withdraws the code so the user can ask again straight away. */
async function deliver(email: string, otp: string, otpHash: string): Promise<void> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Wish Me <noreply@wishme.today>",
        to: [email],
        subject: `${otp} is your Wish Me verification code`,
        html: emailHtml(otp),
      }),
    });
    if (res.ok) return;
    console.error("Error sending email:", res.status, await res.text());
  } catch (e) {
    console.error("Error sending email:", e);
  }
  await fetch(
    `${SUPABASE_URL}/rest/v1/email_otp_verifications?email=eq.${encodeURIComponent(email)}&otp_hash=eq.${otpHash}`,
    { method: "DELETE", headers: dbHeaders },
  ).catch(() => {});
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email: rawEmail } = await req.json();

    if (!rawEmail) return json({ success: false, error: "Email is required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return json({ success: false, error: "Invalid email format" }, 400);
    }
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return json({ success: false, error: "Email service not configured" }, 500);
    }

    const email = String(rawEmail).toLowerCase();
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // One round trip: exists-check, 30 s cooldown, cleanup, hourly limit and insert.
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/otp_request`, {
      method: "POST",
      headers: dbHeaders,
      body: JSON.stringify({ p_email: email, p_hash: otpHash, p_expires: expiresAt }),
    });
    if (!rpc.ok) {
      console.error("Error storing OTP:", rpc.status, await rpc.text());
      return json({ success: false, error: "Failed to generate OTP" }, 500);
    }
    const status = (await rpc.json()) as string;

    if (status === "email_exists") {
      return json({
        success: false,
        error: "email_exists",
        message: "An account with this email already exists. Please login.",
      }, 409);
    }
    if (status.startsWith("cooldown:")) {
      const waitSeconds = Number(status.slice("cooldown:".length));
      return json({
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        retryAfter: waitSeconds,
      }, 429);
    }
    if (status === "rate_limited") {
      return json({ success: false, error: "Too many OTP requests. Please try again later." }, 429);
    }

    // Respond now; the email follows (EdgeRuntime keeps the worker alive until it is sent).
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime.waitUntil(deliver(email, otp, otpHash));

    return json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error in send-email-otp:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
