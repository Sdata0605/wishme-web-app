import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const body = await req.json();
    const celebrityName = body.celebrityName || body.celebrity_name;
    const occasionType = body.occasionType || body.occasion;
    const recipientName = body.recipientName || body.recipient_name;
    const message = body.message;

    if (!celebrityName || !occasionType) {
      return new Response(
        JSON.stringify({ error: 'Celebrity name and occasion type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const apiKey = OPENROUTER_API_KEY || LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const chatUrl = OPENROUTER_API_KEY
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://ai.gateway.lovable.dev/v1/chat/completions';

    const systemPrompt = `You are a creative AI assistant that generates beautiful, visually descriptive prompts for greeting card images.
Your prompts should be:
- Vivid and detailed visual descriptions
- Appropriate for ${occasionType} occasions
- Featuring or honoring ${celebrityName}
- Warm, celebratory, and visually rich
- Safe for all audiences
- Between 50-100 words each

Return ONLY a JSON array of 3 unique prompts as strings, nothing else.`;

    const userPrompt = `Generate 3 creative, visually descriptive prompts for ${occasionType} greeting card images featuring ${celebrityName}${recipientName ? ` for ${recipientName}` : ''}${message ? `. Context: ${String(message).substring(0, 100)}` : ''}.`;

    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wishme.app',
        'X-Title': 'Wish Me',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Prompt suggestion AI error:', response.status, errorText);
      throw new Error('Failed to generate prompts');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let prompts: string[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        prompts = parsed.filter((item: unknown) => typeof item === 'string');
      }
    } catch {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            prompts = parsed.filter((item: unknown) => typeof item === 'string');
          }
        } catch {
          prompts = content
            .split('\n')
            .filter((line: string) => line.trim().length > 20)
            .map((line: string) => line.replace(/^[-*\d.)\]]\s*/, '').trim())
            .filter((line: string) => line.length > 0)
            .slice(0, 3);
        }
      }
    }

    if (prompts.length === 0) {
      prompts = [
        `A beautiful ${occasionType} celebration scene featuring ${celebrityName}, with vibrant colors, festive decorations, and warm lighting creating a joyful atmosphere`,
        `An elegant greeting card design for ${occasionType} with ${celebrityName}'s signature style, incorporating celebratory elements and heartfelt wishes`,
        `A stunning visual tribute for ${occasionType} showcasing ${celebrityName} in a warm, celebratory setting with artistic flourishes and festive charm`
      ];
    }

    return new Response(
      JSON.stringify({ prompts: prompts.slice(0, 3) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-greeting-card-prompts:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
