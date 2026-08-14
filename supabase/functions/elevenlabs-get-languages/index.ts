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

    console.log('Fetching models from ElevenLabs...');

    const response = await fetch('https://api.elevenlabs.io/v1/models', {
      method: 'GET',
      headers: {
        'xi-api-key': elevenlabsApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const modelsData = await response.json();
    console.log('Models data received');

    // Find the multilingual model
    const multilingualModel = modelsData.find((model: any) => 
      model.model_id === 'eleven_multilingual_v2' || 
      model.name?.toLowerCase().includes('multilingual')
    );

    if (!multilingualModel || !multilingualModel.languages) {
      console.log('Multilingual model not found, returning default languages');
      // Return a default set of languages if the model isn't found
      return new Response(
        JSON.stringify({
          languages: [
            { language_id: 'en', name: 'English' },
            { language_id: 'hi', name: 'Hindi' },
            { language_id: 'es', name: 'Spanish' },
            { language_id: 'fr', name: 'French' },
            { language_id: 'de', name: 'German' },
            { language_id: 'ja', name: 'Japanese' },
            { language_id: 'ko', name: 'Korean' },
            { language_id: 'pt', name: 'Portuguese' },
            { language_id: 'it', name: 'Italian' },
            { language_id: 'zh', name: 'Chinese' },
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract languages from the model
    const languages = multilingualModel.languages.map((lang: any) => ({
      language_id: lang.language_id,
      name: lang.name
    }));

    console.log(`Found ${languages.length} languages`);

    return new Response(
      JSON.stringify({ languages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error fetching languages:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch languages',
        // Return fallback languages on error
        languages: [
          { language_id: 'en', name: 'English' },
          { language_id: 'hi', name: 'Hindi' },
          { language_id: 'es', name: 'Spanish' },
        ]
      }),
      { 
        status: 200, // Return 200 with fallback data instead of error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
