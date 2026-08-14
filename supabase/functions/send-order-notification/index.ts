import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return { success: false, error: 'RESEND_API_KEY not configured' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Wish Me <noreply@wishme.today>',
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', errText);
      return { success: false, error: errText };
    }
    console.log('Email sent to:', to);
    return { success: true };
  } catch (e: any) {
    console.error('Email send error:', e.message);
    return { success: false, error: e.message };
  }
}

async function sendWhatsApp(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneId) return { success: false, error: 'WhatsApp credentials not configured' };

  // Clean phone number to E.164
  const cleanPhone = to.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 10) return { success: false, error: 'Invalid phone number' };

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('WhatsApp error:', errText);
      return { success: false, error: errText };
    }
    console.log('WhatsApp sent to:', cleanPhone);
    return { success: true };
  } catch (e: any) {
    console.error('WhatsApp send error:', e.message);
    return { success: false, error: e.message };
  }
}

function buildEmailHtml(params: {
  heading: string;
  greeting: string;
  bodyText: string;
  celebrityName: string;
  orderId: string;
  amount: number;
  verificationCode?: string;
  viewUrl: string;
  buttonText: string;
}): string {
  const { heading, greeting, bodyText, celebrityName, orderId, amount, verificationCode, viewUrl, buttonText } = params;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #0f0d1a; color: #f1f0f3;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #F97316, #EC4899, #8B5CF6); padding: 3px; border-radius: 16px 16px 0 0;">
      <div style="background-color: #1a1625; padding: 32px; border-radius: 14px 14px 0 0; text-align: center;">
        <h1 style="color: #f1f0f3; margin: 0; font-size: 24px; font-weight: 700;">${heading}</h1>
        <p style="color: #9b95a8; margin: 8px 0 0; font-size: 14px;">From Wish Me with love 💝</p>
      </div>
    </div>
    <div style="background-color: #1a1625; padding: 32px; border: 1px solid #2a2540; border-top: none;">
      <p style="color: #f1f0f3; font-size: 16px; margin: 0 0 20px;">${greeting}</p>
      <p style="color: #9b95a8; font-size: 14px; line-height: 1.7; margin: 0 0 24px;">${bodyText}</p>
      <div style="background-color: #0f0d1a; border: 1px solid #2a2540; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="color: #9b95a8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px;">Order Details</p>
        <div style="display: flex; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #2a2540;">
          <span style="color: #6b6580; font-size: 14px; flex: 1;">Order ID</span>
          <span style="color: #f1f0f3; font-size: 14px; font-weight: 500;">${orderId.slice(0, 8)}...</span>
        </div>
        <div style="display: flex; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #2a2540;">
          <span style="color: #6b6580; font-size: 14px; flex: 1;">Celebrity</span>
          <span style="color: #f1f0f3; font-size: 14px; font-weight: 500;">${celebrityName}</span>
        </div>
        <div style="display: flex; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #2a2540;">
          <span style="color: #6b6580; font-size: 14px; flex: 1;">Amount</span>
          <span style="color: #F97316; font-size: 14px; font-weight: 600;">₹${amount}</span>
        </div>
        ${verificationCode ? `<div style="display: flex;">
          <span style="color: #6b6580; font-size: 14px; flex: 1;">Verification Code</span>
          <span style="color: #10b981; font-size: 14px; font-weight: 700; letter-spacing: 2px;">${verificationCode}</span>
        </div>` : `<div style="display: flex;">
          <span style="color: #6b6580; font-size: 14px; flex: 1;">Status</span>
          <span style="color: #10b981; font-size: 14px; font-weight: 600;">✓ Ready</span>
        </div>`}
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, #F97316, #EC4899, #8B5CF6); color: white; padding: 14px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">${buttonText}</a>
      </div>
    </div>
    <div style="background-color: #1a1625; padding: 24px 32px; border: 1px solid #2a2540; border-top: none; border-radius: 0 0 16px 16px; text-align: center;">
      <p style="color: #4a4460; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Wish Me · <a href="https://wishme.today" style="color: #8B5CF6; text-decoration: none;">wishme.today</a></p>
    </div>
  </div>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, type } = await req.json();

    if (!bookingId) {
      throw new Error('bookingId is required');
    }

    console.log(`Processing notification: bookingId=${bookingId}, type=${type}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking with user profile and celebrity
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id, final_price, message, recipient_name, recipient_verification_code, video_file_key, wishme_payment_id,
        celebrities!bookings_celebrity_id_fkey ( name ),
        profiles!bookings_user_id_fkey ( email, phone, first_name, last_name )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      throw new Error(`Booking not found: ${bookingId}`);
    }

    const celebrity = (booking as any).celebrities;
    const userProfile = (booking as any).profiles;
    const celebrityName = celebrity?.name || 'Your Celebrity';
    const userName = userProfile?.first_name || 'Customer';
    const userEmail = userProfile?.email;
    const userPhone = userProfile?.phone;
    const viewUrl = `https://wishmefinal.lovable.app/order/${booking.id}/view`;
    const verificationCode = booking.recipient_verification_code;

    // Get WishMe Payment ID
    let wishmePaymentId = (booking as any).wishme_payment_id;
    if (!wishmePaymentId) {
      const { data: ptData } = await supabase
        .from('payment_transactions')
        .select('wishme_payment_id')
        .eq('booking_id', bookingId)
        .maybeSingle();
      wishmePaymentId = ptData?.wishme_payment_id;
    }
    const displayPaymentId = wishmePaymentId || `ORD-${booking.id.slice(0, 8)}`;

    // Parse recipient info from message JSON
    let recipientEmail: string | null = null;
    let recipientPhone: string | null = null;
    let recipientName = booking.recipient_name || 'Friend';

    if (booking.message) {
      try {
        const msgData = typeof booking.message === 'string' ? JSON.parse(booking.message) : booking.message;
        recipientEmail = msgData.recipientEmail || msgData.recipient_email || null;
        recipientPhone = msgData.recipientPhone || msgData.recipient_phone || null;
        if (!booking.recipient_name) {
          recipientName = msgData.recipientName || msgData.recipient_name || 'Friend';
        }
      } catch {
        console.log('Message field is not parseable JSON, skipping recipient extraction');
      }
    }

    const results: Record<string, any> = {};

    // === NOTIFY ORDER PLACER ===
    if (userEmail) {
      const emailResult = await sendEmail(
        userEmail,
        `Your personalized video from ${celebrityName} is ready! 🎉`,
        buildEmailHtml({
          heading: 'Your Video is Ready! 🎉',
          greeting: `Hey ${userName} 👋`,
          bodyText: `Great news! Your personalized video message from <strong style="color: #F97316;">${celebrityName}</strong> is now ready to view and share!`,
          celebrityName,
          orderId: displayPaymentId,
          amount: booking.final_price,
          viewUrl,
          buttonText: 'Watch Your Video ▶',
        })
      );
      results.userEmail = emailResult;
    }

    if (userPhone) {
      const whatsappResult = await sendWhatsApp(
        userPhone,
        `🎉 Hey ${userName}! Your personalized video from ${celebrityName} is ready!\n\nPayment ID: ${displayPaymentId}\n▶ Watch now: ${viewUrl}\n\nThank you for using Wish Me! 💝`
      );
      results.userWhatsApp = whatsappResult;
    }

    // === NOTIFY RECIPIENT ===
    if (recipientEmail) {
      const emailResult = await sendEmail(
        recipientEmail,
        `You've received a personalized video gift! 🎁`,
        buildEmailHtml({
          heading: "You've Got a Video Gift! 🎁",
          greeting: `Hey ${recipientName} 👋`,
          bodyText: `Someone special has sent you a personalized video message from <strong style="color: #F97316;">${celebrityName}</strong>! Use the verification code below to watch it.`,
          celebrityName,
          orderId: displayPaymentId,
          amount: booking.final_price,
          verificationCode: verificationCode || undefined,
          viewUrl,
          buttonText: 'Watch Your Gift ▶',
        })
      );
      results.recipientEmail = emailResult;
    }

    if (recipientPhone) {
      const codeText = verificationCode ? `\n🔑 Verification Code: ${verificationCode}` : '';
      const whatsappResult = await sendWhatsApp(
        recipientPhone,
        `🎁 Hey ${recipientName}! You've received a personalized video gift from ${celebrityName}!\n\n▶ Watch now: ${viewUrl}${codeText}\n\nEnjoy your special message! 💝`
      );
      results.recipientWhatsApp = whatsappResult;
    }

    console.log('Notification results:', JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Notification error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
