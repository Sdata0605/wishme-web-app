import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { referrer_email, referrer_name, amount, description } = await req.json();

    if (!referrer_email || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine service type from description
    let serviceType = 'a purchase';
    if (description?.includes('booking')) serviceType = 'a video booking';
    else if (description?.includes('music')) serviceType = 'music generation';
    else if (description?.includes('greeting card')) serviceType = 'a greeting card';
    else if (description?.includes('UGC video')) serviceType = 'a UGC video';
    else if (description?.includes('photo wish')) serviceType = 'a photo wish';
    else if (description?.includes('voice call')) serviceType = 'a voice call';
    else if (description?.includes('celebrity subscription')) serviceType = 'a celebrity subscription';
    else if (description?.includes('image promotion')) serviceType = 'an image promotion';
    else if (description?.includes('plan upgrade')) serviceType = 'a plan upgrade';

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 16px; }
        .body { padding: 30px; }
        .amount-box { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }
        .amount { font-size: 36px; font-weight: bold; color: #059669; }
        .details { color: #6b7280; font-size: 14px; margin-top: 16px; line-height: 1.6; }
        .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 You Earned a Commission!</h1>
          <p>Great news, ${referrer_name || 'there'}!</p>
        </div>
        <div class="body">
          <p>Someone you referred just made ${serviceType}, and you earned a commission!</p>
          <div class="amount-box">
            <div class="amount">₹${amount}</div>
            <div style="color: #059669; font-size: 14px; margin-top: 4px;">Added to your wallet</div>
          </div>
          <div class="details">
            <p><strong>Transaction:</strong> ${description || 'Referral commission'}</p>
            <p>This amount has been automatically credited to your WishMe wallet. Keep sharing your referral link to earn more!</p>
          </div>
          <div style="text-align: center;">
            <a href="https://wishme.today/wallet" class="cta">View Your Wallet</a>
          </div>
        </div>
        <div class="footer">
          <p>WishMe — Connecting fans with their favorite celebrities</p>
          <p>You received this email because you earned a referral commission on WishMe.</p>
        </div>
      </div>
    </body>
    </html>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WishMe <noreply@wishme.today>',
        to: [referrer_email],
        subject: `🎉 You earned ₹${amount} commission on WishMe!`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();
    console.log('Referral earning email sent:', emailResult);

    return new Response(JSON.stringify({ success: true, result: emailResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error sending referral earning email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
