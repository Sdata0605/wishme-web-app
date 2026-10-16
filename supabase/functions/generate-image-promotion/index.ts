import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

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

/** Largest reference photo we send to the model, in bytes. Bigger ones are skipped, not shrunk. */
const MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
/** Most real photos of the celebrity passed to the model. */
const MAX_CELEBRITY_PHOTOS = 4;

/**
 * A readable link for a stored photo. Storage URLs are turned into short-lived signed ones, so this
 * keeps working if the bucket is ever made private; anything else is returned unchanged.
 */
async function readableUrl(supabase: any, url: string): Promise<string> {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
  if (!match) return url;
  try {
    const { data } = await supabase.storage.from(match[1]).createSignedUrl(decodeURIComponent(match[2]), 600);
    return data?.signedUrl ?? url;
  } catch {
    return url;
  }
}

/** Downloads a photo and returns it as a data URL, or null if it cannot be fetched or is too big. */
async function photoAsDataUrl(supabase: any, url: string): Promise<string | null> {
  try {
    const res = await fetch(await readableUrl(supabase, url));
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_REFERENCE_BYTES) return null;
    return `data:${type.split(';')[0]};base64,${encodeBase64(bytes)}`;
  } catch {
    return null;
  }
}

/**
 * Real photos of the celebrity, best first: their profile photo, then the promo photos they uploaded on their
 * dashboard (newest first: these are the ones they chose to show how they look), then the face photo they
 * recorded consent with, then their promotional image. These are what make the generated person actually look
 * like them.
 */
