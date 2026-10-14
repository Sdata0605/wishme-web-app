import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractChatImageUrl(imageData: any): string | null {
  const message = imageData?.choices?.[0]?.message;
  const fromImages = message?.images?.[0]?.image_url?.url
    || message?.images?.[0]?.url;
  if (typeof fromImages === 'string' && fromImages.length > 0) return fromImages;

  const content = message?.content;
  if (typeof content === 'string' && (content.startsWith('data:image') || content.startsWith('http'))) {
    return content;
  }
  if (Array.isArray(content)) {
    for (const part of content) {
      const url = part?.image_url?.url || part?.inline_data?.data;
      if (typeof url === 'string' && url.length > 0) {
        return url.startsWith('http') || url.startsWith('data:')
          ? url
          : `data:image/png;base64,${url}`;
      }
    }
  }
  return null;
}

function extractImagesApiUrl(imageData: any): string | null {
  const item = imageData?.data?.[0];
  if (!item) return null;
  if (typeof item.url === 'string' && item.url.length > 0) return item.url;
  if (typeof item.b64_json === 'string' && item.b64_json.length > 0) {
    const media = typeof item.media_type === 'string' && item.media_type.startsWith('image/')
      ? item.media_type
      : 'image/png';
    return `data:${media};base64,${item.b64_json}`;
  }
  return null;
}

function extractGeminiNativeUrl(geminiData: any): string | null {
  const parts = geminiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data;
    const data = inline?.data;
    const mime = inline?.mimeType || inline?.mime_type || 'image/png';
    if (typeof data === 'string' && data.length > 0) {
      return `data:${mime};base64,${data}`;
    }
  }
  return null;
}

