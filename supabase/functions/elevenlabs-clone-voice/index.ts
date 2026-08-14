import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (!elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    const { audioBase64, voiceName, voiceDescription } = await req.json();

    if (!audioBase64) {
      throw new Error('Audio sample is required for voice cloning');
    }

    if (!voiceName) {
      throw new Error('Voice name is required');
    }

    console.log('Cloning voice with ElevenLabs:', { voiceName, hasAudio: !!audioBase64 });

    // Extract base64 data and convert to blob
    const base64Data = audioBase64.split(',')[1] || audioBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create form data for voice cloning
    const formData = new FormData();
    formData.append('name', voiceName);
    if (voiceDescription) {
      formData.append('description', voiceDescription);
    }
    
    // Create blob from audio data
    const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
    formData.append('files', audioBlob, 'voice_sample.mp3');

    // Call ElevenLabs Add Voice API (Instant Voice Cloning)
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs voice cloning error:', response.status, errorText);
      throw new Error(`Voice cloning failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('Voice cloned successfully:', result.voice_id);

    // Save to user_cloned_voices table for security/ownership tracking
    const { error: saveError } = await supabase
      .from('user_cloned_voices')
      .insert({
        user_id: profile.id,
        elevenlabs_voice_id: result.voice_id,
        voice_name: voiceName,
        voice_description: voiceDescription || null,
      });

    if (saveError) {
      console.error('Error saving cloned voice to database:', saveError);
      // Don't fail the request, voice was cloned successfully
    } else {
      console.log('Voice ownership saved to database');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        voiceId: result.voice_id,
        voiceName: voiceName,
        message: 'Voice cloned successfully! You can now use it for text-to-speech and music.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error cloning voice:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to clone voice'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
