import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const { voiceId } = await req.json();
    if (!voiceId) {
      throw new Error('Voice ID is required');
    }

    console.log('Verifying ElevenLabs voice:', voiceId);

    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      method: 'GET',
      headers: { 'xi-api-key': elevenlabsApiKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs voice verification failed:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Voice not found (${response.status})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const voice = await response.json();
    console.log('Voice verified:', voice.name, voice.category);

    return new Response(
      JSON.stringify({ success: true, name: voice.name, category: voice.category }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error verifying voice:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
