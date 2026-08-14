import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: VerifyRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ verified: false, error: "Email and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ verified: false, error: "Invalid OTP format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the provided OTP
    const otpHash = await hashOTP(otp);

    // Find matching OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from('email_otp_verifications')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_hash', otpHash)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching OTP:', fetchError);
      return new Response(
        JSON.stringify({ verified: false, error: "Verification failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!otpRecord) {
      // Check if OTP exists but is expired or used
      const { data: anyRecord } = await supabase
        .from('email_otp_verifications')
        .select('is_used, expires_at')
        .eq('email', email.toLowerCase())
        .eq('otp_hash', otpHash)
        .limit(1)
        .maybeSingle();

      if (anyRecord?.is_used) {
        return new Response(
          JSON.stringify({ verified: false, error: "This code has already been used" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (anyRecord && new Date(anyRecord.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ verified: false, error: "This code has expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ verified: false, error: "Invalid verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('email_otp_verifications')
      .update({ 
        is_used: true, 
        verified_at: new Date().toISOString() 
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error updating OTP:', updateError);
    }

    // Store verified email status (for 1 hour)
    const { error: verifiedError } = await supabase
      .from('verified_emails')
      .upsert({
        email: email.toLowerCase(),
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      }, {
        onConflict: 'email'
      });

    if (verifiedError) {
      console.error('Error storing verified email:', verifiedError);
    }

    console.log('Email verified successfully');

    return new Response(
      JSON.stringify({ verified: true, message: "Email verified successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-email-otp:", error);
    return new Response(
      JSON.stringify({ verified: false, error: error.message }),
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
