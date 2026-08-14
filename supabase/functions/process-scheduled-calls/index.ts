import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
  const DEFAULT_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!VAPI_API_KEY) {
    return new Response(JSON.stringify({ error: 'VAPI_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Find scheduled calls that are due (within last 10 minutes window)
    const { data: dueCalls, error: fetchError } = await supabase
      .from('voice_call_wishes')
      .select('*, celebrities(name, vapi_voice_id, vapi_phone_id)')
      .eq('call_status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .gte('scheduled_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled calls:', fetchError);
      throw new Error('Failed to fetch scheduled calls');
    }

    if (!dueCalls || dueCalls.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'No scheduled calls due' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${dueCalls.length} scheduled calls to process`);

    const results: any[] = [];

    for (const call of dueCalls) {
      try {
        const celebrity = call.celebrities as any;
        const voiceId = call.vapi_voice_id || celebrity?.vapi_voice_id;
        const phoneNumberId = celebrity?.vapi_phone_id || DEFAULT_PHONE_NUMBER_ID;
        const celebrityName = call.vapi_voice_name || celebrity?.name || 'Celebrity';

        if (!voiceId || !phoneNumberId) {
          console.error(`Missing voice/phone config for call ${call.id}`);
          await supabase.from('voice_call_wishes').update({ call_status: 'failed', error_message: 'Missing voice or phone config' }).eq('id', call.id);
          await refundUser(supabase, call.user_id, call.price_paid, call.id, celebrityName, call.recipient_name);
          results.push({ id: call.id, status: 'failed', reason: 'Missing voice or phone config' });
          continue;
        }

        // Pre-call voice validation
        const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
        if (ELEVENLABS_API_KEY) {
          try {
            const elResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId.trim()}`, {
              headers: { 'xi-api-key': ELEVENLABS_API_KEY }
            });
            if (!elResponse.ok) {
              const elBody = await elResponse.text();
              console.error(`Voice validation failed for call ${call.id}:`, elResponse.status, elBody);
              await supabase.from('voice_call_wishes').update({ 
                call_status: 'failed', 
                error_message: `Invalid voice ID: ${voiceId}. Voice not found in ElevenLabs.` 
              }).eq('id', call.id);
              await refundUser(supabase, call.user_id, call.price_paid, call.id, celebrityName, call.recipient_name);
              results.push({ id: call.id, status: 'failed', reason: 'Invalid ElevenLabs voice ID' });
              continue;
            }
            await elResponse.text(); // consume body
            console.log(`Voice ${voiceId} validated for call ${call.id}`);
          } catch (e) {
            console.warn(`Voice validation check failed for call ${call.id} (non-blocking):`, e);
          }
        }

        // Build call config from stored config or defaults
        const config = (call.call_config as any) || {};
        const tone = config.tone || 'warm and friendly';
        const language = config.language || 'English';
        const customMessage = config.customMessage || '';
        const relationship = config.relationship || '';
        const thingsToAvoid = config.thingsToAvoid || '';
        const additionalContext = config.additionalContext || '';

        const toneDescriptions: Record<string, string> = {
          'warm_loving': 'warm, loving, and affectionate',
          'funny_playful': 'funny, playful, and humorous',
          'inspirational': 'inspirational and motivational',
          'formal': 'formal and professional',
          'casual': 'casual and friendly',
          'emotional': 'emotional and heartfelt'
        };
        const toneStyle = toneDescriptions[tone] || tone;

        const selectedLang = (language || 'english').toLowerCase();
        const isEnglish = selectedLang === 'english';

        // Native-language first messages
        const firstMessages: Record<string, string> = {
          'kannada': `ನಮಸ್ಕಾರ ${call.recipient_name}! ನಾನು ${celebrityName}! ${call.sender_name} ನಿಮಗೆ ಒಂದು ವಿಶೇಷ ಆಶ್ಚರ್ಯ ಏರ್ಪಡಿಸಿದ್ದಾರೆ!`,
          'tamil': `வணக்கம் ${call.recipient_name}! நான் ${celebrityName}! ${call.sender_name} உங்களுக்காக ஒரு சிறப்பு ஆச்சரியம் ஏற்பாடு செய்துள்ளார்!`,
          'telugu': `నమస్కారం ${call.recipient_name}! నేను ${celebrityName}! ${call.sender_name} మీ కోసం ఒక ప్రత్యేక ఆశ్చర్యం ఏర్పాటు చేశారు!`,
          'hindi': `नमस्ते ${call.recipient_name}! मैं ${celebrityName} बोल रहा हूँ! ${call.sender_name} ने आपके लिए एक खास सरप्राइज़ तैयार किया है!`,
          'malayalam': `നമസ്കാരം ${call.recipient_name}! ഞാൻ ${celebrityName}! ${call.sender_name} നിങ്ങൾക്കായി ഒരു പ്രത്യേക സർപ്രൈസ് ഒരുക്കിയിരിക്കുന്നു!`,
          'bengali': `নমস্কার ${call.recipient_name}! আমি ${celebrityName}! ${call.sender_name} আপনার জন্য একটি বিশেষ সারপ্রাইজ তৈরি করেছে!`,
          'gujarati': `નમસ્તે ${call.recipient_name}! હું ${celebrityName}! ${call.sender_name} એ તમારા માટે એક ખાસ સરપ્રાઈઝ તૈયાર કર્યું છે!`,
          'marathi': `नमस्कार ${call.recipient_name}! मी ${celebrityName}! ${call.sender_name} ने तुमच्यासाठी एक खास सरप्राईज तयार केलंय!`,
          'punjabi': `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${call.recipient_name}! ਮੈਂ ${celebrityName}! ${call.sender_name} ਨੇ ਤੁਹਾਡੇ ਲਈ ਇੱਕ ਖਾਸ ਸਰਪ੍ਰਾਈਜ਼ ਤਿਆਰ ਕੀਤਾ ਹੈ!`,
          'english': `Hello ${call.recipient_name}! This is ${celebrityName}! ${call.sender_name} has arranged this special surprise for you!`
        };
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

        const languageInstruction = isEnglish
          ? `LANGUAGE: Speak entirely in English.`
          : `LANGUAGE: You MUST speak ENTIRELY in ${language}. Every single word, sentence, and phrase must be in ${language}. Do NOT use English at all unless the recipient speaks in English first. Do NOT switch to English for any reason. Think in ${language}, speak in ${language}. Even greetings, blessings, and sign-offs must be in ${language}.

CRITICAL: Write your entire response using ${language} script/alphabet. Do NOT use English transliteration or Roman script. For example, write "ನಮಸ್ಕಾರ" not "Namaskara", write "நன்றி" not "Nandri", write "ధన్యవాదాలు" not "Dhanyavaadalu".`;

        const voiceModel = isEnglish ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2';

        const elevenLabsLanguageCodes: Record<string, string> = {
          'kannada': 'kn', 'tamil': 'ta', 'telugu': 'te', 'hindi': 'hi',
          'malayalam': 'ml', 'bengali': 'bn', 'gujarati': 'gu', 'marathi': 'mr',
          'punjabi': 'pa', 'english': 'en'
        };

        const relationshipContext = relationship ? `${call.recipient_name} is ${call.sender_name}'s ${relationship}.` : '';
        const customSection = customMessage ? `\n\nIMPORTANT - Include these specific things in your message:\n${customMessage}` : '';
        const avoidSection = thingsToAvoid ? `\n\nIMPORTANT - DO NOT mention or talk about:\n${thingsToAvoid}` : '';
        const contextSection = additionalContext ? `\n\nAdditional context about ${call.recipient_name}:\n${additionalContext}` : '';

        const assistantPrompt = `You are ${celebrityName}, a beloved celebrity making a special wish call. 

This is a special ${call.occasion} wish from ${call.sender_name} to ${call.recipient_name}.
${relationshipContext}

${languageInstruction}

TONE: Be ${toneStyle} throughout the call.

Your task:
1. Greet ${call.recipient_name} warmly and introduce yourself as ${celebrityName}
2. Mention that this is a special ${call.occasion} wish from ${call.sender_name}
3. Deliver a heartfelt, personalized ${call.occasion} message in your celebrity style
4. Make them feel special and celebrated
5. End with warm wishes and blessings
${customSection}${avoidSection}${contextSection}

Keep the call friendly, engaging, and memorable. Speak naturally and with warmth as ${celebrityName} would. The call should last about 1-2 minutes.`;

        const languageMap: Record<string, string> = {
          'hindi': 'hi', 'english': 'en',
          'tamil': 'multi', 'telugu': 'multi', 'kannada': 'multi',
          'malayalam': 'multi', 'bengali': 'multi', 'gujarati': 'multi',
          'marathi': 'multi', 'punjabi': 'multi'
        };
        const transcriptionLanguage = languageMap[language?.toLowerCase()] || 'en';

        const vapiRequestBody = {
          phoneNumberId,
          customer: { number: call.recipient_phone, name: call.recipient_name },
          assistant: {
            firstMessageMode: "assistant-speaks-first",
            firstMessage: nativeFirstMessage,
            transcriber: { provider: "deepgram", model: "nova-2", language: transcriptionLanguage },
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: assistantPrompt }]
            },
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
            silenceTimeoutSeconds: 60,
            maxDurationSeconds: 180,
            backgroundSound: "office",
            endCallMessage: nativeEndCallMessage,
            endCallPhrases: ["goodbye", "bye bye", "take care", "thank you bye", "ok bye"]
          }
        };

        console.log(`Initiating scheduled call ${call.id}`);

        const vapiResponse = await fetch('https://api.vapi.ai/call', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(vapiRequestBody)
        });

        const vapiText = await vapiResponse.text();
        console.log(`Vapi response for call ${call.id}: status=${vapiResponse.status}`);

        if (!vapiResponse.ok) {
          console.error(`Vapi call failed for ${call.id}:`, vapiText);
          await supabase.from('voice_call_wishes').update({ call_status: 'failed' }).eq('id', call.id);
          await refundUser(supabase, call.user_id, call.price_paid, call.id, celebrityName, call.recipient_name);
          results.push({ id: call.id, status: 'failed', reason: 'Vapi API error' });
          continue;
        }

        const callData = JSON.parse(vapiText);

        await supabase.from('voice_call_wishes').update({
          call_status: 'initiated',
          vapi_call_id: callData.id
        }).eq('id', call.id);

        // Fire notification: voice_call_completed (call initiated from scheduled)
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-wishme-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey },
            body: JSON.stringify({
              event_key: 'voice_call_completed',
              recipient_type: 'user',
              recipient_id: call.user_id,
              data: { first_name: call.sender_name || 'User', celebrity_name: celebrityName }
            })
          });
        } catch (e) { console.warn('Notification error:', e); }

        results.push({ id: call.id, status: 'initiated', vapiCallId: callData.id });
        console.log(`Successfully initiated scheduled call ${call.id}, Vapi ID: ${callData.id}`);

      } catch (callError: any) {
        console.error(`Error processing call ${call.id}:`, callError);
        await supabase.from('voice_call_wishes').update({ call_status: 'failed' }).eq('id', call.id);
        const celebrity = call.celebrities as any;
        await refundUser(supabase, call.user_id, call.price_paid, call.id, celebrity?.name || 'Celebrity', call.recipient_name);
        results.push({ id: call.id, status: 'failed', reason: callError.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in process-scheduled-calls:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function refundUser(supabase: any, userId: string, amount: number, callId: string, celebrityName: string, recipientName: string) {
  if (!amount || amount <= 0) return;
  try {
    // Get current balance
    const { data: profile } = await supabase.from('profiles').select('id, wallet_balance').eq('id', userId).single();
    if (!profile) return;

    await supabase.from('profiles').update({ wallet_balance: (profile.wallet_balance || 0) + amount }).eq('id', userId);
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      transaction_type: 'deposit',
      amount: amount,
      status: 'completed',
      description: `Refund: Scheduled celebrity call (${celebrityName} to ${recipientName}) failed`
    });
    console.log(`Refunded ₹${amount} to user ${userId} for failed call ${callId}`);
  } catch (e) {
    console.error('Refund error:', e);
  }
}
