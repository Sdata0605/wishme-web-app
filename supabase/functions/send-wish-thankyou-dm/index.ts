import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    console.log('=== Send Wish Thank You DM ===');
    console.log('Order ID:', orderId);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch order details
    const { data: order, error: fetchError } = await supabase
      .from('wish_celebrity_orders')
      .select(`
        *,
        celebrities (
          id,
          name,
          profile_id
        )
      `)
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('Fetch order error:', fetchError);
      throw new Error('Failed to fetch order details');
    }

    console.log('Order fetched:', order.id);

    const { recipient_name: recipientName, occasion_type: occasionType, user_id: userId } = order;
    const celebrityName = order.celebrities?.name || 'Celebrity';
    const celebrityId = order.celebrities?.id;
    const celebrityProfileId = order.celebrities?.profile_id;

    // Get WishMe Payment ID
    let wishmePaymentId = '';
    const { data: ptData } = await supabase
      .from('payment_transactions')
      .select('wishme_payment_id')
      .eq('wish_order_id', orderId)
      .maybeSingle();
    if (ptData?.wishme_payment_id) {
      wishmePaymentId = ptData.wishme_payment_id;
    }

    // Find or create conversation
    let conversationId = null;

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('celebrity_id', celebrityId)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
      console.log('Found existing conversation:', conversationId);
    } else {
      console.log('Creating new conversation...');
      const { data: newConv, error: convInsertError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          celebrity_id: celebrityId,
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (convInsertError) {
        console.error('Error creating conversation:', convInsertError);
        throw convInsertError;
      }

      conversationId = newConv.id;
      console.log('Created new conversation:', conversationId);
    }

    // Create thank you message
    const paymentIdText = wishmePaymentId ? `\nPayment ID: ${wishmePaymentId}` : '';
    const thankYouMessage = `Thank you so much for your wonderful ${occasionType} wish! Your ${order.card_generation_type === 'upload-video' ? 'video' : 'card'} has been received and it truly warmed my heart. I appreciate you thinking of ${recipientName || 'me'}. Stay blessed! 🌟💝${paymentIdText}`;

    console.log('Inserting thank you message...');
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: celebrityId,
        sender_type: 'celebrity',
        message_text: thankYouMessage,
        is_ai_generated: true,
        is_read: false
      });

    if (messageError) {
      console.error('Error inserting message:', messageError);
      throw messageError;
    }

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        unread_count_user: 1
      })
      .eq('id', conversationId);

    console.log('Thank you DM sent successfully');
    console.log('=== DM Send Complete ===');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Thank you DM sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending thank you DM:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
