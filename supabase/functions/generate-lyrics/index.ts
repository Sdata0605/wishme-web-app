import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { openRouterText } from "../_shared/openrouter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, genre, mood, language } = await req.json();

    const systemPrompt = 'You are a lyricist. Output ONLY clean song lyrics - no labels, no formatting tags, no explanations. Just the actual lyric lines with natural rhyming and emotional flow.';

    const userPrompt = `Write song lyrics in ${language || 'English'} based on:

Theme: ${description}
Genre: ${genre}
Mood: ${mood}

IMPORTANT RULES:
- Output ONLY the lyrics text, nothing else
- NO section labels like [Verse], [Chorus], [Bridge]
- NO explanations, notes, or commentary
- NO title or headers
- Just clean, readable lyric lines with natural rhyming and flow
- Make it emotional and match the ${genre} ${mood} style
- Write 3-4 verses with a repeating chorus pattern
- The lyrics MUST be in ${language || 'English'}

Output the lyrics directly without any formatting or labels:`;

    let lyrics = await openRouterText(userPrompt, {
      system: systemPrompt,
      maxTokens: 1200,
      temperature: 0.8,
    });

    lyrics = lyrics
      .replace(/\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Refrain)[^\]]*\]/gi, '')
      .replace(/^(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Refrain)[\s\d:]*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return new Response(
      JSON.stringify({ lyrics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error generating lyrics:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate lyrics' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
