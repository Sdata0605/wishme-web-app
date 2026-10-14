import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, cardUrl: clientCardUrl, greetingText: clientGreeting } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Fetch order details with celebrity information
    const { data: order, error: orderError } = await supabaseClient
      .from('wish_celebrity_orders')
      .select(`
        *,
        celebrities:celebrity_id (
          id,
          name,
          profile_id
        ),
        profiles:user_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cardImageUrl = order.generated_card_image_url || order.card_url || clientCardUrl || null;
    const greetingText = order.greeting_text || clientGreeting || null;

    if (!cardImageUrl || !greetingText) {
      console.error('Card missing on send', {
        hasGeneratedUrl: !!order.generated_card_image_url,
        hasCardUrl: !!order.card_url,
        hasGreeting: !!order.greeting_text,
        hasClientCard: !!clientCardUrl,
        hasClientGreeting: !!clientGreeting,
      });
      return new Response(
        JSON.stringify({ error: 'Card must be generated before sending' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!order.generated_card_image_url || !order.greeting_text || !order.card_url) {
      const { error: persistError } = await supabaseClient
        .from('wish_celebrity_orders')
        .update({
          generated_card_image_url: cardImageUrl,
          card_url: cardImageUrl,
          greeting_text: greetingText,
        })
        .eq('id', orderId);
      if (persistError) {
        console.error('Error persisting card before send:', persistError);
      }
    }

    // Check if already approved/sent
    if (order.card_approved || order.status === 'sent') {
      return new Response(
        JSON.stringify({ error: 'Card has already been sent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = order.user_id;
    const celebrityId = order.celebrity_id;

    // Find or create conversation between user and celebrity
    let conversation;
    const { data: existingConversation } = await supabaseClient
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('celebrity_id', celebrityId)
      .single();

    if (existingConversation) {
      conversation = existingConversation;
    } else {
      const { data: newConversation, error: conversationError } = await supabaseClient
        .from('conversations')
        .insert({
          user_id: userId,
          celebrity_id: celebrityId,
        })
        .select()
        .single();

      if (conversationError) {
        console.error('Error creating conversation:', conversationError);
        return new Response(
          JSON.stringify({ error: 'Failed to create conversation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      conversation = newConversation;
    }

    // Send the greeting card message from user to celebrity
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: userId,
        sender_type: 'user',
        message_text: `${greetingText}\n\n[Greeting Card: ${cardImageUrl}]`,
        is_ai_generated: true,
      });

    if (messageError) {
      console.error('Error sending message:', messageError);
      return new Response(
        JSON.stringify({ error: 'Failed to send message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send thank you DM from celebrity to user
    const thankYouMessage = `Thank you so much for your wonderful wishes on my special day! 🎉 Your thoughtful greeting card truly made my day even more special. I appreciate you taking the time to celebrate with me! ❤️`;
    
    const { error: thankYouError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: celebrityId,
        sender_type: 'celebrity',
        message_text: thankYouMessage,
        is_ai_generated: true,
      });

    if (thankYouError) {
      console.error('Error sending thank you message:', thankYouError);
    }

    // Mark order as approved and sent
    const { error: updateError } = await supabaseClient
      .from('wish_celebrity_orders')
      .update({
        card_approved: true,
        status: 'sent',
        completed_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update order status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Wish card successfully sent to celebrity');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Greeting card sent successfully to celebrity',
        conversation_id: conversation.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-wish-to-celebrity function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
