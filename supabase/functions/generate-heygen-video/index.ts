import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to clean script text for HeyGen TTS
function cleanScriptForTTS(script: string): string {
  return script
    .replace(/^(Script|Opening|Greeting|Message|Closing|Body|Intro|Outro|Note|Instructions?):\s*/gim, '')
    .replace(/^\*\*.*?\*\*\s*/gm, '')
    .replace(/^#.*$/gm, '')
    .replace(/^\[.*?\]\s*/gm, '')
    .replace(/^\(.*?\)\s*/gm, '')
    .replace(/^[-•]\s*/gm, '')
    .replace(/"/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, avatarId, voiceId, bookingId } = await req.json();

    if (!script || !avatarId || !voiceId || !bookingId) {
      throw new Error('Missing required parameters');
    }

    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
    if (!heygenApiKey) {
      throw new Error('HEYGEN_API_KEY not configured');
    }

    console.log('Generating HeyGen video for booking:', bookingId);

    // Clean the script for TTS
    const cleanedScript = cleanScriptForTTS(script);

    // Call HeyGen API to generate video
    const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: avatarId,
            avatar_style: 'normal'
          },
          voice: {
            type: 'text',
            input_text: cleanedScript,
            voice_id: voiceId
          },
          background: {
            type: 'color',
            value: '#ffffff'
          }
        }],
        dimension: {
          width: 1920,
          height: 1080
        },
        aspect_ratio: '16:9',
        test: false
      }),
    });

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error('HeyGen API error:', errorText);
      throw new Error(`HeyGen API error: ${errorText}`);
    }

    const heygenData = await heygenResponse.json();
    const videoId = heygenData.data?.video_id;

    if (!videoId) {
      throw new Error('No video ID returned from HeyGen');
    }

    console.log('HeyGen video ID:', videoId);

    // Update booking with HeyGen video ID
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        heygen_video_id: videoId,
        video_generation_method: 'heygen_api'
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw updateError;
    }

    // Poll for video completion (simplified - client should poll)
    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        message: 'Video generation started. Poll /v2/video/{video_id} for status.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in generate-heygen-video:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate video'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
