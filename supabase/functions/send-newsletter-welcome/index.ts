import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SubscriptionRequest = await req.json();
    
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing } = await supabase
      .from('newsletter_subscriptions')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existing) {
      if (existing.status === 'active') {
        return new Response(
          JSON.stringify({ message: 'You are already subscribed!' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      await supabase
        .from('newsletter_subscriptions')
        .update({ status: 'active', subscribed_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      const { error: insertError } = await supabase
        .from('newsletter_subscriptions')
        .insert({ email, status: 'active' });

      if (insertError) {
        console.error('Error inserting subscription:', insertError);
        throw new Error('Failed to subscribe');
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Wish Me <noreply@wishme.today>',
            to: [email],
            subject: '🎉 Welcome to Wish Me Newsletter!',
            html: `
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
                      <img src="https://wishmefinal.lovable.app/wish-me-logo.png" alt="Wish Me" style="height: 40px; margin-bottom: 16px;" />
                      <h1 style="color: #f1f0f3; margin: 0; font-size: 26px; font-weight: 700;">Welcome to the fam! 🌟</h1>
                      <p style="color: #9b95a8; margin: 8px 0 0; font-size: 14px;">You're in for something special</p>
                    </div>
                  </div>
                  
                  <!-- Content -->
                  <div style="background-color: #1a1625; padding: 32px; border: 1px solid #2a2540; border-top: none;">
                    <p style="color: #9b95a8; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
                      Thanks for joining the Wish Me community! You'll be the first to know about all the exciting things we've got lined up.
                    </p>
                    
                    <!-- Feature Pills -->
                    <div style="margin: 0 0 24px;">
                      <div style="background-color: #0f0d1a; border: 1px solid #2a2540; border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 14px;">🎬</span>
                        <span style="color: #f1f0f3; font-size: 14px;">New celebrity announcements & drops</span>
                      </div>
                      <div style="background-color: #0f0d1a; border: 1px solid #2a2540; border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 14px;">🎁</span>
                        <span style="color: #f1f0f3; font-size: 14px;">Exclusive offers & early access deals</span>
                      </div>
                      <div style="background-color: #0f0d1a; border: 1px solid #2a2540; border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 14px;">🎵</span>
                        <span style="color: #f1f0f3; font-size: 14px;">AI Music & creative feature updates</span>
                      </div>
                      <div style="background-color: #0f0d1a; border: 1px solid #2a2540; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 14px;">💡</span>
                        <span style="color: #f1f0f3; font-size: 14px;">Tips for creating perfect wishes</span>
                      </div>
                    </div>
                    
                    <!-- CTA -->
                    <div style="text-align: center; margin: 32px 0 8px;">
                      <a href="https://wishmefinal.lovable.app/celebrities" style="display: inline-block; background: linear-gradient(135deg, #F97316, #EC4899, #8B5CF6); color: white; padding: 14px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">
                        Explore Celebrities ✨
                      </a>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #1a1625; padding: 24px 32px; border: 1px solid #2a2540; border-top: none; border-radius: 0 0 16px 16px; text-align: center;">
                    <p style="color: #6b6580; font-size: 12px; margin: 0;">You subscribed to this newsletter at wishme.today</p>
                    <p style="color: #4a4460; font-size: 11px; margin: 8px 0 0;">
                      © ${new Date().getFullYear()} Wish Me · <a href="https://wishme.today" style="color: #8B5CF6; text-decoration: none;">wishme.today</a>
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error('Resend API error:', await emailResponse.text());
        } else {
          console.log('Welcome email sent successfully to:', email);
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Successfully subscribed! Check your email for welcome message.',
        success: true 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in newsletter subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to subscribe' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
