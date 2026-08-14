import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { openRouterText } from "../_shared/openrouter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingData {
  id: string;
  celebrity_id: string;
  message?: string;
  script_content?: string;
  generated_prompt?: string;
}

interface CelebrityData {
  id: string;
  name: string;
  heygen_avatar_id?: string;
  heygen_voice_id?: string;
}

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

// Auto-detect HeyGen avatar type (avatar vs talking_photo)
async function detectAvatarType(avatarId: string, apiKey: string): Promise<{ type: string; found: boolean }> {
  console.log('Detecting avatar type for ID:', avatarId);

  // Step 1: Check in avatars list
  try {
    const avatarsRes = await fetch('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': apiKey },
    });
    if (avatarsRes.ok) {
      const avatarsData = await avatarsRes.json();
      const avatars = avatarsData.data?.avatars || [];
      const found = avatars.find((a: any) => a.avatar_id === avatarId);
      if (found) {
        console.log('Found avatar in avatars list, type:', found.type || 'avatar');
        return { type: found.type === 'talking_photo' ? 'talking_photo' : 'avatar', found: true };
      }
    }
  } catch (e) {
    console.error('Error checking avatars list:', e);
  }

  // Step 2: Check in talking photos list
  try {
    const tpRes = await fetch('https://api.heygen.com/v2/talking_photo', {
      headers: { 'X-Api-Key': apiKey },
    });
    if (tpRes.ok) {
      const tpData = await tpRes.json();
      const photos = tpData.data?.talking_photos || [];
      const found = photos.find((p: any) => p.talking_photo_id === avatarId);
      if (found) {
        console.log('Found ID in talking_photos list');
        return { type: 'talking_photo', found: true };
      }
    }
  } catch (e) {
    console.error('Error checking talking photos list:', e);
  }

  // Not found in either list
  console.log('Avatar ID not found in any HeyGen list');
  return { type: 'avatar', found: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { bookingId, scriptContent, generateScript } = await req.json();

    if (!bookingId) {
      throw new Error('Missing required field: bookingId');
    }

    if (!heygenApiKey) {
      throw new Error('HEYGEN_API_KEY not configured');
    }

    console.log('Processing video order:', bookingId);

    // Fetch booking with celebrity data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        celebrity:celebrities!celebrity_id (
          id, name, heygen_avatar_id, heygen_voice_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      throw new Error('Booking not found');
    }

    const celebrity = booking.celebrity as CelebrityData;

    // Validate celebrity has HeyGen configuration
    if (!celebrity?.heygen_avatar_id || !celebrity?.heygen_voice_id) {
      throw new Error(`Celebrity ${celebrity?.name || 'Unknown'} is missing HeyGen Avatar ID or Voice ID. Please configure in admin dashboard.`);
    }

    console.log('Celebrity HeyGen config:', {
      avatarId: celebrity.heygen_avatar_id,
      voiceId: celebrity.heygen_voice_id
    });

    // AUTO-DETECT AVATAR TYPE
    const { type: avatarType, found: avatarFound } = await detectAvatarType(celebrity.heygen_avatar_id, heygenApiKey);

    if (!avatarFound) {
      const errorMsg = `Avatar ID "${celebrity.heygen_avatar_id}" not found in HeyGen account. Please update the celebrity's HeyGen avatar ID in admin.`;
      console.error(errorMsg);
      
      await supabase
        .from('bookings')
        .update({
          generation_status: 'failed',
          generation_error: errorMsg,
        })
        .eq('id', bookingId);

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Detected avatar type:', avatarType);

    // Step 1: Determine script content
    let finalScript = scriptContent || booking.script_content;

    // If no script provided and generateScript is true, generate with AI
    if (!finalScript && generateScript) {
      console.log('Generating script with Gemini AI...');
      
      await supabase
        .from('bookings')
        .update({ 
          generation_status: 'script_generating',
          generation_started_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      let messageContext = '';
      let recipientName = '';
      let occasion = '';
      let preferredLanguage = '';
      try {
        const parsedMessage = JSON.parse(booking.message || '{}');
        messageContext = parsedMessage.requestDetails?.message || 
                        parsedMessage.scriptBuilder?.talkingPoints ||
                        parsedMessage.scriptBuilder?.exactScript ||
                        booking.message || '';
        recipientName = parsedMessage.requestDetails?.recipientName || '';
        occasion = parsedMessage.requestDetails?.occasion || '';
        preferredLanguage = parsedMessage.requestDetails?.preferredLanguage || '';
      } catch {
        messageContext = booking.message || '';
      }

      // Map locale to language name for the prompt
      const localeToLanguage: Record<string, string> = {
        'en-US': 'English', 'hi-IN': 'Hindi', 'es-ES': 'Spanish', 'fr-FR': 'French',
        'de-DE': 'German', 'pt-BR': 'Portuguese', 'it-IT': 'Italian', 'zh-CN': 'Chinese',
        'ja-JP': 'Japanese', 'ko-KR': 'Korean', 'tr-TR': 'Turkish', 'nl-NL': 'Dutch',
        'pl-PL': 'Polish', 'ar-SA': 'Arabic', 'id-ID': 'Indonesian', 'ru-RU': 'Russian',
        'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi',
        'gu-IN': 'Gujarati', 'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'pa-IN': 'Punjabi',
        'ur-PK': 'Urdu', 'th-TH': 'Thai', 'vi-VN': 'Vietnamese', 'sv-SE': 'Swedish',
        'ro-RO': 'Romanian', 'el-GR': 'Greek', 'cs-CZ': 'Czech', 'fi-FI': 'Finnish',
        'da-DK': 'Danish', 'bg-BG': 'Bulgarian', 'hr-HR': 'Croatian', 'sk-SK': 'Slovak',
        'fil-PH': 'Filipino', 'ms-MY': 'Malay', 'uk-UA': 'Ukrainian',
      };
      const languageName = preferredLanguage ? (localeToLanguage[preferredLanguage] || preferredLanguage) : '';
      const languageInstruction = languageName && languageName !== 'English'
        ? `\n\nIMPORTANT: Write the ENTIRE script in ${languageName}. The celebrity should speak naturally in ${languageName}. Do NOT write in English.`
        : '';

      const aiPrompt = `You are a script writer for personalized celebrity video messages. 

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- Output ONLY the spoken script text - absolutely nothing else
- Do NOT include any headers, labels, or formatting (no "Script:", "Opening:", "Greeting:", etc.)
- Do NOT include stage directions, notes, or instructions
- Do NOT include quotation marks around the script
- Do NOT include bullet points or numbered lists
- The output will be directly fed to a text-to-speech system, so EVERY WORD you write will be spoken aloud
- Write in a natural, conversational tone as if the celebrity is speaking directly to the recipient

Create a warm, engaging script for celebrity ${celebrity.name} that:
- Is conversational and natural sounding (30-60 seconds when spoken, about 75-150 words)
${recipientName ? `- Addresses ${recipientName} by name` : ''}
${occasion ? `- References the occasion: ${occasion}` : ''}
- Has a clear greeting, main message, and sign-off
- Sounds authentic and heartfelt

Customer request context: ${messageContext}${languageInstruction}

Remember: Output ONLY the words to be spoken. No headers, no labels, no formatting.`;

      try {
        finalScript = (await openRouterText(aiPrompt, { maxTokens: 500, temperature: 0.7 })).trim();
      } catch (e) {
        console.error('OpenRouter script error:', e);
        throw new Error('Failed to generate script with AI');
      }
      
      if (!finalScript) {
        throw new Error('AI did not generate a valid script');
      }

      finalScript = cleanScriptForTTS(finalScript);
      console.log('AI generated script:', finalScript.substring(0, 100) + '...');
    }

    // Extract script from booking message if still not available
    if (!finalScript) {
      try {
        const parsedMessage = JSON.parse(booking.message || '{}');
        finalScript = parsedMessage.scriptBuilder?.talkingPoints ||
                     parsedMessage.scriptBuilder?.exactScript ||
                     parsedMessage.requestDetails?.message ||
                     booking.generated_prompt ||
                     booking.message;
      } catch {
        finalScript = booking.generated_prompt || booking.message;
      }
    }

    if (finalScript) {
      finalScript = cleanScriptForTTS(finalScript);
    }

    if (!finalScript || finalScript.trim().length < 10) {
      throw new Error('No valid script content available for video generation');
    }

    // Step 2: Update status and save script
    await supabase
      .from('bookings')
      .update({ 
        script_content: finalScript,
        generation_status: 'video_generating',
        generation_started_at: new Date().toISOString(),
        generation_error: null
      })
      .eq('id', bookingId);

    // Step 3: Call HeyGen API to generate video with auto-detected type
    console.log('Calling HeyGen API with avatar type:', avatarType);
    
    const characterPayload = avatarType === 'talking_photo'
      ? { type: 'talking_photo', talking_photo_id: celebrity.heygen_avatar_id }
      : { type: 'avatar', avatar_id: celebrity.heygen_avatar_id, avatar_style: 'normal' };

    const webhookUrl = `${supabaseUrl}/functions/v1/heygen-webhook`;
    
    // Parse preferred language from booking message
    let videoLocale = '';
    try {
      const parsedMsg = JSON.parse(booking.message || '{}');
      videoLocale = parsedMsg.requestDetails?.preferredLanguage || '';
    } catch {}

    const voicePayload: any = {
      type: 'text',
      input_text: finalScript,
      voice_id: celebrity.heygen_voice_id,
      speed: 1.0
    };

    // Add locale for non-English languages
    if (videoLocale && videoLocale !== 'en-US') {
      voicePayload.voice_settings = { locale: videoLocale };
      console.log('Setting HeyGen voice locale:', videoLocale);
    }

    const heygenPayload = {
      video_inputs: [{
        character: characterPayload,
        voice: voicePayload,
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
      test: false,
      callback_url: webhookUrl,
      callback_id: bookingId
    };

    console.log('HeyGen request payload:', JSON.stringify(heygenPayload, null, 2));

    const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(heygenPayload),
    });

    const heygenResponseText = await heygenResponse.text();
    console.log('HeyGen API response:', heygenResponseText);

    if (!heygenResponse.ok) {
      console.error('HeyGen API error:', heygenResponseText);
      
      await supabase
        .from('bookings')
        .update({ 
          generation_status: 'failed',
          generation_error: `HeyGen API error: ${heygenResponseText}`
        })
        .eq('id', bookingId);

      throw new Error(`HeyGen API error: ${heygenResponseText}`);
    }

    const heygenData = JSON.parse(heygenResponseText);
    const videoId = heygenData.data?.video_id;

    if (!videoId) {
      throw new Error('No video ID returned from HeyGen');
    }

    console.log('HeyGen video ID:', videoId);

    // Step 4: Update booking with HeyGen video ID
    await supabase
      .from('bookings')
      .update({
        heygen_video_id: videoId,
        video_status: 'processing',
        admin_notes: (booking.admin_notes || '') + `\n[Video Generation] Started at ${new Date().toISOString()}, HeyGen ID: ${videoId}, Type: ${avatarType}`
      })
      .eq('id', bookingId);

    // Step 5: Start polling for video status
    try {
      console.log('Starting background polling for video status...');
      supabase.functions.invoke('poll-heygen-status', {
        body: { bookingId, videoId }
      }).catch(err => {
        console.error('Failed to start polling (non-blocking):', err);
      });
    } catch (pollError) {
      console.error('Failed to start polling (non-blocking):', pollError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        avatarType,
        message: 'Video generation started. You can check status in the dashboard.',
        bookingId,
        generationStatus: 'video_generating'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in process-video-order:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to process video order'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
