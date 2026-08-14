import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AIAssistantRequest {
  query: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  context?: {
    currentRoute?: string;
    userRole?: 'user' | 'celebrity' | 'admin';
    userId?: string;
    isVoiceInput?: boolean;
    formContext?: {
      formId: string;
      fields: Record<string, any>;
    };
  };
}

interface SearchResult {
  type: 'page' | 'feature' | 'form' | 'faq';
  title: string;
  content: string;
  relevance: number;
  metadata?: any;
}

// Simple keyword-based search for knowledge base
function searchKnowledgeBase(query: string, currentRoute?: string): SearchResult[] {
  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  // Navigation keywords
  const navKeywords = [
    { keywords: ['home', 'main', 'start'], route: '/', name: 'Home', desc: 'Main landing page' },
    { keywords: ['celebrity', 'celebrities', 'browse', 'find'], route: '/celebrities', name: 'Browse Celebrities', desc: 'Search and book celebrities' },
    { keywords: ['book', 'booking', 'order'], route: '/bookings', name: 'My Bookings', desc: 'View your bookings' },
    { keywords: ['music', 'song', 'generate', 'ai music'], route: '/ai-music', name: 'AI Music Studio', desc: 'Generate custom songs' },
    { keywords: ['greeting', 'card'], route: '/greeting-cards', name: 'Greeting Cards', desc: 'Create AI greeting cards' },
    { keywords: ['occasion', 'birthday', 'anniversary'], route: '/occasions', name: 'Occasions', desc: 'Special occasions' },
    { keywords: ['profile', 'account', 'settings'], route: '/profile', name: 'Profile', desc: 'Manage your profile' },
    { keywords: ['wallet', 'balance', 'money', 'funds'], route: '/wallet', name: 'Wallet', desc: 'Manage wallet and payments' },
    { keywords: ['following', 'favorite', 'subscribe'], route: '/following', name: 'Following', desc: 'Your favorite celebrities' },
    { keywords: ['message', 'chat', 'conversation'], route: '/messages', name: 'Messages', desc: 'Chat with celebrities' },
    { keywords: ['celebrity signup', 'become celebrity', 'join'], route: '/celebrity-signup', name: 'Become a Celebrity', desc: 'Register as a celebrity' },
    { keywords: ['dashboard', 'celebrity panel'], route: '/celebrity-dashboard', name: 'Celebrity Dashboard', desc: 'Manage your celebrity profile' },
    { keywords: ['admin', 'manage'], route: '/admin', name: 'Admin Panel', desc: 'Platform administration' },
  ];

  navKeywords.forEach(nav => {
    const matched = nav.keywords.some(kw => queryLower.includes(kw));
    if (matched) {
      results.push({
        type: 'page',
        title: nav.name,
        content: nav.desc,
        relevance: currentRoute === nav.route ? 15 : 10,
        metadata: { route: nav.route, keywords: nav.keywords }
      });
    }
  });

  // FAQ matching - Enhanced with more comprehensive FAQs
  const faqs = [
    { q: 'how to book celebrity', a: 'Browse celebrities at /celebrities, select one, choose service type (video/text/promotion), fill booking form with recipient details, review and pay. Track status in /bookings', keywords: ['book', 'how', 'celebrity', 'order'] },
    { q: 'payment methods', a: 'We accept UPI, credit/debit cards, net banking via Razorpay. You can also use wallet balance for instant payment. All transactions are secure.', keywords: ['payment', 'pay', 'method', 'razorpay', 'upi'] },
    { q: 'add money to wallet', a: 'Go to /wallet, click Add Funds, enter amount (min ₹100), complete payment via Razorpay. Wallet balance can be used for instant bookings.', keywords: ['add money', 'wallet', 'recharge', 'funds', 'balance'] },
    { q: 'generate ai music', a: 'Visit /ai-music, enter song title and description, choose genre and mood, select with/without lyrics, click Generate. Free users get 3 generations/month.', keywords: ['music', 'song', 'generate', 'ai', 'create'] },
    { q: 'create greeting card', a: 'Go to /greeting-cards, select occasion, enter recipient name and greeting text, optionally upload reference image, generate card (costs 2 credits).', keywords: ['greeting', 'card', 'occasion', 'create'] },
    { q: 'become celebrity', a: 'Click /celebrity-signup, fill registration form with details, upload required documents (ID proof, consent video/photo), submit for approval. You will be notified via email.', keywords: ['celebrity', 'join', 'register', 'signup', 'become'] },
    { q: 'celebrity services and pricing', a: 'Video Message (₹2k-25k, 3-7 days), Text Message (₹500-5k, 1-2 days), Image Promotion (₹10k-50k, 5-10 days), Video Promotion (₹25k-1L, 7-14 days)', keywords: ['service', 'price', 'cost', 'pricing', 'rate'] },
    { q: 'booking delivery time', a: 'Video messages: 3-7 days, Text: 1-2 days, Image promotion: 5-10 days, Video promotion: 7-14 days. Timeline starts after payment confirmation.', keywords: ['delivery', 'time', 'when', 'how long', 'duration'] },
    { q: 'cancel booking', a: 'Go to /bookings, select booking, click Request Cancellation. Full refund if cancelled before celebrity accepts. Partial refund after acceptance based on progress.', keywords: ['cancel', 'refund', 'cancellation'] },
    { q: 'payment failed', a: 'Check internet connection, verify payment details, try different method or use wallet. If money deducted, contact support with transaction ID.', keywords: ['payment', 'failed', 'error', 'problem'] },
    { q: 'follow favorite celebrities', a: 'Browse /celebrities, click heart icon on celebrity cards to add to favorites. Access your favorites from /following for quick bookings.', keywords: ['follow', 'favorite', 'subscribe', 'heart'] },
    { q: 'referral program', a: 'Get referral code from /referrals, share with friends. Earn commission on their bookings (Level 1 and Level 2). Track earnings in referral dashboard.', keywords: ['referral', 'refer', 'earn', 'commission'] },
    { q: 'message celebrity', a: 'After booking, go to /messages to chat with celebrity. Send updates, ask questions, or provide additional details for your booking.', keywords: ['message', 'chat', 'talk', 'conversation'] },
  ];

  faqs.forEach(faq => {
    const matched = faq.keywords.some(kw => queryLower.includes(kw));
    if (matched) {
      results.push({
        type: 'faq',
        title: faq.q,
        content: faq.a,
        relevance: 8,
        metadata: { keywords: faq.keywords }
      });
    }
  });

  // Troubleshooting specific issues
  const troubleshooting = [
    { issue: 'video not playing', solution: 'Check internet connection, try different browser, clear cache, or download video instead of streaming', keywords: ['video', 'play', 'not working', 'problem'] },
    { issue: 'login problem', solution: 'Use Forgot Password to reset, verify email/phone, clear cookies, or try Google login', keywords: ['login', 'password', 'access', 'cant login'] },
    { issue: 'profile not saving', solution: 'Fill all required fields, check image size (max 5MB), verify phone format, click Save button, refresh to verify', keywords: ['profile', 'save', 'update', 'not saving'] },
  ];

  troubleshooting.forEach(item => {
    const matched = item.keywords.some(kw => queryLower.includes(kw));
    if (matched) {
      results.push({
        type: 'faq',
        title: item.issue,
        content: item.solution,
        relevance: 9,
        metadata: { keywords: item.keywords }
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

// Build AI prompt with context
function buildAIPrompt(request: AIAssistantRequest, searchResults: SearchResult[]): string {
  const { query, context } = request;
  
  let prompt = `You are a friendly and helpful AI assistant. You can answer any questions the user has - not limited to any specific platform or topic.

Current Context:
- User is on page: ${context?.currentRoute || 'unknown'}
- User role: ${context?.userRole || 'user'}
- Input method: ${context?.isVoiceInput ? 'Voice' : 'Text'}

${searchResults.length > 0 ? `Relevant Information:\n${searchResults.map(r => `• ${r.title}: ${r.content}${r.metadata?.route ? ` (Navigate to ${r.metadata.route})` : ''}`).join('\n')}\n` : ''}

Guidelines:
1. Be conversational, friendly, and helpful
2. Answer ANY question the user asks - general knowledge, advice, explanations, etc.
3. For platform-specific questions, use the provided context
4. Be concise${context?.isVoiceInput ? ' and brief for voice responses (2-3 sentences max)' : ' but thorough'}
5. If suggesting navigation, format as: "Navigate to [Page Name] (/route)"
6. You can discuss any topic - science, history, technology, entertainment, daily life, etc.
7. Provide accurate, helpful information on whatever the user asks about

User question: ${query}

Provide a helpful, accurate response:`;

  return prompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AIAssistantRequest = await req.json();
    const { query, context, conversationHistory } = requestData;

    if (!query || query.trim().length === 0) {
      throw new Error('Query is required');
    }

    console.log('AI Assistant request:', { 
      query, 
      route: context?.currentRoute, 
      isVoice: context?.isVoiceInput,
      historyLength: conversationHistory?.length || 0
    });

    // Get Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Search knowledge base
    const searchResults = searchKnowledgeBase(query, context?.currentRoute);

    // Build AI prompt
    const systemPrompt = buildAIPrompt(requestData, searchResults);

    // Prepare conversation history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      // Only include last 6 messages to keep context manageable
      const recentHistory = conversationHistory.slice(-6);
      messages.push(...recentHistory);
    }

    // Add current user query
    messages.push({ role: 'user', content: query });

    console.log('Calling Lovable AI with', messages.length, 'messages');

    // Call Lovable AI
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_tokens: context?.isVoiceInput ? 300 : 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI service payment required. Please contact support.');
      }
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0]?.message?.content || 'I apologize, I could not generate a response.';

    console.log('AI response received:', assistantMessage.substring(0, 100));

    // Parse response for actions
    const actions: Array<{ type: string; route: string; label: string }> = [];
    const suggestions: string[] = [];

    // Extract navigation suggestions
    const navRegex = /Navigate to (.+?) \((.+?)\)/g;
    let match;
    while ((match = navRegex.exec(assistantMessage)) !== null) {
      actions.push({
        type: 'navigate',
        route: match[2],
        label: match[1]
      });
    }

    // Add quick actions based on search results
    searchResults.forEach(result => {
      if (result.type === 'page' && result.metadata?.route) {
        suggestions.push(`Go to ${result.title}`);
      }
    });

    // Response
    return new Response(
      JSON.stringify({
        message: assistantMessage,
        actions: actions.length > 0 ? actions : undefined,
        suggestions: suggestions.slice(0, 3),
        searchResults: searchResults.map(r => ({
          type: r.type,
          title: r.title,
          route: r.metadata?.route
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in ai-assistant function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        message: 'I apologize, I encountered an error processing your request. Please try again.'
      }),
      {
        status: error.message.includes('Rate limit') ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
