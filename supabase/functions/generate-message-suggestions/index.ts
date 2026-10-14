import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const celebrityName = body.celebrityName || body.celebrity_name;
    const occasionType = body.occasionType || body.occasion;
    const recipientName = body.recipientName || body.recipient_name || 'a fan';
    console.log('Generating message suggestions for:', { celebrityName, occasionType, recipientName });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not found');
    }

    const prompt = `Generate 3 heartfelt, personal message suggestions for wishing ${celebrityName} on their ${occasionType}.

The messages are from a fan named ${recipientName} to the celebrity.

Requirements:
- Each message should be 2-3 sentences
- Make them warm, genuine, and specific to the occasion
- Vary the tone: one formal, one casual, one emotional
- Keep them appropriate for a fan-to-celebrity context
- Each should be unique and meaningful

Return ONLY a JSON array of 3 strings, nothing else.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Error:', errorText);
      if (response.status === 429) {
        throw new Error('AI service rate limit reached. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('AI service credits exhausted. Please contact support.');
      }
      throw new Error(`Failed to generate suggestions: ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    console.log('Raw AI response:', rawContent);

    // Parse the JSON array from the response
    let suggestions: string[];
    try {
      // Try to extract JSON array if wrapped in markdown code blocks
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = JSON.parse(rawContent);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Fallback: split by newlines and clean up
      suggestions = rawContent
        .split('\n')
        .filter((line: string) => line.trim() && !line.startsWith('[') && !line.startsWith(']'))
        .map((line: string) => line.replace(/^["'\-\d.\s]+/, '').replace(/["',]+$/, '').trim())
        .filter((line: string) => line.length > 20)
        .slice(0, 3);
    }

    console.log('Parsed suggestions:', suggestions);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating message suggestions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});