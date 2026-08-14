import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: OTPRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists in auth.users (profiles table mirrors auth)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "email_exists", 
          message: "An account with this email already exists. Please login." 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // ---- Cooldown check: must wait 30 seconds between OTPs for same email ----
    const { data: lastOtp } = await supabase
      .from('email_otp_verifications')
      .select('created_at')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastOtp) {
      const secondsSinceLast = (Date.now() - new Date(lastOtp.created_at).getTime()) / 1000;
      if (secondsSinceLast < 30) {
        const waitSeconds = Math.ceil(30 - secondsSinceLast);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
            retryAfter: waitSeconds
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ---- Cleanup: delete expired & used OTPs for this email to free up rate limit slots ----
    await supabase
      .from('email_otp_verifications')
      .delete()
      .eq('email', email.toLowerCase())
      .or('is_used.eq.true,expires_at.lt.' + new Date().toISOString());

    // Generate OTP and expiry (10 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Check rate limiting (max 5 OTPs per email per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('email_otp_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('email', email.toLowerCase())
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('Error checking rate limit:', countError);
    }

    if (count && count >= 5) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many OTP requests. Please try again later." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('email_otp_verifications')
      .insert({
        email: email.toLowerCase(),
        otp_hash: await hashOTP(otp),
        expires_at: expiresAt,
        is_used: false,
      });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send OTP via email using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailHtml = `
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

    const { error: emailError } = await resend.emails.send({
      from: "Wish Me <noreply@wishme.today>",
      to: [email],
      subject: `${otp} is your Wish Me verification code`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send verification email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('OTP sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-email-otp:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

// Simple hash function for OTP (using Web Crypto API)
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(handler);
