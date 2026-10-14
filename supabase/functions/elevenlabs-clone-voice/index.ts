import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function bytesStartWith(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false;
  return sig.every((b, i) => bytes[i] === b);
}

function detectAudioFormat(
  audioBase64: string,
  bytes: Uint8Array,
  mimeHint?: string,
  fileNameHint?: string,
): { mime: string; filename: string } {
  const dataUrlMatch = /^data:([^;,]+)/i.exec(audioBase64);
  const fromUrl = dataUrlMatch?.[1]?.split(";")[0]?.toLowerCase() || "";
  const fromHint = (mimeHint || "").split(";")[0].toLowerCase();
  const fromName = (fileNameHint || "").toLowerCase();

  let mime = fromHint || fromUrl;

  if (!mime || mime === "application/octet-stream") {
    if (bytesStartWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) mime = "audio/webm";
    else if (bytesStartWith(bytes, [0x4f, 0x67, 0x67, 0x53])) mime = "audio/ogg";
    else if (bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46])) mime = "audio/wav";
    else if (bytesStartWith(bytes, [0x66, 0x4c, 0x61, 0x43])) mime = "audio/flac";
    else if (bytes.length > 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      mime = "audio/mp4";
    } else if (fromName.endsWith(".webm")) mime = "audio/webm";
    else if (fromName.endsWith(".ogg")) mime = "audio/ogg";
    else if (fromName.endsWith(".wav")) mime = "audio/wav";
    else if (fromName.endsWith(".m4a") || fromName.endsWith(".mp4")) mime = "audio/mp4";
    else mime = "audio/mpeg";
  }

  const extByMime: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
    "audio/flac": "flac",
  };

  const ext = extByMime[mime] || (fromName.includes(".") ? fromName.split(".").pop()! : "webm");
  return { mime, filename: `voice_sample.${ext}` };
}

function elevenLabsMessage(status: number, errorText: string): string {
  try {
    const parsed = JSON.parse(errorText);
    const detail = parsed?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (detail?.message) return String(detail.message);
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    if (parsed?.message) return String(parsed.message);
  } catch {
    /* raw text */
  }
  const trimmed = errorText.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, 400) : `ElevenLabs error ${status}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenlabsApiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    const { audioBase64, voiceName, voiceDescription, mimeType, fileName } = await req.json();

    if (!audioBase64) {
      throw new Error("Audio sample is required for voice cloning");
    }

    if (!voiceName) {
      throw new Error("Voice name is required");
    }

    const base64Data = audioBase64.split(",")[1] || audioBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const format = detectAudioFormat(audioBase64, bytes, mimeType, fileName);
    console.log("Cloning voice with ElevenLabs:", {
      voiceName,
      mime: format.mime,
      filename: format.filename,
      bytes: bytes.length,
    });

    const formData = new FormData();
    formData.append("name", voiceName);
    if (voiceDescription) {
      formData.append("description", voiceDescription);
    }
    formData.append("files", new Blob([bytes], { type: format.mime }), format.filename);

    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": elevenlabsApiKey },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs voice cloning error:", response.status, errorText);
      throw new Error(elevenLabsMessage(response.status, errorText));
    }

    const result = await response.json();
    console.log("Voice cloned successfully:", result.voice_id);

    const { error: saveError } = await supabase
      .from("user_cloned_voices")
      .insert({
        user_id: profile.id,
        elevenlabs_voice_id: result.voice_id,
        voice_name: voiceName,
        voice_description: voiceDescription || null,
      });

    if (saveError) {
      console.error("Error saving cloned voice to database:", saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        voiceId: result.voice_id,
        voiceName: voiceName,
        message: "Voice cloned successfully! You can now use it for text-to-speech and music.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error cloning voice:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to clone voice",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
