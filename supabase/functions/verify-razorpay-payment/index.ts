import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateWishMePaymentId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `WM${yy}${mm}${random}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      booking_id,
      orderId,
      orderType = 'booking'
    } = await req.json();
    
    console.log('Verifying payment for:', orderType, orderId || booking_id);
    
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) throw new Error('Razorpay key secret not found');

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(keySecret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(text));
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      // Fire payment_failed notification
      try {
        const spUrl = Deno.env.get('SUPABASE_URL')!;
        const spKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        await fetch(`${spUrl}/functions/v1/send-wishme-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${spKey}`, 'apikey': spKey },
          body: JSON.stringify({
            event_key: 'payment_failed',
            recipient_type: 'user',
            data: { amount: '0', payment_method: 'razorpay' }
          })
        });
      } catch (e) { console.warn('Notification error:', e); }
      throw new Error('Invalid payment signature');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let updateError = null;
    let orderAmount = 0;
    let userId = null;
    let serviceType = 'booking';
    let description = 'Razorpay payment';
    const actualOrderId = orderId || booking_id;

    if (orderType === 'wish' && orderId) {
      console.log('Updating wish_celebrity_orders table');
      // Get order details for payment transaction
      const { data: orderData } = await supabase
        .from('wish_celebrity_orders')
        .select('amount_paid, user_id, occasion_type, celebrities(name)')
        .eq('id', orderId)
        .single();
      
      if (orderData) {
        orderAmount = orderData.amount_paid || 0;
        userId = orderData.user_id;
        serviceType = 'wish_order';
        description = `Wish order for ${(orderData as any).celebrities?.name || 'Celebrity'} - ${orderData.occasion_type || ''}`;
      }

      const { error } = await supabase
        .from('wish_celebrity_orders')
        .update({ 
          payment_status: 'completed',
          razorpay_order_id,
          razorpay_payment_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      updateError = error;
    } else if (booking_id) {
      console.log('Updating bookings table - payment verified');
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('final_price, user_id, service_type, celebrities(name)')
        .eq('id', booking_id)
        .single();

      if (bookingData) {
        orderAmount = bookingData.final_price || 0;
        userId = bookingData.user_id;
        serviceType = 'booking';
        description = `Booking for ${(bookingData as any).celebrities?.name || 'Celebrity'} - ${bookingData.service_type || ''}`;
      }
    } else {
      // Wallet top-ups and plan purchases have no order of ours to update: the app records those itself
      // once this says the payment is real. The signature above proves the ids belong together; here we
      // also ask Razorpay that the order was really paid, and for how much.
      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      if (!keyId || !razorpay_order_id) throw new Error('No valid order ID provided');
      const rzp = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
      });
      if (!rzp.ok) throw new Error('Could not confirm the payment with Razorpay');
      const rzpOrder = await rzp.json();
      if (rzpOrder.status !== 'paid') throw new Error('This payment has not been completed');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment verified successfully',
          amount: Math.round((rzpOrder.amount_paid ?? rzpOrder.amount ?? 0) / 100),
          wishme_payment_id: generateWishMePaymentId(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // Generate WishMe Payment ID
    let wishmePaymentId = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      wishmePaymentId = generateWishMePaymentId();
      const { data: existing } = await supabase
        .from('payment_transactions')
        .select('id')
        .eq('wishme_payment_id', wishmePaymentId)
        .maybeSingle();
      if (!existing) isUnique = true;
      attempts++;
    }

    if (isUnique && userId) {
      const orderColumn = serviceType === 'wish_order' ? 'wish_order_id' : 'booking_id';
      await supabase.from('payment_transactions').insert({
        wishme_payment_id: wishmePaymentId,
        razorpay_payment_id,
        razorpay_order_id,
        [orderColumn]: actualOrderId,
        user_id: userId,
        amount: orderAmount,
        payment_method: 'razorpay',
        service_type: serviceType,
        description,
        status: 'completed',
        paid_at: new Date().toISOString(),
      });

      // Update source table with wishme_payment_id
      if (orderType === 'wish' && orderId) {
        await supabase.from('wish_celebrity_orders').update({ wishme_payment_id: wishmePaymentId }).eq('id', orderId);
      } else if (booking_id) {
        await supabase.from('bookings').update({ wishme_payment_id: wishmePaymentId }).eq('id', booking_id);
      }

      console.log('Generated WishMe Payment ID:', wishmePaymentId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment verified successfully',
        wishme_payment_id: wishmePaymentId || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
