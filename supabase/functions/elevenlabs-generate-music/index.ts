import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      songTitle, 
      genre, 
      mood, 
      lyrics, 
      description, 
      isInstrumental, 
      language,
      // New parameters for voice-based generation
      voiceId,
      generateVocals
    } = await req.json();

    console.log('Generating music with ElevenLabs:', { songTitle, genre, mood, isInstrumental, language, voiceId, generateVocals });

    let instrumentalUrl: string | null = null;
    let vocalsUrl: string | null = null;
    let audioUrl: string | null = null;

    // Build prompt for music generation
    let prompt = `${genre} ${mood} song`;
    if (language) {
      prompt += ` in ${language}`;
    }
    if (description) {
      prompt += `: ${description}`;
    }

    // Check if we need two-track generation (instrumental + vocals with selected voice)
    if (generateVocals && voiceId && lyrics) {
      console.log('Two-track generation: instrumental + vocals with voice:', voiceId);
      
      // 1. Generate INSTRUMENTAL track using Music Compose API
      const instrumentalPrompt = `${genre} ${mood} instrumental backing track. ${description || ''}`.trim();
      console.log('Generating instrumental track...');
      
      const instrumentalResponse = await fetch('https://api.elevenlabs.io/v1/music/compose', {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: instrumentalPrompt.substring(0, 450),
          music_length_ms: 60000,
        }),
      });

      if (!instrumentalResponse.ok) {
        const errorText = await instrumentalResponse.text();
        console.error('Instrumental generation error:', instrumentalResponse.status, errorText);
        throw new Error(`Failed to generate instrumental: ${errorText}`);
      }

      const instrumentalBlob = await instrumentalResponse.blob();
      const instrumentalBuffer = await instrumentalBlob.arrayBuffer();
      const instrumentalBase64 = encodeBase64(new Uint8Array(instrumentalBuffer));
      instrumentalUrl = `data:audio/mpeg;base64,${instrumentalBase64}`;
      console.log('Instrumental track generated successfully');

      // 2. Generate VOCALS track using Text-to-Speech with selected voice
      console.log('Generating vocals with voice:', voiceId);
      
      const vocalsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: lyrics,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.7,
            use_speaker_boost: true
          }
        }),
      });

      if (!vocalsResponse.ok) {
        const errorText = await vocalsResponse.text();
        console.error('Vocals generation error:', vocalsResponse.status, errorText);
        throw new Error(`Failed to generate vocals: ${errorText}`);
      }

      const vocalsBlob = await vocalsResponse.blob();
      const vocalsBuffer = await vocalsBlob.arrayBuffer();
      const vocalsBase64 = encodeBase64(new Uint8Array(vocalsBuffer));
      vocalsUrl = `data:audio/mpeg;base64,${vocalsBase64}`;
      console.log('Vocals track generated successfully');

      // Store music generation in database
      const { error: dbError } = await supabase
        .from('music_generations')
        .insert({
          user_id: user.id,
          song_title: songTitle || 'Generated Song',
          genre: genre,
          mood: mood,
          lyrics: lyrics,
          prompt: description || null,
          generation_type: 'with_lyrics', // Valid enum value
          status: 'completed',
          song_url: instrumentalUrl, // Store instrumental as main
          download_url: vocalsUrl, // Store vocals as download
          credits_used: 150, // Higher cost for two-track
          completed_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Database error:', dbError);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          instrumentalUrl,
          vocalsUrl,
          twoTrack: true,
          message: 'Music generated with your voice! Mix instrumental and vocals together.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Standard single-track generation
    if (lyrics && !isInstrumental) {
      const lyricsPreview = lyrics.substring(0, 300);
      prompt += `. Lyrics: ${lyricsPreview}`;
    }
    
    if (isInstrumental) {
      prompt += ' (instrumental only, no vocals)';
    }

    // Truncate prompt to fit API limit
    if (prompt.length > 450) {
      prompt = prompt.substring(0, 447) + '...';
    }

    console.log('ElevenLabs API prompt:', prompt);

    // Call ElevenLabs Music Generation API
    const response = await fetch('https://api.elevenlabs.io/v1/music/compose', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        music_length_ms: 60000, // 60 seconds
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // The response is the audio file directly
    const audioBlob = await response.blob();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = encodeBase64(new Uint8Array(arrayBuffer));
    
    audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    console.log('Music generated successfully');

    // Store music generation in database
    const { error: dbError } = await supabase
      .from('music_generations')
      .insert({
        user_id: user.id,
        song_title: songTitle,
        genre: genre,
        mood: mood,
        lyrics: lyrics || null,
        prompt: description || null,
        generation_type: isInstrumental ? 'instrumental' : 'with_lyrics',
        status: 'completed',
        song_url: audioUrl,
        credits_used: 100, // ₹100 per generation
        completed_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        audioUrl: audioUrl,
        message: 'Music generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating music:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate music',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