async function celebrityPhotos(supabase: any, celebrityId: string, celeb: Record<string, any>): Promise<string[]> {
  const urls: string[] = [];
  const add = (u: unknown) => { if (typeof u === 'string' && u.trim() && !urls.includes(u.trim())) urls.push(u.trim()); };
  add(celeb.image_url);
  try {
    const { data: media } = await supabase
      .from('celebrity_media')
      .select('file_url, media_type')
      .eq('celebrity_id', celebrityId)
      .in('media_type', ['photo', 'image'])
      .order('created_at', { ascending: false })
      .limit(6);
    for (const m of media ?? []) add(m.file_url);
  } catch (e) {
    console.error('celebrity_media lookup failed:', e);
  }
  add(celeb.consent_photo_url);
  add(celeb.promotional_image_url);

  const photos: string[] = [];
  for (const url of urls) {
    if (photos.length >= MAX_CELEBRITY_PHOTOS) break;
    const dataUrl = await photoAsDataUrl(supabase, url);
    if (dataUrl) photos.push(dataUrl);
  }
  return photos;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Tries per model for a busy or empty answer, and the point after which we stop trying. */
const TRIES_PER_MODEL = 3;
const GENERATION_BUDGET_MS = 110_000;

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

    const { data: profile } = await supabase.from('profiles').select('id, wallet_balance, plan').eq('user_id', user.id).single();
    if (!profile) return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: celebrity } = await supabase
      .from('celebrities')
      .select('name, category, image_url, consent_photo_url, promotional_image_url, service_prices')
      .eq('id', celebrityId)
      .single();
    if (!celebrity) return new Response(JSON.stringify({ error: 'Celebrity not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // The price the admin set on this celebrity wins; the platform-wide price is only the fallback.
    const celebrityPrice = Number(celebrity.service_prices?.image_promotion);
    let basePrice = celebrityPrice > 0 ? celebrityPrice : 0;
    if (basePrice <= 0) {
      const { data: pricingData } = await supabase.from('platform_settings').select('setting_value').eq('setting_key', 'image_promotion_price').maybeSingle();
      basePrice = pricingData ? parseInt(pricingData.setting_value) || 25 : 25;
    }
    // The buyer's plan discount, applied here so the charge never depends on what the phone claims.
    const { data: plan } = await supabase.from('plans').select('service_discount_percentage').eq('name', String(profile.plan ?? '')).maybeSingle();
    const discountPct = Number(plan?.service_discount_percentage ?? 0) || 0;
    const price = Math.round(basePrice * (1 - discountPct / 100));

    if ((profile.wallet_balance ?? 0) < price) {
      return new Response(JSON.stringify({ error: `Insufficient balance. Need ₹${price}, have ₹${profile.wallet_balance}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: generation, error: createError } = await supabase
      .from('image_promotions')
      .insert({ user_id: profile.id, celebrity_id: celebrityId, concept, branding_details: brandingDetails, price_paid: price, status: 'pending' })
      .select().single();

    if (createError) throw new Error(`DB insert failed: ${createError.message}`);

    const photos = await celebrityPhotos(supabase, celebrityId, celebrity);
    console.log(`Using ${photos.length} reference photo(s) of ${celebrity.name}`);

    let imagePrompt = `Create a professional promotional image featuring ${celebrity.name} (${celebrity.category}).\nConcept: ${concept}`;
    if (brandingDetails) imagePrompt += `\nBranding: ${brandingDetails}`;
    imagePrompt += `\nStyle: High-quality professional marketing image, vibrant colors, modern design.`;
    if (photos.length > 0) {
      imagePrompt += `\n\nIMPORTANT: The attached photo(s) show the real ${celebrity.name}. The person in the image MUST be this exact person: keep their real face, facial features, skin tone, hair and age recognisable and true to the photo(s). Do not invent, replace or alter the person, and do not use a lookalike. Only change the setting, clothing, lighting and layout to fit the concept.`;
    }

    console.log('Generating image via OpenRouter Image API...');
    let rawImageUrl: string | null = null;
    const lastErrors: string[] = [];
    const imageModels = ['google/gemini-2.5-flash-image', 'google/gemini-2.5-flash-image-preview'];
    const hasUserReference = Boolean(referenceImageUrl && referenceImageSource !== 'none');
    // The celebrity's real photos come first, then the picture the user attached (a product, a style).
    const references: string[] = [...photos, ...(hasUserReference ? [referenceImageUrl as string] : [])];
    const deadline = Date.now() + GENERATION_BUDGET_MS;

    if (OPENROUTER_API_KEY) {
      for (const model of imageModels) {
        // A busy model (429 / 5xx) or an empty answer is retried before moving to the next model.
        for (let attempt = 1; attempt <= TRIES_PER_MODEL && !rawImageUrl && Date.now() < deadline; attempt++) {
          if (attempt > 1) await sleep(1000 * (attempt - 1));
          const imageBody: Record<string, unknown> = {
            model,
            prompt: imagePrompt,
            aspect_ratio: '1:1',
          };
          if (references.length > 0) {
            imageBody.input_references = references.map((url) => ({ type: 'image_url', image_url: { url } }));
          }
          let imageResponse: Response;
          try {
            imageResponse = await fetch('https://openrouter.ai/api/v1/images', {
              method: 'POST',
              headers: aiHeaders,
              body: JSON.stringify(imageBody),
            });
          } catch (e) {
            lastErrors.push(`Image API ${model} network error`);
            continue;
          }
          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            const msg = `Image API ${model} ${imageResponse.status}`;
            console.error(msg, `(try ${attempt})`, errorText.substring(0, 400));
            lastErrors.push(msg);
            // Rate limits and server errors are worth another try; a rejected request is not.
            if (imageResponse.status === 429 || imageResponse.status >= 500) continue;
            break;
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
            console.log('Image generated with Image API', model, `(try ${attempt})`);
            break;
          }
          lastErrors.push(`Image API ${model} returned no image`);
        }
        if (rawImageUrl) break;
      }

      if (!rawImageUrl) {
        console.log('Falling back to OpenRouter chat image models');
        const imageMessages = references.length > 0
          ? [{ role: 'user', content: [
              { type: 'text', text: imagePrompt },
              ...references.map((url) => ({ type: 'image_url', image_url: { url } })),
            ]}]
          : [{ role: 'user', content: imagePrompt }];
        for (const model of imageModels) {
          for (let attempt = 1; attempt <= TRIES_PER_MODEL && !rawImageUrl && Date.now() < deadline; attempt++) {
            if (attempt > 1) await sleep(1000 * (attempt - 1));
            let imageResponse: Response;
            try {
              imageResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: aiHeaders,
                body: JSON.stringify({ model, messages: imageMessages, modalities: ['image', 'text'] }),
              });
            } catch (e) {
              lastErrors.push(`Chat image ${model} network error`);
              continue;
            }
            if (!imageResponse.ok) {
              const errorText = await imageResponse.text();
              const msg = `Chat image ${model} ${imageResponse.status}`;
              console.error(msg, `(try ${attempt})`, errorText.substring(0, 400));
              lastErrors.push(msg);
              if (imageResponse.status === 429 || imageResponse.status >= 500) continue;
              break;
            }
            const imageData = await imageResponse.json();
            const message = imageData?.choices?.[0]?.message;
            const fromImages = message?.images?.[0]?.image_url?.url || message?.images?.[0]?.url;
            if (typeof fromImages === 'string' && fromImages) {
              rawImageUrl = fromImages;
            }
            if (rawImageUrl) {
              console.log('Image generated with chat model', model, `(try ${attempt})`);
              break;
            }
            lastErrors.push(`Chat image ${model} returned no image`);
          }
          if (rawImageUrl) break;
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

    // Pay the celebrity their share (commission % set by the admin, minus TDS). A failure here must not
    // lose the user's image, so it is logged and the order is flagged for the admin instead.
    const { data: credited, error: creditError } = await supabase.rpc('credit_celebrity_for_order', {
      p_celebrity_id: celebrityId,
      p_order_id: generation.id,
      p_order_type: 'image_promotion',
      p_amount: price,
      p_description: `Commission from image promotion #${String(generation.id).substring(0, 8)}`,
    });
    if (creditError) {
      console.error('Celebrity credit failed:', creditError.message);
      await supabase.from('image_promotions').update({ error_message: `celebrity credit failed: ${creditError.message}` }).eq('id', generation.id);
    } else {
      console.log('Celebrity credited (net after TDS):', credited);
    }

    console.log('Image promotion generated successfully');

    return new Response(JSON.stringify({
      success: true,
      generation: { ...generation, price_paid: price, generated_image_url: finalImageUrl, status: 'completed' }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
