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
    
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENROUTER_API_KEY && !LOVABLE_API_KEY && !GEMINI_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
    const aiHeaders = {
      'Authorization': `Bearer ${OPENROUTER_API_KEY || LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wishme.app',
      'X-Title': 'Wish Me',
    };
    const chatUrl = OPENROUTER_API_KEY
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://ai.gateway.lovable.dev/v1/chat/completions';

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
    if (refinePrompt && (OPENROUTER_API_KEY || LOVABLE_API_KEY)) {
      console.log('Refining prompt...');
      const refineResponse = await fetch(chatUrl, {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
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

    const imagePrompt = referenceImageUrl && referenceImageSource !== 'none'
      ? `Create a premium greeting card. Incorporate the provided reference photo as the main focal point.
Add text: "Happy ${occasionName}, ${recipientName}!" prominently.
Add: "With love from ${senderName || 'Your Friend'}" at the bottom.
Style: ${finalPrompt}. Occasion: ${occasionName}.`
      : `Generate a beautiful greeting card for ${occasionName}.
Recipient: ${recipientName}. Sender: ${senderName || 'Your Friend'}.
Style: ${finalPrompt}.
Include text: "Happy ${occasionName}, ${recipientName}!" prominently.
Include: "With love from ${senderName || 'Your Friend'}" at bottom.
Professional, warm colors, premium design. High quality.`;

    console.log('Generating image via OpenRouter Image API...');
    let rawImageUrl: string | null = null;
    const lastErrors: string[] = [];
    const imageModels = ['google/gemini-2.5-flash-image', 'google/gemini-2.5-flash-image-preview'];

    if (OPENROUTER_API_KEY) {
      for (const model of imageModels) {
        const imageBody: Record<string, unknown> = {
          model,
          prompt: imagePrompt,
          aspect_ratio: '3:4',
        };
        if (referenceImageUrl && referenceImageSource !== 'none') {
          imageBody.input_references = [
            { type: 'image_url', image_url: { url: referenceImageUrl } },
          ];
        }
        const imageResponse = await fetch('https://openrouter.ai/api/v1/images', {
          method: 'POST',
          headers: aiHeaders,
          body: JSON.stringify(imageBody),
        });
        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          const msg = `Image API ${model} ${imageResponse.status}`;
          console.error(msg, errorText.substring(0, 400));
          lastErrors.push(msg);
          continue;
        }
        const imageData = await imageResponse.json();
        const item = imageData?.data?.[0];
        if (typeof item?.url === 'string' && item.url) {
          rawImageUrl = item.url;
        } else if (typeof item?.b64_json === 'string' && item.b64_json) {
          const media = typeof item.media_type === 'string' && item.media_type.startsWith('image/')
            ? item.media_type
            : 'image/png';
          rawImageUrl = `data:${media};base64,${item.b64_json}`;
        }
        if (rawImageUrl) {
          console.log('Image generated with Image API', model);
          break;
        }
        lastErrors.push(`Image API ${model} returned no image`);
      }

      if (!rawImageUrl) {
        console.log('Falling back to OpenRouter chat image models');
        const imageMessages = referenceImageUrl && referenceImageSource !== 'none'
          ? [{ role: 'user', content: [
              { type: 'text', text: imagePrompt },
              { type: 'image_url', image_url: { url: referenceImageUrl } },
            ]}]
          : [{ role: 'user', content: imagePrompt }];
        for (const model of imageModels) {
          const imageResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: aiHeaders,
            body: JSON.stringify({ model, messages: imageMessages, modalities: ['image', 'text'] }),
          });
          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            const msg = `Chat image ${model} ${imageResponse.status}`;
            console.error(msg, errorText.substring(0, 400));
            lastErrors.push(msg);
            continue;
          }
          const imageData = await imageResponse.json();
          const message = imageData?.choices?.[0]?.message;
          const fromImages = message?.images?.[0]?.image_url?.url || message?.images?.[0]?.url;
          if (typeof fromImages === 'string' && fromImages) {
            rawImageUrl = fromImages;
          }
          if (rawImageUrl) {
            console.log('Image generated with chat model', model);
            break;
          }
          lastErrors.push(`Chat image ${model} returned no image`);
        }
      }
    }

    if (!rawImageUrl) {
      await supabase.from('greeting_card_generations').update({
        status: 'failed',
        error_message: lastErrors.join('; ') || 'No image returned',
      }).eq('id', generation.id);
      throw new Error(lastErrors.length
        ? `Image generation failed (${lastErrors.join('; ')})`
        : 'No image generated by AI');
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
    const textResponse = (OPENROUTER_API_KEY || LOVABLE_API_KEY)
      ? await fetch(chatUrl, {
          method: 'POST',
          headers: aiHeaders,
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Write warm 2-3 sentence greeting card messages. Include sender name at end.' },
              { role: 'user', content: `Write a ${occasionName} message for ${recipientName} from ${senderName || 'Your Friend'}.` }
            ]
          }),
        })
      : null;

    let greetingText = `Dear ${recipientName}, Wishing you a wonderful ${occasionName}! With love, ${senderName || 'Your Friend'}`;
    if (textResponse?.ok) {
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
        status: 'completed',
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
