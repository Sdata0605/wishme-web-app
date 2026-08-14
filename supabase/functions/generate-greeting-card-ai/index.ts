import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function uploadBase64ToStorage(supabase: any, base64Url: string, userId: string, genId: string): Promise<string | null> {
  try {
    const base64Data = base64Url.split(',')[1];
    if (!base64Data) return null;
    
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const fileName = `greeting-cards/${userId}/${genId}-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('greeting-card-uploads')
      .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('greeting-card-uploads')
      .getPublicUrl(fileName);
    
    console.log('Uploaded to storage:', publicUrl);
    return publicUrl;
  } catch (e) {
    console.error('Upload helper error:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, occasionName, recipientName, senderName, refinePrompt, referenceImageUrl, referenceImageSource } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not found');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Profile + pricing
    const { data: profile } = await supabase
      .from('profiles').select('id, wallet_balance, plan').eq('user_id', user.id).single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: pricingSetting } = await supabase
      .from('platform_settings').select('setting_value').eq('setting_key', 'greeting_card_price').single();
    const basePrice = parseInt(pricingSetting?.setting_value || '2');

    let discountPercentage = 0;
    if (profile.plan) {
      const { data: planData } = await supabase
        .from('plans').select('service_discount_percentage').eq('name', profile.plan).single();
      if (planData?.service_discount_percentage) discountPercentage = planData.service_discount_percentage;
    }

    const cardPrice = Math.round(basePrice * (1 - discountPercentage / 100));
    console.log(`Price: ₹${cardPrice} (base: ${basePrice}, discount: ${discountPercentage}%)`);

    if (profile.wallet_balance < cardPrice) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient wallet balance', required: cardPrice, available: profile.wallet_balance
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create generation record — DO NOT store reference image base64
    const { data: generation, error: genError } = await supabase
      .from('greeting_card_generations')
      .insert({
        user_id: profile.id,
        original_prompt: prompt,
        occasion_name: occasionName,
        recipient_name: recipientName,
        reference_image_url: referenceImageSource === 'none' ? null : 'upload',
        reference_image_source: referenceImageSource || 'none',
        prompt_refinement_used: refinePrompt || false,
        status: 'processing',
        amount_charged: cardPrice
      })
      .select()
      .single();

    if (genError) {
      console.error('Error creating generation:', genError);
      throw new Error(`DB insert failed: ${genError.message}`);
    }

    console.log('Generation created:', generation.id);

    let finalPrompt = prompt;

    // Optional prompt refinement
    if (refinePrompt) {
      console.log('Refining prompt...');
      const refineResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Refine image generation prompts for greeting cards. Make prompts visually descriptive. Keep it to 2-3 sentences.' },
            { role: 'user', content: `Refine this greeting card prompt for ${occasionName}:\n"${prompt}"` }
          ]
        }),
      });

      if (refineResponse.ok) {
        const refineData = await refineResponse.json();
        finalPrompt = refineData.choices[0].message.content;
        await supabase.from('greeting_card_generations').update({ refined_prompt: finalPrompt }).eq('id', generation.id);
      }
    }

    // Generate image
    console.log('Generating image...');
    let messageContent: any;
    
    if (referenceImageUrl && referenceImageSource !== 'none') {
      messageContent = [
        { type: 'text', text: `CRITICAL: Incorporate the provided image as the MAIN FOCAL POINT of this greeting card.
Keep it intact and visible. Add decorations AROUND it.
Add text: "Happy ${occasionName}, ${recipientName}!" prominently.
Add: "With love from ${senderName || 'Your Friend'}" at bottom.
Style: ${finalPrompt}. Occasion: ${occasionName}.
Make it a premium greeting card with the image as centerpiece.` },
        { type: 'image_url', image_url: { url: referenceImageUrl } }
      ];
    } else {
      messageContent = `Generate a beautiful greeting card for ${occasionName}.
Recipient: ${recipientName}. Sender: ${senderName || 'Your Friend'}.
Style: ${finalPrompt}.
Include text: "Happy ${occasionName}, ${recipientName}!" prominently.
Include: "With love from ${senderName || 'Your Friend'}" at bottom.
Professional, warm colors, premium design. High quality.`;
    }

    const imageResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: messageContent }],
        modalities: ['image', 'text']
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Image generation error:', imageResponse.status, errorText);
      await supabase.from('greeting_card_generations').update({ status: 'failed', error_message: errorText }).eq('id', generation.id);
      throw new Error(`Image generation failed (${imageResponse.status})`);
    }

    const imageData = await imageResponse.json();
    const rawImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!rawImageUrl) {
      await supabase.from('greeting_card_generations').update({ status: 'failed', error_message: 'No image returned' }).eq('id', generation.id);
      throw new Error('No image generated by AI');
    }

    console.log('Image generated, uploading to storage...');

    // Upload to storage instead of storing base64 in DB
    let finalImageUrl = rawImageUrl;
    if (rawImageUrl.startsWith('data:')) {
      const storageUrl = await uploadBase64ToStorage(supabase, rawImageUrl, profile.id, generation.id);
      if (storageUrl) {
        finalImageUrl = storageUrl;
      }
      // If storage upload fails, fall back to returning base64 to client but store truncated in DB
    }

    // Generate greeting text
    const textResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Write warm 2-3 sentence greeting card messages. Include sender name at end.' },
          { role: 'user', content: `Write a ${occasionName} message for ${recipientName} from ${senderName || 'Your Friend'}.` }
        ]
      }),
    });

    let greetingText = `Dear ${recipientName}, Wishing you a wonderful ${occasionName}! With love, ${senderName || 'Your Friend'}`;
    if (textResponse.ok) {
      const textData = await textResponse.json();
      greetingText = textData.choices[0].message.content;
    }

    // Update generation — store URL (not base64)
    const dbImageUrl = finalImageUrl.startsWith('data:') ? 'base64-returned-to-client' : finalImageUrl;
    await supabase.from('greeting_card_generations').update({
      generated_image_url: dbImageUrl,
      greeting_text: greetingText,
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', generation.id);

    // Wallet deduction via transaction (trigger handles balance)
    await supabase.from('wallet_transactions').insert({
      user_id: profile.id,
      transaction_type: 'greeting_card_generation',
      amount: cardPrice,
      status: 'completed',
      processed_at: new Date().toISOString(),
      transaction_details: {
        generation_id: generation.id, occasion: occasionName, recipient: recipientName,
        base_price: basePrice, discount_percentage: discountPercentage, final_price: cardPrice
      }
    });

    console.log('Greeting card generated successfully');

    // Fire notification: greeting_card_ready
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      await fetch(`${SUPABASE_URL}/functions/v1/send-wishme-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'apikey': SUPABASE_SERVICE_ROLE_KEY },
        body: JSON.stringify({
          event_key: 'greeting_card_ready',
          recipient_type: 'user',
          recipient_id: profile.id,
          data: { first_name: 'User', occasion: occasionName, payment_id: generation.id }
        })
      });
    } catch (e) { console.warn('Notification error:', e); }

    return new Response(JSON.stringify({ 
      success: true,
      generation: {
        id: generation.id,
        generated_image_url: finalImageUrl,
        greeting_text: greetingText,
        refined_prompt: finalPrompt !== prompt ? finalPrompt : null
      },
      discount_applied: discountPercentage,
      amount_charged: cardPrice
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error generating greeting card:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
