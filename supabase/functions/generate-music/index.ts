import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sunoApiKey = Deno.env.get('SUNO_API_KEY');

    if (!sunoApiKey) {
      throw new Error('SUNO_API_KEY not configured');
    }

    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const body = await req.json();
    const { song_title, genre, mood, prompt, description, lyrics, generation_type, voice_type, language } = body;

    // Determine price: ₹150 for full song, ₹100 for instrumental
    const isFullSong = generation_type === 'with_lyrics';
    const songPrice = isFullSong ? 150 : 100;

    // Check wallet balance
    if (!profile.wallet_balance || profile.wallet_balance < songPrice) {
      return new Response(
        JSON.stringify({ error: `Insufficient wallet balance. Need ₹${songPrice}` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fail fast if the Suno key is invalid or the account has no credits
    try {
      const creditRes = await fetch('https://api.sunoapi.org/api/v1/generate/credit', {
        headers: { 'Authorization': `Bearer ${sunoApiKey}`, 'Content-Type': 'application/json' },
      });
      const creditJson = await creditRes.json().catch(() => ({}));
      if (creditRes.status === 401 || creditJson?.code === 401) {
        throw new Error('Suno API key is invalid. Update SUNO_API_KEY in Edge Function secrets.');
      }
      const credits = typeof creditJson?.data === 'number' ? creditJson.data : null;
      if (credits === 0) {
        throw new Error('Suno account has no credits. Add credits at sunoapi.org, then try again.');
      }
    } catch (creditErr: any) {
      if (creditErr?.message?.startsWith('Suno')) throw creditErr;
      console.warn('Suno credit check skipped:', creditErr);
    }

    // Create generation record
    const { data: generation, error: insertError } = await supabase
      .from('music_generations')
      .insert({
        user_id: profile.id,
        song_title: song_title || 'Untitled Song',
        genre,
        mood,
        prompt,
        lyrics: isFullSong ? lyrics : undefined,
        generation_type: isFullSong ? 'with_lyrics' : 'instrumental',
        status: 'pending',
        credits_used: 1,
        price_paid: songPrice,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Build Suno prompt and style
    const lang = language || 'Hindi/English';
    let sunoPrompt: string;
    if (isFullSong && lyrics) {
      sunoPrompt = lyrics;
    } else {
      sunoPrompt = prompt || description || `A ${mood} ${genre} instrumental track`;
    }

    const voiceLabel = voice_type === 'female' ? 'female vocalist' :
                       voice_type === 'male' ? 'male vocalist' : 'vocalist';
    const styleTags = [genre, mood, lang, isFullSong ? voiceLabel : 'instrumental', 'professional recording']
      .filter(Boolean).join(', ');

    console.log('Calling Suno API with title:', song_title, 'style:', styleTags);

    // Call Suno API
    let sunoResponse;
    try {
      sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sunoApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: sunoPrompt,
          title: song_title || 'Untitled Song',
          style: styleTags,
          customMode: true,
          model: 'V4_5ALL',
          instrumental: !isFullSong,
          vocalGender: voice_type === 'female' ? 'f' : voice_type === 'male' ? 'm' : undefined,
          callBackUrl: `${supabaseUrl}/functions/v1/check-music-status`,
        }),
      });
    } catch (networkError) {
      console.error('Network error calling Suno:', networkError);
      await supabase.from('music_generations').update({
        status: 'failed', error_message: 'Network error connecting to Suno'
      }).eq('id', generation.id);
      throw new Error('Network error connecting to music service');
    }

    if (!sunoResponse.ok) {
      const errorText = await sunoResponse.text();
      console.error('Suno API error:', sunoResponse.status, errorText);

      let errorMessage = `Music API Error: ${sunoResponse.status}`;
      if (sunoResponse.status === 429) errorMessage = 'Rate limit reached. Try again shortly.';
      else if (sunoResponse.status >= 500) errorMessage = 'Music service temporarily unavailable.';

      await supabase.from('music_generations').update({
        status: 'failed', error_message: errorMessage
      }).eq('id', generation.id);

      // Refund
      await supabase.from('wallet_transactions').insert({
        user_id: profile.id, amount: songPrice,
        transaction_type: 'refund', status: 'completed',
        transaction_details: { reason: 'suno_api_error', generation_id: generation.id }
      });

      throw new Error(errorMessage);
    }

    const sunoData = await sunoResponse.json();
    console.log('Suno API response:', JSON.stringify(sunoData));

    // Handle Suno application-level errors (HTTP 200 but code != 200/0)
    if (sunoData.code && sunoData.code !== 200 && sunoData.code !== 0) {
      const sunoMsg = sunoData.msg || 'Unknown Suno error';
      console.error('Suno application error:', sunoData.code, sunoMsg);

      await supabase.from('music_generations').update({
        status: 'failed', error_message: `Suno error: ${sunoMsg}`
      }).eq('id', generation.id);

      await supabase.from('wallet_transactions').insert({
        user_id: profile.id, amount: songPrice,
        transaction_type: 'refund', status: 'completed',
        transaction_details: { reason: 'suno_app_error', generation_id: generation.id, suno_code: sunoData.code }
      });

      throw new Error(`Music service error: ${sunoMsg}`);
    }

    const taskId = sunoData.data?.taskId || sunoData.taskId || sunoData.task_id || sunoData.data?.task_id;

    if (!taskId) {
      console.error('No taskId in Suno response:', JSON.stringify(sunoData));
      await supabase.from('music_generations').update({
        status: 'failed', error_message: 'No task ID returned from music service'
      }).eq('id', generation.id);

      await supabase.from('wallet_transactions').insert({
        user_id: profile.id, amount: songPrice,
        transaction_type: 'refund', status: 'completed',
        transaction_details: { reason: 'no_task_id', generation_id: generation.id }
      });

      throw new Error('Failed to start song generation');
    }

    // Update generation with task ID
    await supabase.from('music_generations').update({
      api_task_id: taskId,
      status: 'processing'
    }).eq('id', generation.id);

    // Deduct wallet
    await supabase.from('wallet_transactions').insert({
      user_id: profile.id, amount: songPrice,
      transaction_type: 'music_generation', status: 'completed',
      transaction_details: { generation_id: generation.id, song_title }
    });

    return new Response(
      JSON.stringify({
        generation_id: generation.id,
        task_id: taskId,
        status: 'processing'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating music:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