async function uploadCardImage(
  supabase: any,
  generatedImage: string,
  orderId: string,
): Promise<string> {
  if (generatedImage.startsWith('http://') || generatedImage.startsWith('https://')) {
    return generatedImage;
  }
  if (!generatedImage.startsWith('data:')) {
    throw new Error('Unsupported image payload from the image model');
  }

  const comma = generatedImage.indexOf(',');
  const header = generatedImage.slice(0, Math.max(comma, 0));
  const base64Data = comma >= 0 ? generatedImage.slice(comma + 1) : '';
  if (!base64Data) throw new Error('Image payload was empty');

  const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const ext = header.includes('image/jpeg') || header.includes('image/jpg')
    ? 'jpg'
    : header.includes('image/webp')
      ? 'webp'
      : 'png';
  const contentType = ext === 'jpg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
  const fileName = `ai-cards/${orderId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('greeting-card-uploads')
    .upload(fileName, buffer, { contentType, upsert: false });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error(`Failed to store greeting card: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from('greeting-card-uploads').getPublicUrl(fileName);
  if (!publicUrl) throw new Error('Failed to create a public URL for the greeting card');
  console.log('Card uploaded to storage');
  return publicUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    console.log('=== Generate Wish Celebrity Card ===', orderId);

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!OPENROUTER_API_KEY && !LOVABLE_API_KEY && !GEMINI_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: order, error: fetchError } = await supabase
      .from('wish_celebrity_orders')
      .select('*, celebrities (id, name, profile_id, image_url)')
      .eq('id', orderId).single();

    if (fetchError || !order) throw new Error('Failed to fetch order');

    const { message, recipient_name: recipientName, occasion_type: occasionType, card_prompt } = order;
    const celebrityName = order.celebrities?.name || 'Celebrity';
    const celebrityImageUrl = order.celebrities?.image_url;

    if (!message || message.length > 1000) throw new Error('Message must be 1-1000 characters');
    if (!recipientName || recipientName.length > 100) throw new Error('Recipient name must be 1-100 characters');

    const profanityList = ['fuck','shit','bitch','asshole','bastard','cunt','dick','pussy','cock','whore','slut','nigger','nigga','fag','faggot','retard','rape','kill','murder'];
    const checkText = `${message} ${recipientName} ${card_prompt || ''}`.toLowerCase();
    const found = profanityList.find(w => new RegExp(`\\b${w}\\b`, 'i').test(checkText));
    if (found) throw new Error('Your message contains inappropriate content. Please revise.');

    const textPrompt = `Create a warm greeting from a fan to ${celebrityName} for ${occasionType}.
Fan's message: ${message}. Address ${celebrityName} by name. Express admiration. 2-3 sentences.
${card_prompt ? `Style: ${card_prompt}` : ''}`;

    let greetingText = `Happy ${occasionType}, ${celebrityName}! ${message} From your fan, ${recipientName}.`;
    const textHeaders = {
      'Authorization': `Bearer ${OPENROUTER_API_KEY || LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wishme.app',
      'X-Title': 'Wish Me',
    };
    const textUrl = OPENROUTER_API_KEY
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://ai.gateway.lovable.dev/v1/chat/completions';

    if (OPENROUTER_API_KEY || LOVABLE_API_KEY) {
      const textResponse = await fetch(textUrl, {
        method: 'POST',
        headers: textHeaders,
        body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: textPrompt }] }),
      });
      if (textResponse.ok) {
        greetingText = (await textResponse.json()).choices[0].message.content;
        console.log('Greeting text generated');
      } else {
        const err = await textResponse.text();
        console.error('Text generation failed:', textResponse.status, err.substring(0, 300));
        if (textResponse.status === 429) throw new Error('Rate limit. Try again later.');
        if (textResponse.status === 402) throw new Error('AI credits exhausted.');
      }
    }

    const baseImagePrompt = `Create a greeting card for ${celebrityName}'s ${occasionType}.
Main text: "Happy ${occasionType}, ${celebrityName}!" prominently.
Bottom: "From your fan, ${recipientName}" in smaller text.
Style: Celebratory, festive, ${occasionType} theme. ${card_prompt || 'Elegant fan appreciation style'}.`;

    const imageModels = ['google/gemini-2.5-flash-image', 'google/gemini-2.5-flash-image-preview'];
    let generatedImage: string | null = null;
    const lastErrors: string[] = [];

    if (OPENROUTER_API_KEY) {
      console.log('Using OpenRouter Image API');
      for (const model of imageModels) {
        const imageBody: Record<string, unknown> = {
          model,
          prompt: celebrityImageUrl
            ? `${baseImagePrompt}\nIncorporate this photo of ${celebrityName} prominently. Use the provided reference photo.`
            : baseImagePrompt,
          aspect_ratio: '3:4',
        };
        if (celebrityImageUrl) {
          imageBody.input_references = [
            { type: 'image_url', image_url: { url: celebrityImageUrl } },
          ];
        }

        const imageResponse = await fetch('https://openrouter.ai/api/v1/images', {
          method: 'POST',
          headers: textHeaders,
          body: JSON.stringify(imageBody),
        });
        if (!imageResponse.ok) {
          const errBody = await imageResponse.text();
          const msg = `Image API ${model} ${imageResponse.status}`;
          console.error(msg, errBody.substring(0, 400));
          lastErrors.push(msg);
          continue;
        }
        generatedImage = extractImagesApiUrl(await imageResponse.json());
        if (generatedImage) {
          console.log('Image generated with Image API', model);
          break;
        }
        lastErrors.push(`Image API ${model} returned no image`);
      }

      if (!generatedImage) {
        console.log('Falling back to OpenRouter chat image models');
        const imageMessages = celebrityImageUrl
          ? [{ role: 'user', content: [
              { type: 'text', text: `${baseImagePrompt}\nIncorporate this photo of ${celebrityName} prominently. Use THIS exact photo.` },
              { type: 'image_url', image_url: { url: celebrityImageUrl } },
            ]}]
          : [{ role: 'user', content: baseImagePrompt }];

        for (const model of imageModels) {
          const imageResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: textHeaders,
            body: JSON.stringify({ model, messages: imageMessages, modalities: ['image', 'text'] }),
          });
          if (!imageResponse.ok) {
            const errBody = await imageResponse.text();
            const msg = `Chat image ${model} ${imageResponse.status}`;
            console.error(msg, errBody.substring(0, 400));
            lastErrors.push(msg);
            continue;
          }
          generatedImage = extractChatImageUrl(await imageResponse.json());
          if (generatedImage) {
            console.log('Image generated with chat model', model);
            break;
          }
          lastErrors.push(`Chat image ${model} returned no image`);
        }
      }
    }

    if (!generatedImage && GEMINI_API_KEY) {
      console.log('Falling back to Gemini native image API');
      const parts: Array<Record<string, unknown>> = [{ text: baseImagePrompt }];
      if (celebrityImageUrl) {
        try {
          const refResp = await fetch(celebrityImageUrl);
          if (refResp.ok) {
            const bytes = new Uint8Array(await refResp.arrayBuffer());
            let binary = '';
            for (const byte of bytes) binary += String.fromCharCode(byte);
            parts.push({
              inline_data: {
                mime_type: refResp.headers.get('content-type') || 'image/jpeg',
                data: btoa(binary),
              },
            });
          }
        } catch (e) {
          console.error('Failed to fetch celebrity reference image', e);
        }
      }
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
        },
      );
      if (geminiResponse.ok) {
        generatedImage = extractGeminiNativeUrl(await geminiResponse.json());
        if (generatedImage) console.log('Image generated with Gemini native API');
        else lastErrors.push('Gemini native API returned no image');
      } else {
        const errBody = await geminiResponse.text();
        const msg = `Gemini native ${geminiResponse.status}`;
        console.error(msg, errBody.substring(0, 400));
        lastErrors.push(msg);
      }
    }

    if (!generatedImage && LOVABLE_API_KEY) {
      console.log('Falling back to Lovable image gateway');
      const imageMessages = celebrityImageUrl
        ? [{ role: 'user', content: [
            { type: 'text', text: `${baseImagePrompt}\nIncorporate this photo of ${celebrityName} prominently. Use THIS exact photo.` },
            { type: 'image_url', image_url: { url: celebrityImageUrl } },
          ]}]
        : [{ role: 'user', content: baseImagePrompt }];
      const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: imageMessages,
          modalities: ['image', 'text'],
        }),
      });
      if (imageResponse.ok) {
        generatedImage = extractChatImageUrl(await imageResponse.json());
        if (generatedImage) console.log('Image generated with Lovable gateway');
        else lastErrors.push('Lovable gateway returned no image');
      } else {
        const errBody = await imageResponse.text();
        const msg = `Lovable image ${imageResponse.status}`;
        console.error(msg, errBody.substring(0, 400));
        lastErrors.push(msg);
      }
    }

    if (!generatedImage) {
      throw new Error(
        lastErrors.length
          ? `Greeting card image was not generated (${lastErrors.join('; ')})`
          : 'Greeting card image was not generated. Please try again.',
      );
    }

    const cardUrl = await uploadCardImage(supabase, generatedImage, orderId);

    const attempts = Math.min((order.generation_attempts || 0) + 1, 3);

    const { error: updateError } = await supabase.from('wish_celebrity_orders').update({
      greeting_text: greetingText,
      generated_card_image_url: cardUrl,
      card_url: cardUrl,
      generation_attempts: attempts,
      status: 'generated',
    }).eq('id', orderId);

    if (updateError) {
      console.error('Order update error:', updateError);
      throw new Error(`Failed to save greeting card: ${updateError.message}`);
    }

    console.log('=== Card Generation Complete ===', cardUrl);

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
