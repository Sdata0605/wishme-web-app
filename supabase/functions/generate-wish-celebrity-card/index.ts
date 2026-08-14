import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('=== Generate Wish Celebrity Card ===', orderId);
    
    const LOVABLE_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not found');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: order, error: fetchError } = await supabase
      .from('wish_celebrity_orders')
      .select('*, celebrities (id, name, profile_id, image_url)')
      .eq('id', orderId).single();

    if (fetchError || !order) throw new Error('Failed to fetch order');

    const { message, recipient_name: recipientName, occasion_type: occasionType, reference_image_url: referenceImageUrl, card_prompt } = order;
    const celebrityName = order.celebrities?.name || 'Celebrity';
    const celebrityImageUrl = order.celebrities?.image_url;

    if (!message || message.length > 1000) throw new Error('Message must be 1-1000 characters');
    if (!recipientName || recipientName.length > 100) throw new Error('Recipient name must be 1-100 characters');

    // Profanity filter
    const profanityList = ['fuck','shit','bitch','asshole','bastard','cunt','dick','pussy','cock','whore','slut','nigger','nigga','fag','faggot','retard','rape','kill','murder'];
    const checkText = `${message} ${recipientName} ${card_prompt || ''}`.toLowerCase();
    const found = profanityList.find(w => new RegExp(`\\b${w}\\b`, 'i').test(checkText));
    if (found) throw new Error('Your message contains inappropriate content. Please revise.');

    // Generate greeting text
    const textPrompt = `Create a warm greeting from a fan to ${celebrityName} for ${occasionType}.
Fan's message: ${message}. Address ${celebrityName} by name. Express admiration. 2-3 sentences.
${card_prompt ? `Style: ${card_prompt}` : ''}`;

    const textResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: textPrompt }] }),
    });

    if (!textResponse.ok) {
      const err = await textResponse.text();
      if (textResponse.status === 429) throw new Error('Rate limit. Try again later.');
      if (textResponse.status === 402) throw new Error('AI credits exhausted.');
      throw new Error(`Text generation failed: ${err}`);
    }

    const greetingText = (await textResponse.json()).choices[0].message.content;
    console.log('Greeting text generated');

    // Generate card image
    let cardUrl = referenceImageUrl;
    const baseImagePrompt = `Create a greeting card for ${celebrityName}'s ${occasionType}.
Main text: "Happy ${occasionType}, ${celebrityName}!" prominently.
Bottom: "From your fan, ${recipientName}" in smaller text.
Style: Celebratory, festive, ${occasionType} theme. ${card_prompt || 'Elegant fan appreciation style'}.`;

    let imageRequestBody: any;
    if (celebrityImageUrl) {
      imageRequestBody = {
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: [
          { type: 'text', text: `${baseImagePrompt}\nIncorporate this photo of ${celebrityName} prominently. Use THIS exact photo.` },
          { type: 'image_url', image_url: { url: celebrityImageUrl } }
        ]}],
        modalities: ['image', 'text']
      };
    } else {
      imageRequestBody = {
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: baseImagePrompt }],
        modalities: ['image', 'text']
      };
    }

    const imageResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(imageRequestBody),
    });

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (generatedImage) {
        // Upload to storage
        try {
          const base64Data = generatedImage.split(',')[1];
          if (base64Data) {
            const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = `ai-cards/${orderId}-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
              .from('greeting-card-uploads')
              .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage.from('greeting-card-uploads').getPublicUrl(fileName);
              cardUrl = publicUrl;
              console.log('Card uploaded to storage');
            }
          }
        } catch (e) {
          console.error('Upload error:', e);
        }
      }
    } else {
      console.error('Image generation failed:', imageResponse.status);
    }

    // Update order
    const { data: orderCheck } = await supabase.from('wish_celebrity_orders').select('generation_attempts').eq('id', orderId).single();
    const attempts = (orderCheck?.generation_attempts || 0) + 1;

    await supabase.from('wish_celebrity_orders').update({
      greeting_text: greetingText,
      generated_card_image_url: cardUrl,
      generation_attempts: attempts,
      status: 'generated',
    }).eq('id', orderId);

    console.log('=== Card Generation Complete ===');

    return new Response(JSON.stringify({ 
      success: true, greeting_text: greetingText, card_url: cardUrl, generation_attempts: attempts
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
