import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    // B2 credentials
    const B2_KEY_ID = Deno.env.get('B2_KEY_ID');
    const B2_APPLICATION_KEY = Deno.env.get('B2_APPLICATION_KEY');
    const B2_BUCKET_NAME = Deno.env.get('B2_BUCKET_NAME') || 'wishmetoday';
    const B2_ENDPOINT = Deno.env.get('B2_ENDPOINT') || 's3.us-east-005.backblazeb2.com';

    if (!B2_KEY_ID || !B2_APPLICATION_KEY) {
      throw new Error('B2 credentials not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { voiceName, audioBase64, provider = '11labs' } = await req.json();

    if (!voiceName || !audioBase64) {
      return new Response(
        JSON.stringify({ error: 'Voice name and audio are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Uploading voice audio to B2 first...');

    // Step 1: Upload audio to B2 to get a public URL
    const timestamp = Date.now();
    const fileKey = `vapi-voices/${profile.id}/${timestamp}-${voiceName.replace(/\s+/g, '-')}.mp3`;
    
    // Decode base64 to binary
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to B2
    const aws = new AwsClient({
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
      region: 'us-east-005',
    });

    const uploadUrl = `https://${B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileKey}`;
    
    const uploadResponse = await aws.fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'audio/mpeg',
        'x-amz-acl': 'public-read',
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('B2 upload error:', errorText);
      throw new Error('Failed to upload audio to storage');
    }

    console.log('Audio uploaded to B2, file key:', fileKey);

    // Public URL for the uploaded file
    const publicUrl = `https://f005.backblazeb2.com/file/${B2_BUCKET_NAME}/${fileKey}`;
    console.log('Public URL:', publicUrl);

    // Step 2: Create voice in Vapi using the URL
    console.log('Creating voice clone in Vapi with URL...');

    const vapiResponse = await fetch('https://api.vapi.ai/voice', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: provider,
        name: voiceName,
        files: [publicUrl]
      })
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('Vapi voice creation error:', vapiResponse.status, errorText);
      
      // Even if Vapi fails, save the voice reference locally
      const { error: insertError } = await supabase
        .from('user_vapi_voices')
        .insert({
          user_id: profile.id,
          vapi_voice_id: `local_${timestamp}`,
          voice_name: voiceName,
          audio_url: publicUrl
        });

      if (insertError) {
        console.error('Error saving voice to database:', insertError);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          voiceId: `local_${timestamp}`,
          voiceName: voiceName,
          audioUrl: publicUrl,
          warning: 'Voice saved locally. Vapi integration pending.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapiVoice = await vapiResponse.json();
    console.log('Vapi voice created:', vapiVoice.id);

    // Save to user_vapi_voices table
    const { error: insertError } = await supabase
      .from('user_vapi_voices')
      .insert({
        user_id: profile.id,
        vapi_voice_id: vapiVoice.id,
        voice_name: voiceName,
        audio_url: publicUrl
      });

    if (insertError) {
      console.error('Error saving voice to database:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        voiceId: vapiVoice.id,
        voiceName: voiceName,
        audioUrl: publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vapi-upload-voice:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});