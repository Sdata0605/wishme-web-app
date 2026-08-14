import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userMessage } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not found');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch conversation details with celebrity and user info
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        celebrity:celebrities!conversations_celebrity_id_fkey (
          id,
          name,
          bio,
          category,
          profile_id
        ),
        user:profiles!conversations_user_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    const celebrity = conversation.celebrity;
    const user = conversation.user;

    if (!celebrity?.profile_id) {
      throw new Error(`Celebrity does not have a linked profile. Cannot send message.`);
    }

    // Verify the profile exists
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', celebrity.profile_id)
      .single();

    if (!profileCheck) {
      throw new Error(`Celebrity profile ${celebrity.profile_id} not found in profiles table.`);
    }

    console.log('Generating AI response for celebrity:', celebrity.name, 'profile_id:', celebrity.profile_id);

    // Fetch message history
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_type, message_text')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) throw messagesError;

    const conversationHistory = messages?.reverse().map(msg => ({
      role: msg.sender_type === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.message_text
    })) || [];

    const systemPrompt = `You are ${celebrity.name}, a ${celebrity.category} celebrity, chatting with your fan ${user?.first_name || 'a fan'} ${user?.last_name || ''}.

Your personality and background: ${celebrity.bio || 'A warm, friendly, and approachable celebrity'}

Guidelines for your responses:
- Be warm, genuine, and personable
- Keep responses conversational and natural (2-4 sentences)
- Reference previous conversation context when relevant
- Show interest in what the fan is sharing
- Be encouraging and supportive
- Sound like a real person having a friendly chat
- Use 1-2 emojis naturally
- NEVER say "as an AI" or reference being artificial
- Respond as if you ARE ${celebrity.name}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          ...(userMessage ? [{ role: 'user', content: userMessage }] : [])
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorData = await response.text();
      console.error('Lovable AI Error:', response.status, errorData);
      throw new Error(`AI API error: ${errorData}`);
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    console.log('Generated AI reply:', aiReply);

    // Insert AI message into database
    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: celebrity.profile_id,
        sender_type: 'celebrity',
        message_text: aiReply,
        is_ai_generated: true,
        is_read: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting AI message:', insertError);
      throw insertError;
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: newMessage,
        reply: aiReply
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating AI message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
