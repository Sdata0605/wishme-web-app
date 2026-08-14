import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

    console.log('Fetching all voices including cloned voices from ElevenLabs');

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': elevenlabsApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs voices fetch error:', response.status, errorText);
      throw new Error(`Failed to fetch voices: ${errorText}`);
    }

    const data = await response.json();
    
    // Separate cloned voices from premade voices
    const clonedVoices = data.voices.filter((v: any) => v.category === 'cloned');
    const premadeVoices = data.voices.filter((v: any) => v.category !== 'cloned');

    console.log(`Found ${clonedVoices.length} cloned voices and ${premadeVoices.length} premade voices`);

    return new Response(
      JSON.stringify({ 
        success: true,
        voices: data.voices,
        clonedVoices,
        premadeVoices,
        totalCount: data.voices.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error fetching voices:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch voices'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
