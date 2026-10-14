/**
 * Shared logic for AI calls (the assistant phones someone on the user's behalf).
 * Pure functions only, so they can be tested without Deno or the network.
 */

// ─── Phone numbers ───────────────────────────────────────────────────────────

/** Emergency and public-service short codes in India. Never dialled by the assistant. */
const EMERGENCY = new Set(['100', '101', '102', '108', '112', '181', '1070', '1077', '1078', '1091', '1098', '1363', '1930']);

export type NumberCheck = { ok: true; e164: string } | { ok: false; reason: string };

/**
 * Accepts Indian mobile and landline numbers in the usual formats and returns +91XXXXXXXXXX.
 * Rejects emergency numbers, short codes, premium lines and numbers from other countries.
 */
export function checkPhoneNumber(input: string): NumberCheck {
  const raw = (input ?? '').trim();
  const digitsOnly = raw.replace(/\D/g, '');
  if (EMERGENCY.has(digitsOnly)) {
    return { ok: false, reason: 'The assistant never calls emergency numbers. Please dial them yourself.' };
  }

  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) {
    if (!d.startsWith('+91')) return { ok: false, reason: 'AI calls only work for Indian phone numbers (+91) for now.' };
    d = d.slice(3);
  } else if (d.startsWith('0091')) {
    d = d.slice(4);
  } else if (d.startsWith('91') && d.length === 12) {
    d = d.slice(2);
  } else if (d.startsWith('0') && d.length === 11) {
    d = d.slice(1); // STD code form such as 022 1234 5678
  }

  if (!/^[2-9]\d{9}$/.test(d)) {
    return { ok: false, reason: 'That does not look like a valid 10-digit Indian phone number.' };
  }
  // Premium / toll style ranges are not something a personal assistant should dial.
  if (/^(19|18)/.test(d) || d.startsWith('900') || d.startsWith('909')) {
    return { ok: false, reason: 'That number cannot be called by the assistant.' };
  }
  return { ok: true, e164: `+91${d}` };
}

