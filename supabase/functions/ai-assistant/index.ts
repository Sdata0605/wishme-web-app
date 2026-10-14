import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Model Fallback Chain ─────────────────────────────────────────────────────
const MODEL_CHAIN = [
  'google/gemini-2.5-flash',
  'google/gemini-2.0-flash-001',
  'anthropic/claude-3-5-haiku',
  'openai/gpt-4o-mini',
  'meta-llama/llama-3.1-8b-instruct',
];

// ─── Complete WishMe Intent Knowledge ─────────────────────────────────────────

const INTENT_CATALOG = [
  // Celebrity
  { intent: 'celebrity_wish', name: 'Celebrity Video Wish', cat: 'Celebrity', phrases: ['book a celebrity wish', 'celebrity video', 'birthday video from celebrity', 'celebrity shoutout', 'personalised video', 'book celebrity for birthday'] },
  { intent: 'voice_call_wish', name: 'Celebrity Voice Call Wish', cat: 'Celebrity', phrases: ['voice call with celebrity', 'celebrity phone call', 'live call', 'celebrity voice call', 'book voice call'] },
  { intent: 'photo_wish', name: 'AI Photo Wish', cat: 'Celebrity', phrases: ['photo wish', 'create photo wish', 'birthday photo card', 'ai photo message', 'personalized photo'] },
  { intent: 'wish_friend', name: 'Wish a Friend', cat: 'Celebrity', phrases: ['wish a friend', 'send wish to friend', 'gift a celebrity wish', 'send celebrity video to someone'] },
  { intent: 'image_promotion', name: 'Celebrity Image Promotion', cat: 'Celebrity', phrases: ['image promotion', 'celebrity promo image', 'brand promotion with celebrity', 'promotional image', 'celebrity ad image'] },
  { intent: 'greeting_card', name: 'AI Greeting Card', cat: 'Creative', phrases: ['greeting card', 'create a card', 'birthday card', 'anniversary card', 'make a greeting card', 'digital card'] },
  // Travel
  { intent: 'flight_booking', name: 'Flight Booking', cat: 'Travel', phrases: ['book a flight', 'flight to', 'fly to', 'search flights', 'book airplane ticket', 'flight ticket', 'book plane ticket'] },
  { intent: 'hotel_booking', name: 'Hotel Booking', cat: 'Travel', phrases: ['book a hotel', 'hotel in', 'find hotel', 'hotel room', 'stay in', 'hotel booking'] },
  { intent: 'bus_booking', name: 'Bus Ticket Booking', cat: 'Travel', phrases: ['book bus ticket', 'bus to', 'bus from', 'bus booking', 'bus ticket', 'book a bus', 'travel by bus'] },
  // Bills
  { intent: 'bill_electricity', name: 'Electricity Bill', cat: 'Bills', phrases: ['pay electricity bill', 'electricity bill', 'bijli bill', 'light bill'] },
  { intent: 'bill_water', name: 'Water Bill', cat: 'Bills', phrases: ['pay water bill', 'water bill payment', 'water bill'] },
  { intent: 'bill_gas', name: 'Gas Bill', cat: 'Bills', phrases: ['pay gas bill', 'gas bill', 'piped gas', 'lpg bill'] },
  { intent: 'bill_mobile', name: 'Mobile Recharge', cat: 'Bills', phrases: ['mobile recharge', 'recharge phone', 'prepaid recharge', 'phone recharge', 'mobile bill'] },
  { intent: 'bill_dth', name: 'DTH Bill', cat: 'Bills', phrases: ['pay dth bill', 'tata sky', 'dish tv', 'dth recharge', 'set top box'] },
  { intent: 'bill_fastag', name: 'FASTag Recharge', cat: 'Bills', phrases: ['pay fastag', 'fastag recharge', 'toll tax', 'fastag top up'] },
  { intent: 'bill_broadband', name: 'Broadband Bill', cat: 'Bills', phrases: ['pay broadband bill', 'internet bill', 'wifi bill', 'broadband payment'] },
  { intent: 'bill_creditCard', name: 'Credit Card Bill', cat: 'Bills', phrases: ['pay credit card bill', 'credit card payment', 'credit card due'] },
  { intent: 'bill_loanEmi', name: 'Loan EMI', cat: 'Bills', phrases: ['pay loan emi', 'loan payment', 'emi payment'] },
  { intent: 'bill_insurance', name: 'Insurance Premium', cat: 'Bills', phrases: ['pay insurance premium', 'insurance payment', 'policy premium'] },
  // Music
  { intent: 'generate_song', name: 'Generate AI Song', cat: 'Music', phrases: ['generate a song', 'create a song', 'make music', 'ai song', 'compose music', 'create a birthday song', 'bollywood song', 'make a love song'] },
  { intent: 'text_to_speech', name: 'Text to Speech', cat: 'Music', phrases: ['text to speech', 'tts', 'convert text to audio', 'read out text', 'voice from text', 'ai voice'] },
  { intent: 'sound_effects', name: 'AI Sound Effects', cat: 'Music', phrases: ['sound effect', 'sfx', 'create sound', 'generate sound effect', 'ai sound'] },
  // Wallet
  { intent: 'wallet_check', name: 'Check Wallet Balance', cat: 'Wallet', phrases: ['wallet balance', 'check balance', 'how much money', 'my balance', 'wallet'] },
  { intent: 'wallet_add', name: 'Add Money to Wallet', cat: 'Wallet', phrases: ['add money to wallet', 'recharge wallet', 'top up wallet', 'add funds', 'deposit money'] },
  // Occasions
  { intent: 'occasion_add', name: 'Add Occasion', cat: 'Occasions', phrases: ['add birthday', 'add occasion', 'add anniversary', 'save birthday', 'remember birthday'] },
  // Misc
  { intent: 'referral', name: 'Referral Program', cat: 'Account', phrases: ['referral', 'refer a friend', 'my referral code', 'earn commission', 'referral earnings'] },
  { intent: 'view_bookings', name: 'View My Bookings', cat: 'Account', phrases: ['my bookings', 'view bookings', 'booking history', 'past orders', 'order status'] },
  { intent: 'edit_profile', name: 'Edit Profile', cat: 'Account', phrases: ['edit profile', 'update profile', 'change name', 'profile settings'] },
  { intent: 'messages', name: 'Messages', cat: 'Account', phrases: ['messages', 'chats', 'inbox', 'my chats', 'celebrity messages'] },
  { intent: 'favorites', name: 'Favorites', cat: 'Account', phrases: ['favorites', 'following', 'liked celebrities', 'subscribed celebrities'] },
  { intent: 'for_business', name: 'WishMe for Business', cat: 'Business', phrases: ['business', 'brand endorsement', 'celebrity campaign', 'for business', 'brand promotion'] },
  { intent: 'become_celebrity', name: 'Become a Celebrity', cat: 'Celebrity', phrases: ['become celebrity', 'register as celebrity', 'join as celebrity', 'celebrity signup'] },
];

