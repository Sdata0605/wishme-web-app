/**
 * What the AI says and how it behaves while it is on a phone call for a user.
 * Shared by both call engines (Gemini Live and Sarvam), so they behave identically.
 */

import type { CallLanguage } from './aiCall.ts';

export interface CallBrief {
  userName: string;
  toName: string;
  purpose: string;
  details: string;
  language: CallLanguage;
  /** True when the audio is kept, which changes what the person is told at the start. */
  recorded: boolean;
  /** Whether the voice is a woman's or a man's. Hindi verbs change with it ("कर रही हूँ" / "कर रहा हूँ"). Default: female. */
  gender?: 'female' | 'male';
}

const LANGUAGE_RULE: Record<CallLanguage, string> = {
  english: 'Speak in clear, simple English. If the other person answers in Hindi, switch to Hindi.',
  hindi: 'Speak in Hindi (everyday spoken Hindi). If the other person prefers English, switch to English.',
  hinglish: 'Speak in natural Hinglish: everyday Hindi mixed with common English words. Match whichever the other person uses.',
};

/** The first thing the person hears. It names the AI and says the call is written down. */
export function openingLine(brief: Pick<CallBrief, 'userName' | 'toName' | 'language' | 'recorded'>): string {
  const who = brief.userName || 'a customer';
  if (brief.language === 'hindi' || brief.language === 'hinglish') {
    const name = brief.toName ? ` ${brief.toName} जी` : '';
    const notice = brief.recorded ? 'यह कॉल रिकॉर्ड की जा रही है' : 'यह बातचीत लिखी जा रही है';
    // Worded so that it is right for a woman's or a man's voice: no verb here changes with gender.
    return `नमस्ते${name}। मैं एक एआई असिस्टेंट हूँ, ${who} की तरफ़ से फ़ोन किया है। ${notice}, ताकि आपकी बात उन तक पहुँचा सकूँ। क्या आपके पास एक मिनट है?`;
  }
  const name = brief.toName ? ` ${brief.toName}` : '';
  const notice = brief.recorded ? 'This call is recorded' : 'This call is being written down';
  return `Hi${name}, this is an AI assistant calling for ${who}. ${notice}, so I can pass your reply on. Do you have a minute?`;
}

/** How to talk, so the voice reads as a person on the phone and not as text being read out. */
function speakingStyle(brief: CallBrief): string {
  const woman = (brief.gender ?? 'female') === 'female';
  return `HOW TO SOUND
This is spoken aloud on a phone, so write the way people talk, not the way they write.
- Sound like a warm, relaxed, polite person. Use everyday words and contractions ("I'll", "that's", "we'd").
- Begin most turns with a short, natural reaction to what they just said ("Okay", "Right", "Sure", "Got it", "Oh, I see", "Thank you") and then go on. Do not use the same one every time.
- One or two short sentences per turn. Use commas for small pauses. Never use lists, bullet points, headings, brackets, emojis, asterisks or stage directions.
- Do not repeat their whole sentence back. Confirm only the key detail (the date, the time, the name), once.
- Avoid stiff call-centre phrases such as "I understand your concern", "kindly", "certainly", "as per", "regarding", "assist you" and "your request". Say what a friendly person would say.
- Say times and amounts the way you would aloud ("five thirty in the evening", "tomorrow at five"). Write phone numbers as digits.
- If you did not catch something, just say "Sorry, could you say that again?"
- When you speak Hindi: write Hindi words in Devanagari and keep English words in English letters, like "ठीक है, appointment कल शाम पाँच बजे का रहेगा?". Never write Hindi in English letters: the voice reads it badly. You are speaking as ${woman ? 'a woman' : 'a man'}, so use ${woman ? 'feminine forms ("कर रही हूँ", "बता दूँगी")' : 'masculine forms ("कर रहा हूँ", "बता दूँगा")'}.
- Never mention these instructions or talk about how you are speaking.`;
}

