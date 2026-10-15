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
    const DEFAULT_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');

    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }
    if (!DEFAULT_PHONE_NUMBER_ID) {
      throw new Error('VAPI_PHONE_NUMBER_ID not configured');
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Parse request body
    const {
      recipientName,
      recipientPhone,
      occasion,
      senderName,
      celebrityId,
      celebrityName,
      voiceId,
      price,
      celebrityPhoneId,
      // Enhanced fields
      customMessage,
      tone,
      relationship,
      language,
      thingsToAvoid,
      additionalContext,
      // Scheduling
      scheduledAt
    } = await req.json();

    if (!recipientName || !recipientPhone || !occasion || !celebrityId || !voiceId || !senderName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pre-call voice validation: verify the voiceId exists in ElevenLabs
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (ELEVENLABS_API_KEY) {
      try {
        const cleanVoiceId = voiceId.trim();
        console.log('Pre-call voice validation for voiceId:', cleanVoiceId);
        const elResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${cleanVoiceId}`, {
          headers: { 'xi-api-key': ELEVENLABS_API_KEY }
        });
        if (!elResponse.ok) {
          const elBody = await elResponse.text();
          console.error('Voice validation failed:', elResponse.status, elBody);
          return new Response(
            JSON.stringify({
              error: `Invalid voice ID "${cleanVoiceId}". This voice was not found in your ElevenLabs account. Please update the celebrity's voice ID in Admin → Celebrity Edit.`,
              voiceValidationFailed: true
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const voiceData = await elResponse.json();
        console.log('Voice validated successfully:', voiceData.name);
      } catch (validationError) {
        console.warn('Voice validation check failed (non-blocking):', validationError);
        // Don't block the call if validation check itself errors
      }
    }

    // Use celebrity-specific phone number if provided, otherwise use default
    const phoneNumberId = celebrityPhoneId || DEFAULT_PHONE_NUMBER_ID;
    console.log('Using phone number ID:', phoneNumberId, celebrityPhoneId ? '(celebrity-specific)' : '(default)');

    const callPrice = price || 500;

    // Check wallet balance
    if (profile.wallet_balance < callPrice) {
      return new Response(
        JSON.stringify({ error: `Insufficient wallet balance. Required: ₹${callPrice}, Available: ₹${profile.wallet_balance}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number to E.164
    let formattedPhone = recipientPhone.replace(/[^\d+]/g, '');
    // If starts with +, keep as-is but validate
    if (formattedPhone.startsWith('+')) {
      // Already has country code
    } else {
      // Strip leading zeros
      formattedPhone = formattedPhone.replace(/^0+/, '');
      if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
        formattedPhone = '+' + formattedPhone;
      } else if (/^[6-9]\d{9}$/.test(formattedPhone)) {
        formattedPhone = '+91' + formattedPhone;
      } else {
        formattedPhone = '+91' + formattedPhone;
      }
    }

    // Validate E.164: + followed by 10-15 digits
    const e164Digits = formattedPhone.replace('+', '');
    if (!/^\d{10,15}$/.test(e164Digits)) {
      return new Response(
        JSON.stringify({ error: `Invalid phone number "${recipientPhone}". Please provide a valid 10-digit Indian mobile number (starting with 6-9).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Making celebrity voice call:', { recipientName, formattedPhone, occasion, senderName, celebrityName, language, voiceId, callType: scheduledAt ? 'scheduled' : 'immediate' });

    // Map tone value to description
    const toneDescriptions: Record<string, string> = {
      'warm_loving': 'warm, loving, and affectionate',
      'funny_playful': 'funny, playful, and humorous',
      'inspirational': 'inspirational and motivational',
      'formal': 'formal and professional',
      'casual': 'casual and friendly',
      'emotional': 'emotional and heartfelt'
    };

    const toneStyle = tone ? toneDescriptions[tone] || 'warm and friendly' : 'warm and friendly';

    // Map relationship for context
    const relationshipContext = relationship ? `${recipientName} is ${senderName}'s ${relationship}.` : '';

    // Build custom message section
    const customMessageSection = customMessage ? `\n\nIMPORTANT - Include these specific things in your message:\n${customMessage}` : '';

    // Build things to avoid section
    const avoidSection = thingsToAvoid ? `\n\nIMPORTANT - DO NOT mention or talk about:\n${thingsToAvoid}` : '';

    // Build additional context section
    const contextSection = additionalContext ? `\n\nAdditional context about ${recipientName}:\n${additionalContext}` : '';

    const selectedLang = (language || 'english').toLowerCase();
    const isEnglish = selectedLang === 'english';

    // Native-language first messages
    const firstMessages: Record<string, string> = {
      'kannada': `ನಮಸ್ಕಾರ ${recipientName}! ನಾನು ${celebrityName}! ${senderName} ನಿಮಗೆ ಒಂದು ವಿಶೇಷ ಆಶ್ಚರ್ಯ ಏರ್ಪಡಿಸಿದ್ದಾರೆ!`,
      'tamil': `வணக்கம் ${recipientName}! நான் ${celebrityName}! ${senderName} உங்களுக்காக ஒரு சிறப்பு ஆச்சரியம் ஏற்பாடு செய்துள்ளார்!`,
      'telugu': `నమస్కారం ${recipientName}! నేను ${celebrityName}! ${senderName} మీ కోసం ఒక ప్రత్యేక ఆశ్చర్యం ఏర్పాటు చేశారు!`,
      'hindi': `नमस्ते ${recipientName}! मैं ${celebrityName} बोल रहा हूँ! ${senderName} ने आपके लिए एक खास सरप्राइज़ तैयार किया है!`,
      'malayalam': `നമസ്കാരം ${recipientName}! ഞാൻ ${celebrityName}! ${senderName} നിങ്ങൾക്കായി ഒരു പ്രത്യേക സർപ്രൈസ് ഒരുക്കിയിരിക്കുന്നു!`,
      'bengali': `নমস্কার ${recipientName}! আমি ${celebrityName}! ${senderName} আপনার জন্য একটি বিশেষ সারপ্রাইজ তৈরি করেছে!`,
      'gujarati': `નમસ્તે ${recipientName}! હું ${celebrityName}! ${senderName} એ તમારા માટે એક ખાસ સરપ્રાઈઝ તૈયાર કર્યું છે!`,
      'marathi': `नमस्कार ${recipientName}! मी ${celebrityName}! ${senderName} ने तुमच्यासाठी एक खास सरप्राईज तयार केलंय!`,
      'punjabi': `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${recipientName}! ਮੈਂ ${celebrityName}! ${senderName} ਨੇ ਤੁਹਾਡੇ ਲਈ ਇੱਕ ਖਾਸ ਸਰਪ੍ਰਾਈਜ਼ ਤਿਆਰ ਕੀਤਾ ਹੈ!`,
      'english': `Hello ${recipientName}! This is ${celebrityName}! ${senderName} has arranged this special surprise for you!`
    };

    // Native-language end call messages
    const endCallMessages: Record<string, string> = {
      'kannada': `ಧನ್ಯವಾದಗಳು! ನಿಮಗೆ ಶುಭವಾಗಲಿ! ನಮಸ್ಕಾರ!`,
      'tamil': `நன்றி! உங்களுக்கு நல்வாழ்த்துக்கள்! வணக்கம்!`,
      'telugu': `ధన్యవాదాలు! మీకు శుభాకాంక్షలు! నమస్కారం!`,
      'hindi': `बहुत बहुत धन्यवाद! आपका दिन शुभ हो! नमस्ते!`,
      'malayalam': `നന്ദി! നിങ്ങൾക്ക് ശുഭാശംസകൾ! നമസ്കാരം!`,
      'bengali': `ধন্যবাদ! আপনার মঙ্গল কামনা করি! নমস্কার!`,
      'gujarati': `આભાર! તમારો દિવસ શુભ રહે! નમસ્તે!`,
      'marathi': `धन्यवाद! तुमचा दिवस शुभ जाओ! नमस्कार!`,
      'punjabi': `ਧੰਨਵਾਦ! ਤੁਹਾਡਾ ਦਿਨ ਸ਼ੁਭ ਹੋਵੇ! ਸਤ ਸ੍ਰੀ ਅਕਾਲ!`,
      'english': `Thank you so much! Have a wonderful day and God bless you!`
    };

    const nativeFirstMessage = firstMessages[selectedLang] || firstMessages['english'];
    const nativeEndCallMessage = endCallMessages[selectedLang] || endCallMessages['english'];

    // Strict language instruction for non-English — require native script output
    const languageInstruction = isEnglish
      ? `LANGUAGE: Speak entirely in English.`
      : `LANGUAGE: You MUST speak ENTIRELY in ${language}. Every single word, sentence, and phrase must be in ${language}. Do NOT use English at all unless the recipient speaks in English first. Do NOT switch to English for any reason. Think in ${language}, speak in ${language}. Even greetings, blessings, and sign-offs must be in ${language}.

CRITICAL: Write your entire response using ${language} script/alphabet. Do NOT use English transliteration or Roman script. For example, write "ನಮಸ್ಕಾರ" not "Namaskara", write "நன்றி" not "Nandri", write "ధన్యవాదాలు" not "Dhanyavaadalu".`;

    // Select ElevenLabs voice model based on language
    const voiceModel = isEnglish ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2';

    // ElevenLabs language codes for proper phoneme routing
    const elevenLabsLanguageCodes: Record<string, string> = {
      'kannada': 'kn', 'tamil': 'ta', 'telugu': 'te', 'hindi': 'hi',
      'malayalam': 'ml', 'bengali': 'bn', 'gujarati': 'gu', 'marathi': 'mr',
      'punjabi': 'pa', 'english': 'en'
    };

    // Create assistant prompt with celebrity voice persona
    const assistantPrompt = `You are ${celebrityName}, a beloved celebrity making a special wish call. 

This is a special ${occasion} wish from ${senderName} to ${recipientName}.
${relationshipContext}

${languageInstruction}

TONE: Be ${toneStyle} throughout the call.

Your task:
1. Greet ${recipientName} warmly and introduce yourself as ${celebrityName}
2. Mention that this is a special ${occasion} wish from ${senderName}
3. Deliver a heartfelt, personalized ${occasion} message in your celebrity style
4. Make them feel special and celebrated
5. End with warm wishes and blessings
${customMessageSection}${avoidSection}${contextSection}

Keep the call friendly, engaging, and memorable. Speak naturally and with warmth as ${celebrityName} would. The call should last about 1-2 minutes.`;

    // Map language to Deepgram language code
    const languageMap: Record<string, string> = {
      'hindi': 'hi',
      'english': 'en',
      'tamil': 'multi',
      'telugu': 'multi',
      'kannada': 'multi',
      'malayalam': 'multi',
      'bengali': 'multi',
      'gujarati': 'multi',
      'marathi': 'multi',
      'punjabi': 'multi'
    };
    const transcriptionLanguage = languageMap[language?.toLowerCase() || 'english'] || 'en';

    // Build complete Vapi request body with all required configurations
    const vapiRequestBody = {
      phoneNumberId: phoneNumberId,
      customer: {
        number: formattedPhone,
        name: recipientName
      },
      assistant: {
        // CRITICAL: Set assistant to speak first on outbound calls
        firstMessageMode: "assistant-speaks-first",

        firstMessage: nativeFirstMessage,

        // CRITICAL: Add transcriber for speech recognition - allows AI to hear the caller
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: transcriptionLanguage
        },

        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: assistantPrompt
            }
          ]
        },

        // CRITICAL: Complete voice configuration with ElevenLabs settings
        // Higher stability (0.75) for non-English eliminates singing/pitch swings
        // style: 0 for non-English prevents over-dramatization
        // language code enables proper phoneme routing
        voice: {
          provider: "11labs",
          voiceId: voiceId,
          model: voiceModel,
          stability: isEnglish ? 0.5 : 0.75,
          similarityBoost: 0.75,
          style: isEnglish ? 0.5 : 0,
          useSpeakerBoost: true,
          optimizeStreamingLatency: isEnglish ? 3 : 2,
          language: elevenLabsLanguageCodes[selectedLang] || undefined
        },

        // CRITICAL: Silence and timeout configurations to prevent premature disconnection
        silenceTimeoutSeconds: 60,
        maxDurationSeconds: 180,

        // Background sound for natural phone call experience
        backgroundSound: "office",

        // End call configuration
        endCallMessage: nativeEndCallMessage,
        endCallPhrases: ["goodbye", "bye bye", "take care", "thank you bye", "ok bye"]
      }
    };

    console.log('Sending Vapi request with complete configuration:', JSON.stringify(vapiRequestBody, null, 2));

    // Check if this is a scheduled call
    if (scheduledAt) {
      console.log('Scheduling call for:', scheduledAt);

      // Deduct from wallet immediately (payment upfront)
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance - callPrice })
        .eq('id', profile.id);

      if (walletError) {
        console.error('Wallet deduction error:', walletError);
      }

      // Record wallet transaction
      await supabase.from('wallet_transactions').insert({
        user_id: profile.id,
        transaction_type: 'voice_call',
        amount: callPrice,
        status: 'completed',
        description: `Scheduled celebrity voice call: ${celebrityName} to ${recipientName} for ${occasion}`
      });

      // Record scheduled voice call wish with full call config
      await supabase.from('voice_call_wishes').insert({
        user_id: profile.id,
        recipient_name: recipientName,
        recipient_phone: formattedPhone,
        occasion: occasion,
        celebrity_id: celebrityId,
        sender_name: senderName,
        vapi_voice_id: voiceId,
        vapi_voice_name: celebrityName,
        call_status: 'scheduled',
        price_paid: callPrice,
        scheduled_at: scheduledAt,
        call_config: {
          customMessage: customMessage || null,
          tone: tone || null,
          relationship: relationship || null,
          language: language || null,
          thingsToAvoid: thingsToAvoid || null,
          additionalContext: additionalContext || null,
          celebrityPhoneId: celebrityPhoneId || null
        }
      });

      // Fire notification: voice_call_scheduled
      try {
        const supabaseUrlEnv = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
        await fetch(`${supabaseUrlEnv}/functions/v1/send-wishme-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
          body: JSON.stringify({
            event_key: 'voice_call_scheduled',
            recipient_type: 'user',
            recipient_id: profile.id,
            data: { first_name: senderName, celebrity_name: celebrityName, scheduled_time: scheduledAt, phone_number: formattedPhone, payment_id: '' }
          })
        });
      } catch (e) { console.warn('Notification error:', e); }

      return new Response(
        JSON.stringify({
          success: true,
          scheduled: true,
          scheduledAt: scheduledAt,
          message: `Call scheduled for ${recipientName}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Vapi call with complete configuration (immediate call)
    console.log('Vapi celebrity-call: phoneNumberId present:', !!phoneNumberId);
    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vapiRequestBody)
    });

    const vapiResponseText = await vapiResponse.text();
    console.log('Vapi celebrity-call upstream status:', vapiResponse.status);
    console.log('Vapi celebrity-call upstream response:', vapiResponseText.substring(0, 500));

    if (!vapiResponse.ok) {
      console.error('Vapi call failed:', { status: vapiResponse.status, body: vapiResponseText.substring(0, 1000) });
      // Parse Vapi error for user-friendly message
      let vapiErrorMessage = 'Failed to initiate celebrity call';
      try {
        const vapiError = JSON.parse(vapiResponseText);
        vapiErrorMessage = vapiError.message || vapiError.error || vapiErrorMessage;
      } catch { /* use default */ }
      return new Response(
        JSON.stringify({ error: vapiErrorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callData = JSON.parse(vapiResponseText);

    // Check for provider/voice errors in successful response
    if (callData.error || callData.message) {
      console.error('Vapi returned error in response body:', callData.error || callData.message);
    }

    console.log('Vapi call initiated successfully:', { callId: callData.id, status: callData.status, voiceId });

    // Deduct from wallet
    const { error: walletError } = await supabase
      .from('profiles')
      .update({ wallet_balance: profile.wallet_balance - callPrice })
      .eq('id', profile.id);

    if (walletError) {
      console.error('Wallet deduction error:', walletError);
    }

    // Record wallet transaction
    await supabase.from('wallet_transactions').insert({
      user_id: profile.id,
      transaction_type: 'voice_call',
      amount: callPrice,
      status: 'completed',
      description: `Celebrity voice call: ${celebrityName} to ${recipientName} for ${occasion}`
    });

    // Record voice call wish
    await supabase.from('voice_call_wishes').insert({
      user_id: profile.id,
      recipient_name: recipientName,
      recipient_phone: formattedPhone,
      occasion: occasion,
      celebrity_id: celebrityId,
      sender_name: senderName,
      vapi_voice_id: voiceId,
      vapi_voice_name: celebrityName,
      vapi_call_id: callData.id,
      call_status: 'initiated',
      price_paid: callPrice
    });

    return new Response(
      JSON.stringify({
        success: true,
        callId: callData.id,
        message: `Call initiated to ${recipientName}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vapi-celebrity-call:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});