const INTENT_SLOTS: Record<string, Array<{ key: string; label: string; required: boolean; question: string; options?: string[] }>> = {
  celebrity_wish: [
    { key: 'celebrity', label: 'Celebrity Name', required: true, question: 'Which celebrity would you like the wish from? (e.g. Amitabh Bachchan, Ayushmann Khurrana)' },
    { key: 'occasion', label: 'Occasion', required: true, question: 'What is the occasion?', options: ['Birthday', 'Anniversary', 'Wedding', 'Graduation', 'Baby Shower', 'Farewell', 'Get Well Soon', 'Congratulations', 'New Year', 'Other'] },
    { key: 'recipientName', label: "Recipient's Name", required: true, question: "What is the recipient's name? (Who should the celebrity address?)" },
    { key: 'message', label: 'Message', required: true, question: 'What message or instructions should the celebrity follow? (What should they say?)' },
    { key: 'language', label: 'Language', required: false, question: 'What language should the video be in?' },
  ],
  voice_call_wish: [
    { key: 'celebrity', label: 'Celebrity', required: true, question: 'Which celebrity would you like the voice call wish from?' },
    { key: 'occasion', label: 'Occasion', required: true, question: 'What is the occasion?', options: ['Birthday', 'Anniversary', 'Graduation', 'New Year', 'Diwali', 'Promotion', 'Wedding', 'Other'] },
    { key: 'recipientName', label: "Recipient's Name", required: true, question: "Who should the celebrity call? What's their name?" },
    { key: 'tone', label: 'Tone', required: false, question: 'What tone should the call have?' },
    { key: 'language', label: 'Language', required: false, question: 'In which language?' },
  ],
  flight_booking: [
    { key: 'fromCity', label: 'From City', required: true, question: 'Which city are you flying from?' },
    { key: 'toCity', label: 'To City', required: true, question: 'Which city are you flying to?' },
    { key: 'travelDate', label: 'Travel Date', required: true, question: 'What date do you want to fly?' },
    { key: 'travellers', label: 'Travellers', required: false, question: 'How many travellers?' },
    { key: 'cabin', label: 'Cabin Class', required: false, question: 'Which cabin class? (Economy / Business / First Class)' },
  ],
  hotel_booking: [
    { key: 'hotelCity', label: 'City', required: true, question: 'Which city do you need a hotel in?' },
    { key: 'checkIn', label: 'Check-in Date', required: true, question: 'When do you want to check in?' },
    { key: 'checkOut', label: 'Check-out Date', required: true, question: 'When do you want to check out?' },
  ],
  bus_booking: [
    { key: 'busFrom', label: 'From City', required: true, question: 'Where are you travelling from?' },
    { key: 'busTo', label: 'To City', required: true, question: 'Where are you travelling to?' },
    { key: 'busDate', label: 'Travel Date', required: true, question: 'What date do you want to travel?' },
  ],
  bill_electricity: [{ key: 'billConsumerNumber', label: 'Consumer Number', required: true, question: 'What is your electricity consumer number?' }],
  bill_water: [{ key: 'billConsumerNumber', label: 'Consumer Number', required: true, question: 'What is your water consumer number?' }],
  bill_gas: [{ key: 'billConsumerNumber', label: 'Consumer Number', required: true, question: 'What is your gas consumer number?' }],
  bill_mobile: [{ key: 'billConsumerNumber', label: 'Mobile Number', required: true, question: 'What is the mobile number to recharge?' }],
  bill_dth: [{ key: 'billConsumerNumber', label: 'Customer ID', required: true, question: 'What is your DTH Customer ID?' }],
  bill_fastag: [{ key: 'billConsumerNumber', label: 'Vehicle Number', required: true, question: 'What is your vehicle number for FASTag?' }],
  bill_broadband: [{ key: 'billConsumerNumber', label: 'Account ID', required: true, question: 'What is your broadband account ID or registered number?' }],
  bill_creditCard: [{ key: 'billConsumerNumber', label: 'Card Number', required: true, question: 'What are the last 4 digits of your credit card?' }],
  bill_loanEmi: [{ key: 'billConsumerNumber', label: 'Loan Account Number', required: true, question: 'What is your loan account number?' }],
  bill_insurance: [{ key: 'billConsumerNumber', label: 'Policy Number', required: true, question: 'What is your insurance policy number?' }],
  generate_song: [
    { key: 'songTitle', label: 'Song Title', required: true, question: 'What should the song title be?' },
    { key: 'songDescription', label: 'Description', required: true, question: 'Describe what the song should be about' },
  ],
  text_to_speech: [{ key: 'ttsText', label: 'Text', required: true, question: 'What text do you want to convert to speech?' }],
  sound_effects: [{ key: 'sfxPrompt', label: 'Sound Description', required: true, question: 'Describe the sound effect you want to create' }],
  wallet_add: [{ key: 'addAmount', label: 'Amount', required: true, question: 'How much money do you want to add to your wallet? (Minimum ₹100)' }],
  occasion_add: [
    { key: 'occasionPersonName', label: "Person's Name", required: true, question: "Whose occasion do you want to add?" },
    { key: 'occasionType', label: 'Occasion Type', required: true, question: 'What type of occasion?', options: ['Birthday', 'Anniversary', 'Wedding', 'Graduation', 'Other'] },
    { key: 'occasionDate', label: 'Date', required: true, question: 'What is the date of this occasion?' },
  ],
};