/** Speakable form for confirmations: "+91 98765 43210". */
export function formatForSpeech(e164: string): string {
  const d = e164.replace(/^\+91/, '');
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

// ─── Request cleaning ────────────────────────────────────────────────────────

/** Trims, collapses whitespace and removes control characters. */
export function cleanText(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Names go into spoken sentences and prompts, so keep them to plain text. */
export function cleanName(value: unknown): string {
  return cleanText(String(value ?? '').replace(/["'`<>{}\\]/g, ''), 60);
}

export type CallLanguage = 'english' | 'hindi' | 'hinglish';

export function normaliseLanguage(value: unknown): CallLanguage {
  const v = String(value ?? '').toLowerCase();
  return v === 'hindi' || v === 'hinglish' ? v : 'english';
}

// ─── The AI's instructions for the call ──────────────────────────────────────

export interface CallBrief {
  userName: string;
  toName: string;
  purpose: string;
  details: string;
  language: CallLanguage;
  now: Date;
}

const LANGUAGE_RULE: Record<CallLanguage, string> = {
  english: 'Speak in clear, simple English. If the other person answers in Hindi, switch to Hindi.',
  hindi: 'Speak in Hindi (Devanagari-friendly, everyday spoken Hindi). If the other person prefers English, switch to English.',
  hinglish: 'Speak in natural Hinglish: everyday Hindi mixed with common English words. Match whichever the other person uses.',
};

export function openingLine(brief: Pick<CallBrief, 'userName' | 'toName' | 'language'>): string {
  const who = brief.userName || 'a customer';
  const name = brief.toName ? `, ${brief.toName}` : '';
  if (brief.language === 'hindi' || brief.language === 'hinglish') {
    return `नमस्ते${name}। मैं एक एआई असिस्टेंट हूँ और ${who} की तरफ़ से कॉल कर रहा हूँ। यह कॉल रिकॉर्ड हो रही है ताकि मैं आपकी बात उन तक पहुँचा सकूँ। क्या आपके पास एक मिनट है?`;
  }
  return `Hello${name}. I'm an AI assistant calling on behalf of ${who}. This call is recorded so I can pass your reply on. Do you have a minute?`;
}

export function closingLine(language: CallLanguage): string {
  return language === 'english'
    ? 'Thank you for your time. Goodbye!'
    : 'आपके समय के लिए धन्यवाद। नमस्ते!';
}

/** The system prompt that keeps the AI on task and safe. */
export function callSystemPrompt(brief: CallBrief): string {
  const today = brief.now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  return `You are an AI voice assistant making a short phone call on behalf of ${brief.userName || 'a customer'} of the WishMe app. You are speaking to ${brief.toName || 'the person who answers'}.

TODAY: ${today} (India time).

YOUR TASK: ${brief.purpose}
${brief.details ? `EXTRA DETAILS FROM THE USER: ${brief.details}` : ''}

HOW TO BEHAVE
- You have already said who you are and that the call is recorded. If asked, say plainly that you are an AI assistant calling for ${brief.userName || 'your customer'}. Never pretend to be a human.
- ${LANGUAGE_RULE[brief.language]}
- Be polite, brief and natural. One or two short sentences at a time. Ask one question at a time.
- Get what the task needs (for example an appointment date and time, whether something is possible, a price), then repeat the key details back to confirm: names, dates, times, amounts.
- If the person is busy or asks you to call later, ask when, thank them and end the call.
- If a choice or a decision is needed that the user did not authorise (a different time, a fee, extra tests), do NOT agree. Say you will check with ${brief.userName || 'them'} and get back, and note the options.
- NEVER share or ask for card numbers, bank details, OTPs, PINs, passwords or ID numbers. Never agree to pay anything on the call.
- Do not give medical, legal or financial advice. Do not argue.
- If you reach voicemail or an answering machine: leave one short message (who you are, who you call for, the reason, and that they can call ${brief.userName || 'them'} back), then end the call.
- If the person asks not to be called again, apologise, confirm you will not call again, and end the call.
- If the call is not going anywhere after a few tries, thank them and end it politely. Keep the whole call under about 3 minutes.`;
}

export const SUMMARY_PROMPT =
  "Summarise this phone call in 2 to 4 short plain sentences for the person who asked for it. Say what the other person said and what was decided: dates, times, names, prices, anything promised, and anything the user still needs to do. If nobody picked up or it went to voicemail, say so. Do not invent details.";

export const STRUCTURED_SCHEMA = {
  type: 'object',
  properties: {
    outcome: {
      type: 'string',
      enum: ['success', 'partial', 'declined', 'no_info', 'callback_requested'],
      description: 'success = the task was done; partial = some of it; declined = they said no; no_info = nothing useful learned; callback_requested = they asked to be called back later',
    },
    next_step: { type: 'string', description: 'What the user should do next, in one short sentence. Empty if nothing.' },
    opted_out: { type: 'boolean', description: 'True only if the person asked not to be called again.' },
  },
  required: ['outcome'],
};

/** The assistant object sent to Vapi for one call. */
export function buildVapiAssistant(brief: CallBrief, opts: { voiceId: string; webhookUrl: string; webhookSecret: string }) {
  return {
    name: 'WishMe call assistant',
    firstMessageMode: 'assistant-speaks-first',
    firstMessage: openingLine(brief),
    endCallMessage: closingLine(brief.language),
    endCallPhrases: ['goodbye', 'bye bye', 'dhanyavaad', 'namaste'],
    maxDurationSeconds: 240,
    silenceTimeoutSeconds: 25,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [{ role: 'system', content: callSystemPrompt(brief) }],
    },
    voice: {
      provider: '11labs',
      voiceId: opts.voiceId,
      model: 'eleven_multilingual_v2',
      stability: 0.6,
      similarityBoost: 0.75,
    },
    transcriber: { provider: 'deepgram', model: 'nova-3', language: 'multi' },
    server: { url: opts.webhookUrl, secret: opts.webhookSecret },
    serverMessages: ['end-of-call-report', 'status-update'],
    artifactPlan: { recordingEnabled: true },
    analysisPlan: {
      summaryPrompt: SUMMARY_PROMPT,
      structuredDataPlan: { enabled: true, schema: STRUCTURED_SCHEMA },
    },
  };
}

// ─── Webhook helpers ─────────────────────────────────────────────────────────

/** Maps Vapi's "ended reason" to a status the app can show. */
export function statusFromEndedReason(reason: string | undefined | null): 'completed' | 'no-answer' | 'busy' | 'voicemail' | 'failed' {
  const r = String(reason ?? '').toLowerCase();
  if (r.includes('voicemail')) return 'voicemail';
  if (r.includes('did-not-answer') || r.includes('no-answer')) return 'no-answer';
  if (r.includes('busy')) return 'busy';
  if (r.includes('error') || r.includes('failed') || r.includes('invalid') || r.includes('unreachable') || r.includes('rejected')) return 'failed';
  return 'completed';
}

export function formatTranscript(raw: unknown): string {
  if (typeof raw === 'string') return raw.slice(0, 12000);
  if (!Array.isArray(raw)) return '';
  return raw
    .map((t: { role?: string; message?: string; text?: string }) => {
      const who = t.role === 'assistant' || t.role === 'bot' ? 'AI' : t.role === 'user' ? 'Them' : '';
      const text = (t.message ?? t.text ?? '').trim();
      return who && text ? `${who}: ${text}` : '';
    })
    .filter(Boolean)
    .join('\n')
    .slice(0, 12000);
}

/** Constant-time string comparison (for the webhook secret). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
