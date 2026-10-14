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
    const fileName = `promotions/${userId}/${genId}-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from('greeting-card-uploads').upload(fileName, buffer, { contentType: 'image/png', upsert: false });
    if (error) { console.error('Upload error:', error); return null; }
    const { data: { publicUrl } } = supabase.storage.from('greeting-card-uploads').getPublicUrl(fileName);
    return publicUrl;
  } catch (e) { console.error('Upload helper error:', e); return null; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { celebrityId, concept, brandingDetails, referenceImageUrl, referenceImageSource } = await req.json();
    console.log('Image promotion request:', { celebrityId, concept: concept?.substring(0, 50) });

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if ((!OPENROUTER_API_KEY && !LOVABLE_API_KEY) || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const aiHeaders = {
      'Authorization': `Bearer ${OPENROUTER_API_KEY || LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wishme.app',
      'X-Title': 'Wish Me',
    };

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: profile } = await supabase.from('profiles').select('id, wallet_balance').eq('user_id', user.id).single();
    if (!profile) return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: pricingData } = await supabase.from('platform_settings').select('setting_value').eq('setting_key', 'image_promotion_price').single();
    const price = pricingData ? parseInt(pricingData.setting_value) : 25;

    if (profile.wallet_balance < price) {
      return new Response(JSON.stringify({ error: `Insufficient balance. Need ₹${price}, have ₹${profile.wallet_balance}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: celebrity } = await supabase.from('celebrities').select('name, category').eq('id', celebrityId).single();
    if (!celebrity) return new Response(JSON.stringify({ error: 'Celebrity not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: generation, error: createError } = await supabase
      .from('image_promotions')
      .insert({ user_id: profile.id, celebrity_id: celebrityId, concept, branding_details: brandingDetails, price_paid: price, status: 'pending' })
      .select().single();

    if (createError) throw new Error(`DB insert failed: ${createError.message}`);

    let imagePrompt = `Create a professional promotional image featuring ${celebrity.name} (${celebrity.category}).\nConcept: ${concept}`;
    if (brandingDetails) imagePrompt += `\nBranding: ${brandingDetails}`;
    imagePrompt += `\nStyle: High-quality professional marketing image, vibrant colors, modern design.`;

    console.log('Generating image via OpenRouter Image API...');
    let rawImageUrl: string | null = null;
    const lastErrors: string[] = [];
    const imageModels = ['google/gemini-2.5-flash-image', 'google/gemini-2.5-flash-image-preview'];
    const hasReference = Boolean(referenceImageUrl && referenceImageSource !== 'none');

    if (OPENROUTER_API_KEY) {
      for (const model of imageModels) {
        const imageBody: Record<string, unknown> = {
          model,
          prompt: imagePrompt,
          aspect_ratio: '1:1',
        };
        if (hasReference) {
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
        const imageMessages = hasReference
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
      await supabase.from('image_promotions').update({
        status: 'failed',
        error_message: lastErrors.join('; ') || 'No image returned',
        completed_at: new Date().toISOString(),
      }).eq('id', generation.id);
      throw new Error(lastErrors.length
        ? `Image generation failed (${lastErrors.join('; ')})`
        : 'No image generated');
    }

    let finalImageUrl = rawImageUrl;
    if (rawImageUrl.startsWith('data:')) {
      const storageUrl = await uploadBase64ToStorage(supabase, rawImageUrl, profile.id, generation.id);
      if (storageUrl) finalImageUrl = storageUrl;
    }

    const dbUrl = finalImageUrl.startsWith('data:') ? 'base64-returned-to-client' : finalImageUrl;
    await supabase.from('image_promotions').update({ generated_image_url: dbUrl, status: 'completed', completed_at: new Date().toISOString() }).eq('id', generation.id);

    await supabase.from('wallet_transactions').insert({
      user_id: profile.id, amount: price, transaction_type: 'image_promotion', status: 'completed',
      description: `AI Image Promotion - ${celebrity.name}`
    });

    console.log('Image promotion generated successfully');

    return new Response(JSON.stringify({
      success: true,
      generation: { ...generation, generated_image_url: finalImageUrl, status: 'completed' }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