const INTENT_ROUTES: Record<string, { route: string; serviceView?: string; billKind?: string; name: string }> = {
  celebrity_wish: { route: '/wish-celebrity', name: 'Celebrity Search' },
  voice_call_wish: { route: '/(tabs)/voice-call', name: 'Voice Call Wish' },
  photo_wish: { route: '/photo-wish', name: 'Photo Wish' },
  wish_friend: { route: '/wish-friend', name: 'Wish a Friend' },
  image_promotion: { route: '/image-promotions', name: 'Image Promotions' },
  greeting_card: { route: '/greeting-cards', name: 'Greeting Cards' },
  flight_booking: { route: '/services', serviceView: 'flights', name: 'Flights' },
  hotel_booking: { route: '/services', serviceView: 'hotels', name: 'Hotels' },
  bus_booking: { route: '/services', serviceView: 'busTickets', name: 'Bus Tickets' },
  bill_electricity: { route: '/services', billKind: 'electricity', name: 'Electricity Bill' },
  bill_water: { route: '/services', billKind: 'water', name: 'Water Bill' },
  bill_gas: { route: '/services', billKind: 'gas', name: 'Gas Bill' },
  bill_mobile: { route: '/services', billKind: 'mobile', name: 'Mobile Recharge' },
  bill_dth: { route: '/services', billKind: 'dth', name: 'DTH Bill' },
  bill_fastag: { route: '/services', billKind: 'fastag', name: 'FASTag' },
  bill_broadband: { route: '/services', billKind: 'broadband', name: 'Broadband Bill' },
  bill_creditCard: { route: '/services', billKind: 'creditCard', name: 'Credit Card Bill' },
  bill_loanEmi: { route: '/services', billKind: 'loanEmi', name: 'Loan EMI' },
  bill_insurance: { route: '/services', billKind: 'insurance', name: 'Insurance Premium' },
  generate_song: { route: '/(tabs)/music', name: 'AI Music Studio' },
  text_to_speech: { route: '/(tabs)/music', name: 'AI Music Studio' },
  sound_effects: { route: '/(tabs)/music', name: 'AI Music Studio' },
  wallet_check: { route: '/wallet', name: 'Wallet' },
  wallet_add: { route: '/wallet', name: 'Wallet' },
  occasion_add: { route: '/occasions', name: 'Occasions' },
  referral: { route: '/referrals', name: 'Referrals' },
  view_bookings: { route: '/bookings', name: 'Bookings' },
  edit_profile: { route: '/edit-profile', name: 'Edit Profile' },
  messages: { route: '/messages', name: 'Messages' },
  favorites: { route: '/favorites', name: 'Favorites' },
  for_business: { route: '/for-business', name: 'For Business' },
  become_celebrity: { route: '/celebrity-signup', name: 'Celebrity Signup' },
};