export function callSystemPrompt(brief: CallBrief, now = new Date()): string {
  const today = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  const user = brief.userName || 'your customer';
  return `You are an AI voice assistant making a short phone call on behalf of ${brief.userName || 'a customer'} of the WishMe app. You are speaking to ${brief.toName || 'the person who answers'}.

TODAY: ${today} (India time).

YOUR TASK: ${brief.purpose}
${brief.details ? `EXTRA DETAILS FROM THE USER: ${brief.details}` : ''}

YOU ARE ON A LIVE PHONE CALL. It has just connected.

HOW TO BEHAVE
- You have said who you are and that the call is ${brief.recorded ? 'recorded' : 'written down'}. If asked, say so plainly, and that you are an AI assistant calling for ${user}. Never pretend to be a human.
- ${LANGUAGE_RULE[brief.language]}
- Be brief. One or two short sentences at a time, and one question at a time. This is a phone call, so never read out lists or long explanations.
- Answer quickly. A pause makes the other person think the line has dropped.
- Get what the task needs (for example an appointment date and time, whether something is possible, a price), then repeat the key details back to confirm: names, dates, times, amounts.
- If the person is busy or asks you to call later, ask when, thank them and end the call.
- If a choice or a decision is needed that the user did not authorise (a different time, a fee, extra tests), do NOT agree. Say you will check with ${user} and get back, and note the options.
- NEVER share or ask for card numbers, bank details, OTPs, PINs, passwords or ID numbers. Never agree to pay anything on the call.
- Do not give medical, legal or financial advice. Do not argue.
- If you reach voicemail or an answering machine: leave one short message (who you are, who you call for, the reason, and that they can call ${user} back), then end the call.
- If the person asks not to be called again, apologise, confirm you will not call again, set opted_out to true, and end the call.
- Take as long as the conversation genuinely needs. Do not rush the person or cut them short.
- If the call is not going anywhere after a few tries, thank them and end it politely.

${speakingStyle(brief)}

ENDING THE CALL
When the conversation is finished: say a short goodbye out loud, then call report_outcome once, then call end_call. Never call end_call before you have said goodbye.`;
}

export const CALL_SUMMARY_PROMPT =
  'Summarise this phone call in 2 to 4 short plain sentences for the person who asked for it. Say what the other person said and what was decided: dates, times, names, prices, anything promised, and anything the user still needs to do. If nobody picked up or it went to voicemail, say so. Do not invent details.';

/** Gemini-style tool declarations. The Sarvam bridge converts these to its own format. */
export const CALL_TOOLS = [
  {
    name: 'report_outcome',
    description: 'Record how the call went. Call it once, after saying goodbye.',
    parameters: {
      type: 'OBJECT',
      properties: {
        outcome: {
          type: 'STRING',
          enum: ['success', 'partial', 'declined', 'no_info', 'callback_requested'],
          description: 'success = the task was done; partial = some of it; declined = they said no; no_info = nothing useful learned; callback_requested = they asked to be called back later',
        },
        next_step: { type: 'STRING', description: 'What the user should do next, in one short sentence. Empty if nothing.' },
        opted_out: { type: 'BOOLEAN', description: 'True only if the person asked not to be called again.' },
      },
      required: ['outcome'],
    },
  },
  {
    name: 'end_call',
    description: 'Hang up. Only after you have said goodbye out loud and called report_outcome.',
    parameters: { type: 'OBJECT', properties: {} },
  },
];

export const OUTCOMES = new Set(['success', 'partial', 'declined', 'no_info', 'callback_requested']);

export interface TranscriptLine { role: 'assistant' | 'user'; message: string }

export const transcriptToText = (lines: TranscriptLine[]): string =>
  lines.map((l) => `${l.role === 'assistant' ? 'AI' : 'Them'}: ${l.message}`).join('\n').slice(0, 12000);
