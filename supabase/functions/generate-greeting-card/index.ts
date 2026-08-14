import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const { bookingId, occasionName, recipientName, message, celebrityId } = await req.json();
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch celebrity details
    const { data: celebrity } = await supabase
      .from('celebrities')
      .select('name, image_url')
      .eq('id', celebrityId)
      .single();

    console.log('Generating greeting card text with OpenRouter...');
    
    let generatedText = await openRouterText(
      `You are a greeting card writer. Create a beautiful, concise greeting card message.

CRITICAL: Output ONLY the greeting text - no headers, no labels, no formatting.

Context:
- Celebrity: ${celebrity?.name || 'Celebrity'}
- Occasion: ${occasionName}
- Recipient: ${recipientName}
- User's message: ${message}

Create a heartfelt 2-3 sentence greeting that:
1. Celebrates ${occasionName}
2. Addresses ${recipientName} warmly
3. Incorporates the essence of the user's message
4. Includes positive wishes

Output ONLY the greeting text, warm and celebratory. No labels or formatting.`,
      { maxTokens: 200, temperature: 0.8 },
    );
    
    // Clean up any formatting
    generatedText = generatedText
      .replace(/^(Greeting|Message|Text|Card):\s*/gim, '')
      .replace(/^\*\*.*?\*\*\s*/gm, '')
      .replace(/^#.*$/gm, '')
      .replace(/"/g, '')
      .trim();

    console.log('Generated greeting card text:', generatedText);

    // Update booking with generated content
    const { error: updateError } = await supabase
      .from('occasion_bookings')
      .update({
        ai_generated_content: generatedText,
        greeting_card_url: celebrity?.image_url || '',
        status: 'completed',
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
        text: generatedText,
        imageUrl: celebrity?.image_url || ''
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating greeting card:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