// ─── Helper: call AI with fallbacks ───────────────────────────────────────────

async function callAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
  const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY');

  // Try OpenRouter first
  if (OPENROUTER_API_KEY) {
    for (const model of MODEL_CHAIN) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://wishme.today',
            'X-Title': 'WishMe AI Agent',
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 800,
            temperature: 0.4,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) return content;
        }
      } catch {}
    }
  }

  // Fallback to Google Gemini direct API
  if (GEMINI_API_KEY) {
    try {
      const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch {}
  }

  // Fallback response if all AI keys fail
  return "I'm ready to help you with celebrity video wishes, travel bookings, bill payments, and music creation on WishMe! What would you like to do?";
}

function detectIntent(text: string): string | null {
  const lower = text.toLowerCase();
  let best: string | null = null;
  let bestScore = 0;

  for (const item of INTENT_CATALOG) {
    for (const phrase of item.phrases) {
      const words = phrase.split(' ');
      const matched = words.filter((w) => lower.includes(w)).length;
      const score = matched / words.length;
      if (score > bestScore && score >= 0.4) {
        bestScore = score;
        best = item.intent;
      }
    }
  }
  return best;
}

function buildActionPlan(intent: string, slots: Record<string, unknown>) {
  const routeInfo = INTENT_ROUTES[intent];
  if (!routeInfo) return [];

  const steps = [
    {
      type: 'navigate',
      route: routeInfo.route,
      serviceView: routeInfo.serviceView,
      billKind: routeInfo.billKind,
      label: `Opening ${routeInfo.name}...`,
    },
    {
      type: 'prefill',
      fields: slots,
      label: 'Filling in your details...',
    },
    {
      type: 'complete',
      label: 'Done! ✅',
      message: `All done! I've opened ${routeInfo.name} and filled in your details.`,
    },
  ];

  return steps;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

// ─── Module-level cache for fastest transcription ────────────────────────────
let cachedGeminiKey: string | null = null;
let cachedGeminiModel: string | null = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = { query: rawBody };
    }

    const { agentMode = false, currentIntent = null, collectedSlots = {} } = body;
    let userQuery = body.query ? String(body.query).trim() : '';

    console.log(`[ai-assistant] Incoming request. hasAudio=${!!body.audioBase64}, query="${userQuery}", currentIntent="${currentIntent}"`);

    // If audio is provided, transcribe it using direct, ultra-fast Gemini Flash endpoint
    if (body.audioBase64) {
      console.log(`[ai-assistant] Processing audio payload. Base64 length: ${body.audioBase64.length}`);
      const GOOGLE_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
      const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
      const directKeys = [GEMINI_KEY, GOOGLE_KEY].filter(Boolean) as string[];
      const inputMime = body.mimeType || 'audio/mp4';

      // 1. FAST PATH: If we have a cached working key & model, call it directly (<300ms)
      if (cachedGeminiKey && cachedGeminiModel) {
        try {
          console.log(`[ai-assistant] Fast path transcription using cached model: ${cachedGeminiModel}...`);
          const fastUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cachedGeminiModel}:generateContent?key=${cachedGeminiKey}`;
          const fRes = await fetch(fastUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inlineData: { mimeType: inputMime, data: body.audioBase64 } },
                    { text: "Transcribe the spoken audio verbatim in English or the original language. Output ONLY the transcribed text, nothing else." },
                  ],
                },
              ],
            }),
          });
          if (fRes.ok) {
            const fData = await fRes.json();
            const text = fData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              userQuery = text.replace(/^["']|["']$/g, '').trim();
              console.log(`[ai-assistant] Fast path transcribed: "${userQuery}"`);
            }
          } else {
            console.warn('[ai-assistant] Fast path failed, resetting cache');
            cachedGeminiKey = null;
            cachedGeminiModel = null;
          }
        } catch {
          cachedGeminiKey = null;
          cachedGeminiModel = null;
        }
      }

      // 2. DISCOVERY PATH (only if fast path didn't resolve)
      if (!userQuery && directKeys.length > 0) {
        for (const key of directKeys) {
          if (userQuery) break;
          try {
            console.log('[ai-assistant] Querying Gemini models list for fast candidate...');
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (listRes.ok) {
              const listData = await listRes.json();
              const availableModels: string[] = (listData.models || [])
                .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                .map((m: any) => m.name.replace(/^models\//, ''));

              // Prioritize flash models
              const candidateModels = availableModels.filter(m => m.includes('flash')).slice(0, 3);
              for (const gModel of candidateModels) {
                try {
                  console.log(`[ai-assistant] Trying model ${gModel}...`);
                  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${key}`;
                  const gRes = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [
                        {
                          parts: [
                            { inlineData: { mimeType: inputMime, data: body.audioBase64 } },
                            { text: "Transcribe the spoken audio verbatim in English or the original language. Output ONLY the transcribed text, nothing else." },
                          ],
                        },
                      ],
                    }),
                  });

                  if (gRes.ok) {
                    const gData = await gRes.json();
                    const text = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                    if (text) {
                      userQuery = text.replace(/^["']|["']$/g, '').trim();
                      console.log(`[ai-assistant] Model ${gModel} succeeded: "${userQuery}"`);
                      // Cache for all future calls
                      cachedGeminiKey = key;
                      cachedGeminiModel = gModel;
                      break;
                    }
                  }
                } catch {}
              }
            }
          } catch {}
        }
      }
    }

    console.log(`[ai-assistant] Final resolved query: "${userQuery}"`);

    if (!userQuery || userQuery.trim().length === 0) {
      console.log('[ai-assistant] No query resolved, returning default welcoming prompt');
      return new Response(
        JSON.stringify({
          mode: 'chat',
          message: "Hey! How can I help you today? You can ask me to book a hotel, book a flight, pay a bill, or create a celebrity wish!",
          query: "",
          transcribedText: "",
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const detectedIntent = currentIntent || detectIntent(userQuery);

    if (detectedIntent) {
      const slotDefs = INTENT_SLOTS[detectedIntent] ?? [];
      const updatedSlots = { ...collectedSlots };

      // Extract slot values
      const missing = slotDefs.filter((s) => s.required && (updatedSlots[s.key] === undefined || updatedSlots[s.key] === ''));

      if (missing.length === 0) {
        const actionPlan = buildActionPlan(detectedIntent, updatedSlots);
        const name = INTENT_CATALOG.find((i) => i.intent === detectedIntent)?.name ?? detectedIntent;
        return new Response(
          JSON.stringify({
            mode: 'agent',
            query: userQuery,
            transcribedText: userQuery,
            message: `Doing this for you now! Opening ${name}... 🚀`,
            intent: detectedIntent,
            slots: updatedSlots,
            missingSlots: [],
            actionPlan,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Ask next question
      const nextQ = missing[0];
      return new Response(
        JSON.stringify({
          mode: 'agent',
          query: userQuery,
          transcribedText: userQuery,
          message: nextQ.question,
          intent: detectedIntent,
          slots: updatedSlots,
          missingSlots: missing.map((s) => s.key),
          suggestions: nextQ.options?.slice(0, 5) ?? [],
          actionPlan: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // General chat
    const aiMessage = await callAI([{ role: 'user', content: userQuery }]);
    return new Response(
      JSON.stringify({
        mode: 'chat',
        query: userQuery,
        transcribedText: userQuery,
        message: aiMessage,
        intent: null,
        suggestions: ['🎬 Celebrity Wish', '✈️ Book Flight', '💡 Pay Bill', '🎵 Make a Song'],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        mode: 'chat',
        query: '',
        message: "I'm ready to assist you with celebrity wishes, travel, bills, and AI music!",
        error: msg,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
