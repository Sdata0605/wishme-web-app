import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wish_id, celebrity_id, occasion_name, user_message } = await req.json();

    console.log('Generating auto-reply:', { wish_id, celebrity_id, occasion_name });

    if (!wish_id || !celebrity_id || !occasion_name || !user_message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get celebrity details
    const { data: celebrity, error: celebError } = await supabase
      .from('celebrities')
      .select('name, category, bio')
      .eq('id', celebrity_id)
      .single();

    if (celebError || !celebrity) {
      console.error('Celebrity not found:', celebError);
      return new Response(
        JSON.stringify({ error: 'Celebrity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate reply using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are ${celebrity.name}, a ${celebrity.category}. 
Your task is to write a warm, personal, and authentic reply to a fan's occasion wish.

Guidelines:
- Write in first person as ${celebrity.name}
- Keep it warm, genuine, and personal (2-3 sentences)
- Express gratitude for the wish
- Match the tone of the occasion (${occasion_name})
- Stay in character based on your personality: ${celebrity.bio || 'a warm and friendly person'}
- Don't be overly formal or use clichés
- Make it feel like a real personal message`;

    const userPrompt = `A fan sent you this wish for your ${occasion_name}:

"${user_message}"

Write a heartfelt, personal reply as ${celebrity.name}. Keep it short and authentic.`;

    console.log('Calling Lovable AI for auto-reply generation...');

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9,
        max_tokens: 200
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices[0]?.message?.content || '';

    console.log('Auto-reply generated successfully');

    // Update wish with reply
    const { error: updateError } = await supabase
      .from('occasion_wishes')
      .update({
        reply_message: reply,
        reply_sent_at: new Date().toISOString()
      })
      .eq('id', wish_id);

    if (updateError) {
      console.error('Error updating wish:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        reply,
        message: 'Auto-reply generated and sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-occasion-auto-reply:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
