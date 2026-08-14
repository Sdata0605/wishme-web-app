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

    const { text, durationSeconds, promptInfluence } = await req.json();
    if (!text) throw new Error('Sound effect description is required');

    console.log('Generating sound effect:', { text, durationSeconds });

    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: { 'xi-api-key': elevenlabsApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, duration_seconds: durationSeconds || 5, prompt_influence: promptInfluence || 0.3 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs sound effects error:', response.status, errorText);
      throw new Error(`Sound effect generation failed: ${errorText}`);
    }

    const audioBlob = await response.blob();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBytes = new Uint8Array(arrayBuffer);
    const base64Audio = encodeBase64(audioBytes);
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    let b2Url: string | null = null;
    try {
      const B2_KEY_ID = Deno.env.get('B2_KEY_ID');
      const B2_APP_KEY = Deno.env.get('B2_APPLICATION_KEY');
      if (B2_KEY_ID && B2_APP_KEY) {
        const aws = new AwsClient({ accessKeyId: B2_KEY_ID, secretAccessKey: B2_APP_KEY, region: 'us-east-005' });
        const fileKey = `audio/sfx/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
        const uploadUrl = `https://s3.us-east-005.backblazeb2.com/wishmetoday/${fileKey}`;
        const uploadRes = await aws.fetch(uploadUrl, {
          method: 'PUT', body: audioBytes,
          headers: { 'Content-Type': 'audio/mpeg', 'x-amz-acl': 'public-read' },
        });
        if (uploadRes.ok) {
          b2Url = `https://f005.backblazeb2.com/file/wishmetoday/${fileKey}`;
          console.log('SFX uploaded to B2:', b2Url);
        }
      }
    } catch (e) { console.error('B2 upload error (non-fatal):', e); }

    return new Response(JSON.stringify({ success: true, audioUrl, b2Url, message: 'Sound effect generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error generating sound effect:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate sound effect' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
