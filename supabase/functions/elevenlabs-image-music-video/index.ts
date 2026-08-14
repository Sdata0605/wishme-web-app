import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) throw new Error('ElevenLabs API key not configured');

    const { imageBase64, musicDescription, lyrics, genre, mood, durationSeconds, uploadedAudioBase64 } = await req.json();
    if (!imageBase64) throw new Error('Image is required');

    console.log('Creating image + music video:', { genre, mood, durationSeconds, hasLyrics: !!lyrics, hasUploadedAudio: !!uploadedAudioBase64 });

    let audioBase64: string;

    if (uploadedAudioBase64) {
      console.log('Using user-uploaded audio');
      audioBase64 = uploadedAudioBase64.includes(',') ? uploadedAudioBase64.split(',')[1] : uploadedAudioBase64;
    } else if (lyrics && lyrics.trim()) {
      console.log('Generating song with vocals using ElevenLabs Music Compose');
      let musicPrompt = `A ${mood || 'happy'} ${genre || 'pop'} song`;
      if (musicDescription && musicDescription.trim()) musicPrompt += `. ${musicDescription.substring(0, 150)}`;
      musicPrompt += `. Sing these lyrics: ${lyrics.substring(0, 400)}`;
      if (musicPrompt.length > 500) musicPrompt = musicPrompt.substring(0, 497) + '...';

      const musicResponse = await fetch('https://api.elevenlabs.io/v1/music/compose', {
        method: 'POST',
        headers: { 'xi-api-key': elevenlabsApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: musicPrompt, music_length_ms: (durationSeconds || 30) * 1000 }),
      });
      if (!musicResponse.ok) {
        const errorText = await musicResponse.text();
        throw new Error(`Song generation failed: ${errorText}`);
      }
      const audioBlob = await musicResponse.blob();
      audioBase64 = encodeBase64(new Uint8Array(await audioBlob.arrayBuffer()));
    } else {
      console.log('Generating instrumental music');
      let musicPrompt = `${genre || 'ambient'} ${mood || 'calm'} instrumental music`;
      if (musicDescription && musicDescription.trim()) musicPrompt += `. ${musicDescription.substring(0, 400)}`;
      if (musicPrompt.length > 450) musicPrompt = musicPrompt.substring(0, 447) + '...';

      const musicResponse = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: { 'xi-api-key': elevenlabsApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: musicPrompt, duration_seconds: durationSeconds || 30, prompt_influence: 0.5 }),
      });
      if (!musicResponse.ok) {
        const errorText = await musicResponse.text();
        throw new Error(`Music generation failed: ${errorText}`);
      }
      const audioBlob = await musicResponse.blob();
      audioBase64 = encodeBase64(new Uint8Array(await audioBlob.arrayBuffer()));
    }

    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
    const hasVocals = !!(lyrics && lyrics.trim());

    // Upload to B2
    let b2Url: string | null = null;
    try {
      const B2_KEY_ID = Deno.env.get('B2_KEY_ID');
      const B2_APP_KEY = Deno.env.get('B2_APPLICATION_KEY');
      if (B2_KEY_ID && B2_APP_KEY) {
        const aws = new AwsClient({ accessKeyId: B2_KEY_ID, secretAccessKey: B2_APP_KEY, region: 'us-east-005' });
        const fileKey = `audio/image-music/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
        const uploadUrl = `https://s3.us-east-005.backblazeb2.com/wishmetoday/${fileKey}`;
        // Decode the base64 back to bytes for upload
        const { decodeBase64: dec } = await import("https://deno.land/std@0.224.0/encoding/base64.ts");
        const audioBytes = dec(audioBase64);
        const uploadRes = await aws.fetch(uploadUrl, {
          method: 'PUT', body: audioBytes,
          headers: { 'Content-Type': 'audio/mpeg', 'x-amz-acl': 'public-read' },
        });
        if (uploadRes.ok) {
          b2Url = `https://f005.backblazeb2.com/file/wishmetoday/${fileKey}`;
          console.log('Image+Music uploaded to B2:', b2Url);
        }
      }
    } catch (e) { console.error('B2 upload error (non-fatal):', e); }

    return new Response(JSON.stringify({
      success: true, audioUrl, b2Url, imageBase64,
      message: hasVocals ? 'Your song with vocals is ready!' : 'Your instrumental music is ready!',
      duration: durationSeconds || 30, hasVocals
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error creating image music:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create music for image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
