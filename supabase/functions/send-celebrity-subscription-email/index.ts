import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionEmailRequest {
  celebrity_id: string;
  subscriber_name: string;
  subscriber_email?: string;
  price_paid: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { celebrity_id, subscriber_name, subscriber_email, price_paid }: SubscriptionEmailRequest = await req.json();

    console.log('Sending subscription email for celebrity:', celebrity_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get celebrity details including their profile email
    const { data: celebrity, error: celebError } = await supabase
      .from('celebrities')
      .select(`
        id,
        name,
        profile_id,
        profiles!celebrities_profile_id_fkey(
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', celebrity_id)
      .single();

    if (celebError || !celebrity) {
      console.error('Celebrity not found:', celebError);
      return new Response(
        JSON.stringify({ success: false, message: 'Celebrity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const celebrityEmail = celebrity.profiles?.email;
    if (!celebrityEmail) {
      console.log('Celebrity has no email configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Celebrity email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const celebrityFirstName = celebrity.profiles?.first_name || celebrity.name;

    // Get subscriber count
    const { count } = await supabase
      .from('celebrity_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('celebrity_id', celebrity_id)
      .eq('status', 'active');

    const followerCount = count || 0;

    // Send email via Resend
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #0f0d1a; color: #f1f0f3;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #F97316, #EC4899, #8B5CF6); padding: 3px; border-radius: 16px 16px 0 0;">
              <div style="background-color: #1a1625; padding: 32px; border-radius: 14px 14px 0 0; text-align: center;">
                <img src="https://wishmefinal.lovable.app/wish-me-logo.png" alt="Wish Me" style="height: 40px; margin-bottom: 12px;" />
                <h1 style="color: #f1f0f3; margin: 0; font-size: 24px; font-weight: 700;">New Subscriber! 🎉</h1>
                <p style="color: #9b95a8; margin: 8px 0 0; font-size: 14px;">Someone just followed you</p>
              </div>
            </div>

            <!-- Content -->
            <div style="background-color: #1a1625; padding: 32px; border: 1px solid #2a2540; border-top: none;">
              <p style="color: #f1f0f3; font-size: 16px; margin: 0 0 20px;">Hi ${celebrityFirstName} 👋</p>

              <!-- Subscriber Highlight Card -->
              <div style="background-color: #0f0d1a; border-left: 3px solid #F97316; border-radius: 0 12px 12px 0; padding: 20px 24px; margin-bottom: 24px;">
                <p style="color: #f1f0f3; font-size: 18px; font-weight: 600; margin: 0;">${subscriber_name}</p>
                <p style="color: #9b95a8; font-size: 13px; margin: 6px 0 0;">just subscribed to your profile ✨</p>
              </div>

              <p style="color: #9b95a8; font-size: 14px; line-height: 1.7; margin: 0 0 20px;">They can now request video wishes, book services, and send you direct messages.</p>

              <!-- Stats Row -->
              <table style="width: 100%; margin-bottom: 24px;" cellpadding="0" cellspacing="8">
                <tr>
                  <td style="background-color: #0f0d1a; border: 1px solid #2a2540; border-radius: 12px; padding: 20px; text-align: center; width: 50%;">
                    <p style="color: #F97316; font-size: 22px; font-weight: 700; margin: 0;">₹${price_paid.toLocaleString()}</p>
                    <p style="color: #6b6580; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 6px 0 0;">Subscription</p>
                  </td>
                  <td style="background-color: #0f0d1a; border: 1px solid #2a2540; border-radius: 12px; padding: 20px; text-align: center; width: 50%;">
                    <p style="color: #EC4899; font-size: 22px; font-weight: 700; margin: 0;">${followerCount}</p>
                    <p style="color: #6b6580; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 6px 0 0;">Total Followers</p>
                  </td>
                </tr>
              </table>

              <p style="color: #9b95a8; font-size: 14px; text-align: center; margin: 0;">Keep creating amazing content! 💫</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #1a1625; padding: 24px 32px; border: 1px solid #2a2540; border-top: none; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="color: #4a4460; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Wish Me · <a href="https://wishme.today" style="color: #8B5CF6; text-decoration: none;">wishme.today</a>
              </p>
              <p style="color: #3a3450; font-size: 10px; margin: 8px 0 0;">You're receiving this because someone subscribed to your profile.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Wish Me <noreply@wishme.today>',
        to: [celebrityEmail],
        subject: `🎉 New Subscriber: ${subscriber_name} just followed you!`,
        html: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    console.log('Subscription email sent successfully:', emailData);

    // Also create a celebrity notification record
    await supabase
      .from('celebrity_notifications')
      .insert({
        celebrity_id: celebrity_id,
        type: 'subscription',
        title: 'New Subscriber!',
        message: `${subscriber_name} has subscribed to your profile for ₹${price_paid.toLocaleString()}.`,
        is_read: false
      });

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending subscription email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
