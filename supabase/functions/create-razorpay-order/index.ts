import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency, receipt, notes } = await req.json();
    
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      console.error('Missing Razorpay credentials:', { hasKeyId: !!keyId, hasKeySecret: !!keySecret });
      throw new Error('Razorpay credentials not configured');
    }

    console.log('Using Razorpay key:', keyId.substring(0, 8) + '...');

    // Create Razorpay order with short receipt (max 40 chars)
    // Use timestamp-based short ID instead of full UUID
    const shortReceipt = receipt.length > 40 
      ? `W${Date.now().toString(36).slice(-8).toUpperCase()}`
      : receipt;
    
    console.log('Creating Razorpay order with receipt:', shortReceipt);
    
    const orderData = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency || 'INR',
      receipt: shortReceipt,
      notes: notes || {}
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.error?.description || 'Failed to create order');
    }

    return new Response(
      JSON.stringify({
        ...order,
        key_id: keyId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});