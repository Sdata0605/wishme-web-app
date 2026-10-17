// Makes the signature card for a Video Wish order: a greeting card from the celebrity to the customer's friend,
// with the celebrity's real face (from their photos) and their name signed by hand at the bottom.
//
// Admin only. The admin can make it again with extra instructions until they are happy with it; the card is
// saved on the order and delivered to the customer together with the video.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { openRouterHeaders, openRouterText } from "../_shared/openrouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Largest reference photo sent to the model, in bytes. Bigger ones are skipped, not shrunk. */
const MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
/** Most real photos of the celebrity passed to the model. */
const MAX_CELEBRITY_PHOTOS = 4;
/** The message printed on the card is kept short: image models misspell long text. */
const MAX_CARD_MESSAGE = 150;
const IMAGE_MODELS = ["google/gemini-2.5-flash-image", "google/gemini-2.5-flash-image-preview"];
const TRIES_PER_MODEL = 2;
const GENERATION_BUDGET_MS = 110_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A readable link for a stored photo (storage URLs become short-lived signed ones). */
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

async function photoAsDataUrl(supabase: any, url: string): Promise<string | null> {
  try {
    const res = await fetch(await readableUrl(supabase, url));
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_REFERENCE_BYTES) return null;
    return `data:${type.split(";")[0]};base64,${encodeBase64(bytes)}`;
  } catch {
    return null;
  }
}

/** Real photos of the celebrity, best first: profile photo, the photos they uploaded, consent photo, promo image. */
async function celebrityPhotos(supabase: any, celeb: Record<string, any>): Promise<string[]> {
  const urls: string[] = [];
  const add = (u: unknown) => { if (typeof u === "string" && u.trim() && !urls.includes(u.trim())) urls.push(u.trim()); };
  add(celeb.image_url);
  try {
    const { data: media } = await supabase
      .from("celebrity_media")
      .select("file_url, media_type")
      .eq("celebrity_id", celeb.id)
      .in("media_type", ["photo", "image"])
      .order("created_at", { ascending: false })
      .limit(6);
    for (const m of media ?? []) add(m.file_url);
  } catch (e) {
    console.error("celebrity_media lookup failed:", e);
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

function imageFromImagesApi(data: any): string | null {
  const item = data?.data?.[0];
  if (typeof item?.url === "string" && item.url) return item.url;
  if (typeof item?.b64_json === "string" && item.b64_json) {
    const media = typeof item.media_type === "string" && item.media_type.startsWith("image/") ? item.media_type : "image/png";
    return `data:${media};base64,${item.b64_json}`;
  }
  return null;
}

function imageFromChat(data: any): string | null {
  const message = data?.choices?.[0]?.message;
  const fromImages = message?.images?.[0]?.image_url?.url || message?.images?.[0]?.url;
  if (typeof fromImages === "string" && fromImages) return fromImages;
  const content = message?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const url = part?.image_url?.url;
      if (typeof url === "string" && url) return url;
    }
  }
  return null;
}

function imageFromGemini(data: any): string | null {
  for (const part of data?.candidates?.[0]?.content?.parts ?? []) {
    const inline = part?.inlineData || part?.inline_data;
    if (typeof inline?.data === "string" && inline.data) {
      return `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`;
    }
  }
  return null;
}

