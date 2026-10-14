import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encodeBase64, decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function elevenLabsMessage(status: number, errorText: string): string {
  try {
    const parsed = JSON.parse(errorText);
    const detail = parsed?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (detail?.message) return String(detail.message);
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    if (parsed?.message) return String(parsed.message);
  } catch {
    /* raw */
  }
  const trimmed = errorText.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, 400) : `ElevenLabs error ${status}`;
}

async function composeMusic(apiKey: string, prompt: string, durationMs: number, instrumental: boolean): Promise<Uint8Array> {
  const response = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      music_length_ms: durationMs,
      force_instrumental: instrumental,
      model_id: "music_v1",
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(elevenLabsMessage(response.status, errorText));
  }
  return new Uint8Array(await response.arrayBuffer());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenlabsApiKey) throw new Error("ElevenLabs API key not configured");

    const {
      imageBase64,
      musicDescription,
      lyrics,
      genre,
      mood,
      durationSeconds,
      uploadedAudioBase64,
    } = await req.json();

    const hasVocals = !!(lyrics && String(lyrics).trim());
    const durationMs = Math.min(60000, Math.max(10000, (Number(durationSeconds) || 30) * 1000));

    let audioBytes: Uint8Array;

    if (uploadedAudioBase64) {
      const raw = uploadedAudioBase64.includes(",") ? uploadedAudioBase64.split(",")[1] : uploadedAudioBase64;
      audioBytes = decodeBase64(raw);
    } else {
      let prompt = `A ${mood || "calm"} ${genre || "ambient"} ${hasVocals ? "song with vocals" : "instrumental track"}`;
      if (musicDescription?.trim()) prompt += `. ${String(musicDescription).slice(0, 250)}`;
      if (hasVocals) prompt += `. Sing these lyrics: ${String(lyrics).slice(0, 400)}`;
      prompt = prompt.slice(0, 4000);
      audioBytes = await composeMusic(elevenlabsApiKey, prompt, durationMs, !hasVocals);
    }

    const audioBase64 = encodeBase64(audioBytes);
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    let b2Url: string | null = null;
    try {
      const B2_KEY_ID = Deno.env.get("B2_KEY_ID");
      const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY");
      if (B2_KEY_ID && B2_APP_KEY) {
        const aws = new AwsClient({ accessKeyId: B2_KEY_ID, secretAccessKey: B2_APP_KEY, region: "us-east-005" });
        const fileKey = `audio/image-music/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
        const uploadUrl = `https://s3.us-east-005.backblazeb2.com/wishmetoday/${fileKey}`;
        const uploadRes = await aws.fetch(uploadUrl, {
          method: "PUT",
          body: audioBytes,
          headers: { "Content-Type": "audio/mpeg", "x-amz-acl": "public-read" },
        });
        if (uploadRes.ok) {
          b2Url = `https://f005.backblazeb2.com/file/wishmetoday/${fileKey}`;
        }
      }
    } catch (e) {
      console.error("B2 upload error (non-fatal):", e);
    }

    return new Response(JSON.stringify({
      success: true,
      audioUrl,
      b2Url,
      imageBase64: imageBase64 || null,
      message: hasVocals ? "Your song with vocals is ready!" : "Your instrumental music is ready!",
      duration: Math.round(durationMs / 1000),
      hasVocals,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error creating image music:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to create music for image" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
