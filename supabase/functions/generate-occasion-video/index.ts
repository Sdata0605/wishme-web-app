import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { openRouterText } from "../_shared/openrouter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to clean script text for TTS
function cleanScriptForTTS(script: string): string {
  return script
    .replace(/^(Script|Opening|Greeting|Message|Closing|Body|Intro|Outro|Note|Instructions?):\s*/gim, '')
    .replace(/^\*\*.*?\*\*\s*/gm, '') // Remove markdown bold headers
    .replace(/^#.*$/gm, '') // Remove markdown headers
    .replace(/^\[.*?\]\s*/gm, '') // Remove bracketed stage directions
    .replace(/^\(.*?\)\s*/gm, '') // Remove parenthetical notes
    .replace(/^[-•]\s*/gm, '') // Remove bullet points
    .replace(/"/g, '') // Remove quotation marks
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, occasionName, recipientName, message, celebrityId } = await req.json();
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch celebrity details
    const { data: celebrity } = await supabase
      .from('celebrities')
      .select('name, bio')
      .eq('id', celebrityId)
      .single();

    console.log('Generating video script with OpenRouter...');
    
    let generatedScript = await openRouterText(
      `You are a script writer for personalized celebrity video messages.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- Output ONLY the spoken script text - absolutely nothing else
- Do NOT include any headers, labels, or formatting (no "Script:", "Opening:", "Greeting:", etc.)
- Do NOT include stage directions, notes, or instructions
- Do NOT include quotation marks around the script
- Do NOT include bullet points or numbered lists
- The output will be directly fed to a text-to-speech system, so EVERY WORD you write will be spoken aloud
- Write in a natural, conversational tone as if the celebrity is speaking directly to the recipient

Create a warm, heartfelt 30-45 second video script for:
- Celebrity: ${celebrity?.name || 'Celebrity'}
- Occasion: ${occasionName}
- Recipient: ${recipientName}
- User's message: ${message}

The script should:
1. Open with a warm greeting for ${occasionName}
2. Address ${recipientName} personally
3. Incorporate the user's message naturally
4. Include positive wishes and blessings
5. End with an uplifting closing

Remember: Output ONLY the words to be spoken. No headers, no labels, no formatting.`,
      { maxTokens: 500, temperature: 0.8 },
    );
    
    // Clean the script for TTS
    generatedScript = cleanScriptForTTS(generatedScript);

    console.log('Generated script:', generatedScript);

    // Update booking with generated content
    const { error: updateError } = await supabase
      .from('occasion_bookings')
      .update({
        ai_generated_content: generatedScript,
        status: 'processing',
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw updateError;
    }

    console.log('Booking updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        script: generatedScript 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating video:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