/** Tries the OpenRouter image API, then OpenRouter chat image models, then Gemini directly. */
async function generateImage(prompt: string, references: string[]): Promise<{ image: string | null; errors: string[] }> {
  const errors: string[] = [];
  const deadline = Date.now() + GENERATION_BUDGET_MS;
  let headers: Record<string, string> | null = null;
  try { headers = openRouterHeaders(); } catch { /* no OpenRouter key: go straight to Gemini */ }

  if (headers) {
    for (const model of IMAGE_MODELS) {
      for (let attempt = 1; attempt <= TRIES_PER_MODEL && Date.now() < deadline; attempt++) {
        if (attempt > 1) await sleep(1000 * (attempt - 1));
        const body: Record<string, unknown> = { model, prompt, aspect_ratio: "3:4" };
        if (references.length) body.input_references = references.map((url) => ({ type: "image_url", image_url: { url } }));
        try {
          const res = await fetch("https://openrouter.ai/api/v1/images", { method: "POST", headers, body: JSON.stringify(body) });
          if (!res.ok) {
            errors.push(`Image API ${model} ${res.status}`);
            console.error(errors.at(-1), (await res.text()).slice(0, 300));
            if (res.status === 429 || res.status >= 500) continue;
            break;
          }
          const image = imageFromImagesApi(await res.json());
          if (image) return { image, errors };
          errors.push(`Image API ${model} returned no image`);
        } catch {
          errors.push(`Image API ${model} network error`);
        }
      }
    }

    const content = references.length
      ? [{ type: "text", text: prompt }, ...references.map((url) => ({ type: "image_url", image_url: { url } }))]
      : prompt;
    for (const model of IMAGE_MODELS) {
      for (let attempt = 1; attempt <= TRIES_PER_MODEL && Date.now() < deadline; attempt++) {
        if (attempt > 1) await sleep(1000 * (attempt - 1));
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers,
            body: JSON.stringify({ model, messages: [{ role: "user", content }], modalities: ["image", "text"] }),
          });
          if (!res.ok) {
            errors.push(`Chat image ${model} ${res.status}`);
            console.error(errors.at(-1), (await res.text()).slice(0, 300));
            if (res.status === 429 || res.status >= 500) continue;
            break;
          }
          const image = imageFromChat(await res.json());
          if (image) return { image, errors };
          errors.push(`Chat image ${model} returned no image`);
        } catch {
          errors.push(`Chat image ${model} network error`);
        }
      }
    }
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (geminiKey && Date.now() < deadline) {
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    for (const ref of references) {
      const m = ref.match(/^data:([^;]+);base64,(.+)$/);
      if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
    }
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
        },
      );
      if (res.ok) {
        const image = imageFromGemini(await res.json());
        if (image) return { image, errors };
        errors.push("Gemini returned no image");
      } else {
        errors.push(`Gemini ${res.status}`);
        console.error(errors.at(-1), (await res.text()).slice(0, 300));
      }
    } catch {
      errors.push("Gemini network error");
    }
  }

  return { image: null, errors };
}

