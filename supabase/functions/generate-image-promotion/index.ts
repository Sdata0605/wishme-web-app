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

    const LOVABLE_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing env vars');

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

    const messages: any[] = [{ role: "user", content: imagePrompt }];
    if (referenceImageUrl && referenceImageSource !== 'none') {
      messages[0].content = [
        { type: "text", text: imagePrompt },
        { type: "image_url", image_url: { url: referenceImageUrl } }
      ];
    }

    const imageResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash-image-preview', messages, modalities: ['image', 'text'] }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      await supabase.from('image_promotions').update({ status: 'failed', error_message: errorText, completed_at: new Date().toISOString() }).eq('id', generation.id);
      throw new Error(`Image generation failed: ${errorText.substring(0, 200)}`);
    }

    const imageData = await imageResponse.json();
    const rawImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!rawImageUrl) {
      await supabase.from('image_promotions').update({ status: 'failed', error_message: 'No image returned', completed_at: new Date().toISOString() }).eq('id', generation.id);
      throw new Error('No image generated');
    }

    // Upload to storage if base64
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
