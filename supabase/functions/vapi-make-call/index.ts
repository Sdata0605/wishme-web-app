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
    const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');
    
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }
    if (!VAPI_PHONE_NUMBER_ID) {
      throw new Error('VAPI_PHONE_NUMBER_ID not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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

    const { recipientName, recipientPhone, occasion, voiceId, voiceName, voiceProvider, language } = await req.json();

    if (!recipientName || !recipientPhone || !occasion || !voiceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CALL_PRICE = 100;

    // Check wallet balance
    if ((profile.wallet_balance || 0) < CALL_PRICE) {
      return new Response(
        JSON.stringify({ error: 'Insufficient wallet balance. Please add funds to continue.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number (ensure it has country code)
    let formattedPhone = recipientPhone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('+')) {
      if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone;
      }
      formattedPhone = '+' + formattedPhone;
    }

    const selectedLang = (language || 'english').toLowerCase();
    const isEnglish = selectedLang === 'english';

    // Native-language first messages
    const firstMessages: Record<string, string> = {
      'kannada': `ನಮಸ್ಕಾರ ${recipientName}! ಇದು ನಿಮಗೆ ಒಂದು ವಿಶೇಷ ಕರೆ! ನಿಮ್ಮ ${occasion} ಗೆ ಶುಭ ಹಾರೈಸಲು ಕರೆ ಮಾಡಿದ್ದೇನೆ!`,
      'tamil': `வணக்கம் ${recipientName}! இது உங்களுக்காக ஒரு சிறப்பு அழைப்பு! உங்கள் ${occasion} க்கு வாழ்த்து தெரிவிக்க அழைக்கிறேன்!`,
      'telugu': `నమస్కారం ${recipientName}! ఇది మీ కోసం ఒక ప్రత్యేక కాల్! మీ ${occasion} కి శుభాకాంక్షలు చెప్పడానికి కాల్ చేస్తున్నాను!`,
      'hindi': `नमस्ते ${recipientName}! यह आपके लिए एक खास कॉल है! आपके ${occasion} की शुभकामनाएँ देने के लिए कॉल कर रहा हूँ!`,
      'malayalam': `നമസ്കാരം ${recipientName}! ഇത് നിങ്ങൾക്കായി ഒരു പ്രത്യേക കോൾ ആണ്! നിങ്ങളുടെ ${occasion} ആശംസിക്കാൻ വിളിക്കുകയാണ്!`,
      'bengali': `নমস্কার ${recipientName}! এটা আপনার জন্য একটি বিশেষ কল! আপনার ${occasion} এর শুভেচ্ছা জানাতে কল করছি!`,
      'gujarati': `નમસ્તે ${recipientName}! આ તમારા માટે એક ખાસ કોલ છે! તમારા ${occasion} ની શુભેચ્છા પાઠવવા કોલ કરું છું!`,
      'marathi': `नमस्कार ${recipientName}! हा तुमच्यासाठी एक खास कॉल आहे! तुमच्या ${occasion} च्या शुभेच्छा देण्यासाठी कॉल करतोय!`,
      'punjabi': `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${recipientName}! ਇਹ ਤੁਹਾਡੇ ਲਈ ਇੱਕ ਖਾਸ ਕਾਲ ਹੈ! ਤੁਹਾਡੇ ${occasion} ਦੀਆਂ ਸ਼ੁਭਕਾਮਨਾਵਾਂ ਦੇਣ ਲਈ ਕਾਲ ਕਰ ਰਿਹਾ ਹਾਂ!`,
      'english': `Hi ${recipientName}! This is a very special call just for you! I'm here to wish you an amazing ${occasion}!`
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
      'english': `Thank you for taking this call! Have a wonderful ${occasion}! Goodbye!`
    };

    const nativeFirstMessage = firstMessages[selectedLang] || firstMessages['english'];
    const nativeEndCallMessage = endCallMessages[selectedLang] || endCallMessages['english'];

    const languageInstruction = isEnglish
      ? `Speak entirely in English.`
      : `You MUST speak ENTIRELY in ${language || selectedLang}. Every single word must be in ${language || selectedLang}. Do NOT use English at all. Think in ${language || selectedLang}, speak in ${language || selectedLang}.

CRITICAL: Write your entire response using ${language || selectedLang} script/alphabet. Do NOT use English transliteration or Roman script. For example, write "ನಮಸ್ಕಾರ" not "Namaskara", write "நன்றி" not "Nandri", write "ధన్యవాదాలు" not "Dhanyavaadalu".`;

    const voiceModel = isEnglish ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2';

    const elevenLabsLanguageCodes: Record<string, string> = {
      'kannada': 'kn', 'tamil': 'ta', 'telugu': 'te', 'hindi': 'hi',
      'malayalam': 'ml', 'bengali': 'bn', 'gujarati': 'gu', 'marathi': 'mr',
      'punjabi': 'pa', 'english': 'en'
    };

    console.log('Creating Vapi call to:', formattedPhone, 'language:', selectedLang, 'voiceModel:', voiceModel);

    const assistantPrompt = `You are a friendly AI assistant making a special wish call. 
Your task is to wish ${recipientName} on their ${occasion}.

${languageInstruction}

Instructions:
- Deliver a heartfelt ${occasion} wish that is warm, genuine, and personalized
- Keep the message between 30-60 seconds
- Be enthusiastic but not over the top
- If they ask who is calling, say you are a special AI wish call from someone who cares about them
- Be conversational and natural

Remember: This is a celebration call, so keep the energy positive and cheerful!`;

    console.log('Vapi call: phoneNumberId present:', !!VAPI_PHONE_NUMBER_ID);
    const vapiCallResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: formattedPhone,
          name: recipientName
        },
        assistant: {
          name: `${occasion} Wisher`,
          firstMessageMode: "assistant-speaks-first",
          model: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: assistantPrompt
              }
            ]
          },
          voice: {
            provider: voiceProvider || '11labs',
            voiceId: voiceId,
            model: voiceModel,
            stability: isEnglish ? 0.5 : 0.75,
            similarityBoost: 0.75,
            style: isEnglish ? 0.5 : 0,
            useSpeakerBoost: true,
            optimizeStreamingLatency: isEnglish ? 3 : 2,
            language: elevenLabsLanguageCodes[selectedLang] || undefined
          },
          firstMessage: nativeFirstMessage,
          endCallMessage: nativeEndCallMessage,
          endCallPhrases: ['goodbye', 'bye', 'thank you', 'thanks'],
          maxDurationSeconds: 120
        }
      })
    });

    const vapiResponseText = await vapiCallResponse.text();
    console.log('Vapi call upstream status:', vapiCallResponse.status);
    console.log('Vapi call upstream response:', vapiResponseText.substring(0, 500));

    if (!vapiCallResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to initiate call',
          details: { status: vapiCallResponse.status, body: vapiResponseText.substring(0, 500) }
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapiCall = JSON.parse(vapiResponseText);
    console.log('Vapi call created:', vapiCall.id);

    // Deduct from wallet
    await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: (profile.wallet_balance || 0) - CALL_PRICE })
      .eq('id', profile.id);

    // Record wallet transaction
    await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_id: profile.id,
        amount: CALL_PRICE,
        transaction_type: 'voice_call_wish',
        status: 'completed',
        description: `Voice call wish - ${occasion} for ${recipientName}`
      });

    // Save call record
    const { data: callRecord, error: insertError } = await supabaseAdmin
      .from('voice_call_wishes')
      .insert({
        user_id: profile.id,
        recipient_name: recipientName,
        recipient_phone: formattedPhone,
        occasion: occasion,
        vapi_voice_id: voiceId,
        vapi_voice_name: voiceName,
        vapi_call_id: vapiCall.id,
        call_status: 'initiated',
        price_paid: CALL_PRICE
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving call record:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        callId: vapiCall.id,
        message: `Call initiated to ${recipientName}!`,
        callRecord: callRecord
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vapi-make-call:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
