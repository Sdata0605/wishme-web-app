import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default ElevenLabs voices available to all users
const DEFAULT_VOICES = [
  { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', category: 'premade' },
  { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', category: 'premade' },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'premade' },
  { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', category: 'premade' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', category: 'premade' },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'premade' },
  { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', category: 'premade' },
  { voice_id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', category: 'premade' },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', category: 'premade' },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', category: 'premade' },
  { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', category: 'premade' },
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', category: 'premade' },
  { voice_id: 'bIHbv24MWmeRgasZH58o', name: 'Will', category: 'premade' },
  { voice_id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', category: 'premade' },
  { voice_id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', category: 'premade' },
  { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', category: 'premade' },
  { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade' },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'premade' },
  { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', category: 'premade' },
  { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', category: 'premade' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate token using getClaims
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Token validation failed:', claimsError?.message || 'No sub claim');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUserId = claimsData.claims.sub as string;
    console.log('Authenticated user:', authUserId);

    // Use service role client for data queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUserId)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found for auth user:', authUserId, profileError?.message);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's cloned voices
    const { data: clonedVoices, error: voicesError } = await supabase
      .from('user_cloned_voices')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (voicesError) {
      console.error('Error fetching cloned voices:', voicesError.message);
    }

    // Transform cloned voices
    const userClonedVoices = (clonedVoices || []).map(v => ({
      voice_id: v.elevenlabs_voice_id,
      name: v.voice_name,
      category: 'cloned',
      description: v.voice_description,
      created_at: v.created_at,
    }));

    console.log(`Found ${userClonedVoices.length} cloned voices for profile ${profile.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        premadeVoices: DEFAULT_VOICES,
        clonedVoices: userClonedVoices,
        totalCount: DEFAULT_VOICES.length + userClonedVoices.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error in get-user-voices:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
