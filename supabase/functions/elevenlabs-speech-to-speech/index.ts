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

    const { audioBase64, voiceId, modelId } = await req.json();
    if (!audioBase64) throw new Error('Audio data is required');
    if (!voiceId) throw new Error('Voice ID is required');

    console.log('Converting speech with ElevenLabs:', { voiceId, modelId, audioBase64Length: audioBase64.length });

    // Strip any data URL prefix robustly - handles all MIME types like
    // data:audio/webm;codecs=opus;base64, or data:audio/mp4;base64, etc.
    const base64Clean = audioBase64.replace(/^data:[^;]+;(?:[^;]+;)*base64,/, '');
    
    // Decode base64 to binary
    const binaryString = atob(base64Clean);
    const audioBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioBytes[i] = binaryString.charCodeAt(i);
    }

    console.log('Decoded audio bytes:', audioBytes.length);

    const formData = new FormData();
    formData.append('audio', new Blob([audioBytes], { type: 'audio/mpeg' }), 'audio.mp3');
    formData.append('model_id', modelId || 'eleven_multilingual_sts_v2');
    formData.append('voice_settings', JSON.stringify({ stability: 0.5, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true }));

    const response = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenlabsApiKey },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STS error:', response.status, errorText);
      throw new Error(`Speech-to-speech failed: ${errorText}`);
    }

    const audioBlob = await response.blob();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const resultBytes = new Uint8Array(arrayBuffer);
    const base64Audio = encodeBase64(resultBytes);
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    console.log('STS conversion successful, output size:', resultBytes.length);

    let b2Url: string | null = null;
    try {
      const B2_KEY_ID = Deno.env.get('B2_KEY_ID');
      const B2_APP_KEY = Deno.env.get('B2_APPLICATION_KEY');
      if (B2_KEY_ID && B2_APP_KEY) {
        const aws = new AwsClient({ accessKeyId: B2_KEY_ID, secretAccessKey: B2_APP_KEY, region: 'us-east-005' });
        const fileKey = `audio/voice-convert/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
        const uploadUrl = `https://s3.us-east-005.backblazeb2.com/wishmetoday/${fileKey}`;
        const uploadRes = await aws.fetch(uploadUrl, {
          method: 'PUT', body: resultBytes,
          headers: { 'Content-Type': 'audio/mpeg', 'x-amz-acl': 'public-read' },
        });
        if (uploadRes.ok) {
          b2Url = `https://f005.backblazeb2.com/file/wishmetoday/${fileKey}`;
          console.log('STS uploaded to B2:', b2Url);
        }
      }
    } catch (e) { console.error('B2 upload error (non-fatal):', e); }

    return new Response(JSON.stringify({ success: true, audioUrl, b2Url, message: 'Speech converted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error converting speech:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to convert speech' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
