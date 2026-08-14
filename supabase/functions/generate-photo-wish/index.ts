import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function uploadBase64ToStorage(supabase: any, base64Url: string, userId: string, wishId: string): Promise<string | null> {
  try {
    const base64Data = base64Url.split(',')[1];
    if (!base64Data) return null;
    
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const fileName = `photo-wishes/${userId}/${wishId}-${Date.now()}.png`;
    
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
    
    return publicUrl;
  } catch (e) {
    console.error('Upload helper error:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== generate-photo-wish started ===");

  try {
    const LOVABLE_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody = await req.json();
    const { originalImageBase64, occasion, recipientName, wishMessage, senderName, textStyle } = requestBody;

    if (!originalImageBase64 || !occasion || !recipientName || !wishMessage) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pricing
    const { data: pricingSetting } = await supabase
      .from("platform_settings").select("setting_value").eq("setting_key", "photo_wish_price").single();
    const price = pricingSetting ? parseFloat(pricingSetting.setting_value) : 99;

    const { data: profile } = await supabase
      .from("profiles").select("id, wallet_balance").eq("user_id", user.id).maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((profile.wallet_balance || 0) < price) {
      return new Response(JSON.stringify({ error: "Insufficient wallet balance", currentBalance: profile.wallet_balance, required: price }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleInstructions: Record<string, string> = {
      elegant: "Elegant cursive fonts with gold accents and floral decorations.",
      playful: "Fun bouncy fonts with bright colors, confetti, and balloons.",
      modern: "Clean sans-serif fonts with gradient colors and geometric elements.",
      classic: "Traditional serif fonts with classic borders and ribbons.",
      festive: "Celebratory fonts with glitter, sparkles, and lights.",
    };

    const prompt = `Add a beautiful wish text overlay to this photo.
KEEP EXACT DIMENSIONS. PRESERVE FULL PHOTO. Only ADD text on top.
Text: Occasion: ${occasion}. Recipient: "${recipientName}". Message: "${wishMessage}". ${senderName ? `From: "${senderName}"` : ""}
Style: ${textStyle}. ${styleInstructions[textStyle] || styleInstructions.elegant}
Place text in empty areas, never cover faces. Use semi-transparent banners for readability.`;

    console.log("Calling AI for image editing...");

    async function callAI(promptText: string): Promise<string | null> {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: originalImageBase64 } },
          ]}],
          modalities: ["image", "text"],
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("AI error:", resp.status, errorText);
        if (resp.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
        if (resp.status === 402) throw new Error("AI credits exhausted. Please try again later.");
        throw new Error(`AI Gateway error: ${resp.status}`);
      }

      const aiResp = await resp.json();
      console.log("AI response keys:", JSON.stringify(Object.keys(aiResp)));
      console.log("Choices structure:", JSON.stringify(aiResp.choices?.[0]?.message ?
        { hasImages: !!aiResp.choices[0].message.images, contentType: typeof aiResp.choices[0].message.content, contentPreview: typeof aiResp.choices[0].message.content === 'string' ? aiResp.choices[0].message.content.substring(0, 80) : 'N/A' } : 'no choices'));

      // Primary path
      let url = aiResp.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      // Fallback: content may be base64
      if (!url) {
        const content = aiResp.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.startsWith('data:image')) {
          url = content;
        }
      }
      return url || null;
    }

    // First attempt
    let rawEditedUrl = await callAI(prompt);

    // Retry once with simplified prompt
    if (!rawEditedUrl) {
      console.log("First attempt did not produce image, retrying with simplified prompt...");
      const retryPrompt = `Add text overlay to this photo. Text: "${wishMessage}" for ${recipientName}. Occasion: ${occasion}. ${senderName ? `From: ${senderName}.` : ""} Use ${textStyle || "elegant"} style. Keep original image intact, only add text.`;
      rawEditedUrl = await callAI(retryPrompt);
    }

    if (!rawEditedUrl) {
      throw new Error("AI did not generate an image after retry");
    }

    console.log("Image generated, creating record...");

    // Create record FIRST with placeholder, then upload and update
    const { data: photoWish, error: insertError } = await supabase
      .from("photo_wishes")
      .insert({
        user_id: profile.id,
        original_image_url: "uploaded",
        edited_image_url: "processing",
        occasion, recipient_name: recipientName, wish_message: wishMessage,
        sender_name: senderName, text_style: textStyle || "elegant",
        amount_charged: price, status: "completed", completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save record");
    }

    // Upload to storage
    let finalEditedUrl = rawEditedUrl;
    if (rawEditedUrl.startsWith('data:')) {
      const storageUrl = await uploadBase64ToStorage(supabase, rawEditedUrl, profile.id, photoWish.id);
      if (storageUrl) {
        finalEditedUrl = storageUrl;
        await supabase.from("photo_wishes").update({ edited_image_url: storageUrl }).eq("id", photoWish.id);
      } else {
        // Store truncated marker in DB, return base64 to client
        await supabase.from("photo_wishes").update({ edited_image_url: "base64-returned-to-client" }).eq("id", photoWish.id);
      }
    } else {
      await supabase.from("photo_wishes").update({ edited_image_url: finalEditedUrl }).eq("id", photoWish.id);
    }

    // Wallet deduction
    await supabase.from("profiles").update({ wallet_balance: (profile.wallet_balance || 0) - price }).eq("id", profile.id);
    await supabase.from("wallet_transactions").insert({
      user_id: profile.id, amount: -price, transaction_type: "photo_wish",
      description: `Photo Wish - ${occasion} for ${recipientName}`, status: "completed",
    });

    console.log("Photo wish completed successfully");

    // Fire notification: photo_wish_completed
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-wishme-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'apikey': SUPABASE_SERVICE_ROLE_KEY },
        body: JSON.stringify({
          event_key: 'photo_wish_completed',
          recipient_type: 'user',
          recipient_id: profile.id,
          data: { first_name: 'User', occasion, payment_id: photoWish.id }
        })
      });
    } catch (e) { console.warn('Notification error:', e); }

    return new Response(JSON.stringify({
      success: true, photoWishId: photoWish.id, editedImageUrl: finalEditedUrl, amountCharged: price,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Photo wish error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