/** Stores the card in the public greeting-card bucket and returns its link. */
async function storeCard(supabase: any, image: string, orderId: string): Promise<string> {
  let bytes: Uint8Array;
  let contentType = "image/png";
  if (image.startsWith("data:")) {
    const comma = image.indexOf(",");
    const header = image.slice(0, comma);
    contentType = header.match(/^data:([^;]+)/)?.[1] ?? "image/png";
    bytes = Uint8Array.from(atob(image.slice(comma + 1)), (c) => c.charCodeAt(0));
  } else {
    const res = await fetch(image);
    if (!res.ok) throw new Error(`Could not download the generated card (${res.status})`);
    contentType = res.headers.get("content-type")?.split(";")[0] || "image/png";
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
  const path = `wish-friend-cards/${orderId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("greeting-card-uploads").upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(`Could not save the card: ${error.message}`);
  return supabase.storage.from("greeting-card-uploads").getPublicUrl(path).data.publicUrl;
}

/** The short message on the card, written as the celebrity speaking to the friend. */
async function writeMessage(order: Record<string, any>, celebName: string): Promise<string> {
  const fallback = `Wishing you a wonderful ${order.occasion}, ${order.recipient_name}! Have the best day.`;
  try {
    const text = await openRouterText(
      `Write the message for a greeting card that ${celebName} is sending to ${order.recipient_name} for their ${order.occasion}.
${order.relationship ? `The person who ordered it is ${order.recipient_name}'s ${order.relationship}.` : ""}
${order.tone ? `Tone: ${order.tone}.` : ""}
What the customer asked for: ${String(order.prompt ?? "").slice(0, 600)}

Rules: speak as ${celebName}, directly to ${order.recipient_name}. One or two short, warm sentences, at most ${MAX_CARD_MESSAGE} characters.
No hashtags, no emojis, no quotation marks, no sign-off or signature (the card is signed separately). Reply with the message only.`,
      { maxTokens: 120, temperature: 0.8 },
    );
    const clean = text.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\s+/g, " ").trim();
    if (!clean) return fallback;
    return clean.length > MAX_CARD_MESSAGE ? clean.slice(0, MAX_CARD_MESSAGE).replace(/\s+\S*$/, "") + "." : clean;
  } catch (e) {
    console.error("Card message failed, using the default:", e);
    return fallback;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ success: false, error: "Not signed in" }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ success: false, error: "Not signed in" }, 401);
    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
    ]);
    if (profile?.role !== "admin" && !roleRow) return json({ success: false, error: "Only admins can make cards" }, 403);

    const { orderId, instructions, message } = await req.json();
    if (!orderId) return json({ success: false, error: "orderId is required" }, 400);

    const { data: order, error: orderError } = await supabase
      .from("wish_friend_orders")
      .select("*, celebrities:celebrity_id (id, name, category, image_url, consent_photo_url, promotional_image_url)")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return json({ success: false, error: "Order not found" }, 404);
    if (order.status === "rejected") return json({ success: false, error: "This order was rejected" }, 400);

    const celeb = order.celebrities ?? {};
    const celebName: string = celeb.name || "Your favourite star";

    // The admin may have edited the message; otherwise write one.
    const cardMessage = typeof message === "string" && message.trim()
      ? message.trim().slice(0, MAX_CARD_MESSAGE)
      : await writeMessage(order, celebName);

    const photos = celeb.id ? await celebrityPhotos(supabase, celeb) : [];
    console.log(`Card for order ${orderId}: ${photos.length} photo(s) of ${celebName}`);

    let prompt = `Design a premium portrait greeting card (3:4) that looks like a personally signed photo card from ${celebName}.

Layout:
- A large, flattering photo of ${celebName}, warm and smiling, in a setting that suits a ${order.occasion} celebration.
- Headline in elegant lettering: "Happy ${order.occasion}, ${order.recipient_name}!"
- Under it, in a clean readable font, this message exactly as written: "${cardMessage}"
- Bottom right: ${celebName}'s autograph, handwritten in flowing dark ink like a real pen signature on a signed photo, reading "${celebName}".
- Tiny text at the very bottom: "WishMe".

Style: festive ${order.occasion} theme${order.tone ? `, ${order.tone} mood` : ""}, high-end print quality, soft lighting, tasteful colours, generous margins. Spell every word exactly as given and add no other text.`;
    if (photos.length) {
      prompt += `\n\nIMPORTANT: The attached photo(s) show the real ${celebName}. The person on the card MUST be this exact person: keep their real face, features, skin tone, hair and age recognisable. Do not use a lookalike. Only change the clothing, setting and lighting.`;
    }
    if (typeof instructions === "string" && instructions.trim()) {
      prompt += `\n\nExtra instructions from our designer: ${instructions.trim().slice(0, 500)}`;
    }

    const { image, errors } = await generateImage(prompt, photos);
    if (!image) {
      return json({ success: false, error: `The card could not be made (${errors.join("; ") || "no image returned"}). Try again.` }, 502);
    }

    const cardUrl = await storeCard(supabase, image, orderId);
    const { error: updateError } = await supabase
      .from("wish_friend_orders")
      .update({ card_url: cardUrl, card_text: cardMessage, card_source: "ai", card_updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (updateError) throw new Error(`Card made but not saved on the order: ${updateError.message}`);

    return json({ success: true, card_url: cardUrl, card_text: cardMessage, photos_used: photos.length });
  } catch (error) {
    console.error("generate-wish-friend-card:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Something went wrong" }, 500);
  }
});
