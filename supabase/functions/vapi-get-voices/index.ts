import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'VAPI_API_KEY not configured', details: { status: 0, body: 'Missing secret' } }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header for user context
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

    // Fetch voices from Vapi API
    console.log('Fetching voices from Vapi API...');
    const vapiResponse = await fetch('https://api.vapi.ai/voice', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Vapi response status:', vapiResponse.status);

    if (!vapiResponse.ok) {
      const errorBody = await vapiResponse.text();
      console.error('Vapi API error:', vapiResponse.status, errorBody);

      // Return 502 with the real upstream error — do NOT silently swallow
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch Vapi voices',
          details: {
            status: vapiResponse.status,
            body: errorBody.substring(0, 500),
          },
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapiVoices = await vapiResponse.json();
    console.log('Vapi voices fetched successfully, count:', Array.isArray(vapiVoices) ? vapiVoices.length : 'not array');

    // Get user's custom uploaded voices from database
    let userVoices: any[] = [];
    if (profile?.id) {
      const { data: customVoices } = await supabase
        .from('user_vapi_voices')
        .select('*')
        .eq('user_id', profile.id);
      
      userVoices = customVoices || [];
    }

    return new Response(
      JSON.stringify({ 
        vapiVoices: Array.isArray(vapiVoices) ? vapiVoices : [],
        userVoices: userVoices
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vapi-get-voices:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
