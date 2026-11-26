/**
 * Saying phone numbers in the language the user is speaking, and working out that language.
 *
 * Why this exists: the text-to-speech voice reads digits in whatever language the voice was opened in, and that
 * was picked from the speech recogniser's guess about the user's last sentence (or "Hindi" before they had said
 * anything). So an English speaker was read "98765 43210" in Hindi, and a Kannada speaker in Hindi too.
 *
 * Instead of trusting the voice, the digits are written out as words before the sentence is synthesised, in the
 * language the SENTENCE is written in: English words for Latin letters, Kannada words for Kannada script, and so
 * on. The voice then has nothing to get wrong. Pure code (no Deno APIs): see scripts/spokenDigits.selfcheck.ts.
 */

/** Sarvam text-to-speech language codes. */
export type TtsLang = 'en-IN' | 'hi-IN' | 'mr-IN' | 'bn-IN' | 'gu-IN' | 'kn-IN' | 'ml-IN' | 'od-IN' | 'pa-IN' | 'ta-IN' | 'te-IN';

/** Digit words, 0..9. */
const DIGITS: Record<TtsLang, string[]> = {
  'en-IN': ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
  'hi-IN': ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ'],
  'mr-IN': ['शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ'],
  'kn-IN': ['ಸೊನ್ನೆ', 'ಒಂದು', 'ಎರಡು', 'ಮೂರು', 'ನಾಲ್ಕು', 'ಐದು', 'ಆರು', 'ಏಳು', 'ಎಂಟು', 'ಒಂಬತ್ತು'],
  'ta-IN': ['பூஜ்யம்', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது'],
  'te-IN': ['సున్నా', 'ఒకటి', 'రెండు', 'మూడు', 'నాలుగు', 'ఐదు', 'ఆరు', 'ఏడు', 'ఎనిమిది', 'తొమ్మిది'],
  'ml-IN': ['പൂജ്യം', 'ഒന്ന്', 'രണ്ട്', 'മൂന്ന്', 'നാല്', 'അഞ്ച്', 'ആറ്', 'ഏഴ്', 'എട്ട്', 'ഒമ്പത്'],
  'bn-IN': ['শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'],
  'gu-IN': ['શૂન્ય', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ'],
  'pa-IN': ['ਸਿਫ਼ਰ', 'ਇੱਕ', 'ਦੋ', 'ਤਿੰਨ', 'ਚਾਰ', 'ਪੰਜ', 'ਛੇ', 'ਸੱਤ', 'ਅੱਠ', 'ਨੌਂ'],
  'od-IN': ['ଶୂନ୍ୟ', 'ଏକ', 'ଦୁଇ', 'ତିନି', 'ଚାରି', 'ପାଞ୍ଚ', 'ଛଅ', 'ସାତ', 'ଆଠ', 'ନଅ'],
};

/** Unicode block → language, for the Indic scripts (each block is 128 code points wide). */
const SCRIPT_LANG: [number, number, TtsLang][] = [
  [0x0900, 0x097f, 'hi-IN'], // Devanagari (Hindi, and Marathi, which the caller can tell apart)
  [0x0980, 0x09ff, 'bn-IN'],
  [0x0a00, 0x0a7f, 'pa-IN'],
  [0x0a80, 0x0aff, 'gu-IN'],
  [0x0b00, 0x0b7f, 'od-IN'],
  [0x0b80, 0x0bff, 'ta-IN'],
  [0x0c00, 0x0c7f, 'te-IN'],
  [0x0c80, 0x0cff, 'kn-IN'],
  [0x0d00, 0x0d7f, 'ml-IN'],
];

/** At least this share of the letters must be in an Indic script for the sentence to count as Indic. */
const INDIC_SHARE = 0.3;

/**
 * Which language a piece of text is written in, judged by its script: an Indic language code, 'latin' for
 * English-looking text, or null when there are no letters at all (just digits and punctuation).
 */
export function scriptLanguage(text: string): TtsLang | 'latin' | null {
  const counts = new Map<TtsLang, number>();
  let latin = 0;
  let indic = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a) || (cp >= 0xc0 && cp <= 0x24f)) {
      latin++;
      continue;
    }
    for (const [from, to, lang] of SCRIPT_LANG) {
      // Count letters only, not digits (0x66-0x6f), signs or punctuation inside the block.
      const off = cp - from;
      if (cp >= from && cp <= to && off >= 0x05 && !(off >= 0x66 && off <= 0x6f)) {
        counts.set(lang, (counts.get(lang) ?? 0) + 1);
        indic++;
        break;
      }
    }
  }
  if (!latin && !indic) return null;
  if (indic && indic >= (latin + indic) * INDIC_SHARE) {
    let best: TtsLang = 'hi-IN';
    let bestCount = -1;
    for (const [lang, n] of counts) {
      if (n > bestCount) {
        best = lang;
        bestCount = n;
      }
    }
    return best;
  }
  return 'latin';
}

/**
 * The voice language for what the user just said. The script of the transcript is more reliable than the
 * recogniser's own label, which tags a lot of Indian-accented English as Hindi. Returns null if there is
 * nothing to go on (so the caller keeps the language it already has).
 */
/** Romanised (Latin-letter) Marathi and Hindi words. Used only when the text has no Indic script at all. */
const ROMAN_MARATHI = /\b(tumhi|tumhala|tumhe|kon|ahat|aahat|aahe|ahe|mala|majha|mazha|kay|kasa|kashi|nahi|bola|sanga|aamhi|pahije|madhe|tumcha|tumchi)\b/gi;
const ROMAN_HINDI = /\b(aap|kya|hai|hain|kaun|mujhe|mera|meri|kyun|bataiye|kaise|kahan|hum|tum)\b/gi;

/** Marathi or Hindi typed in English letters ("tumhi kon ahat", "aap kaun hain"), judged by its words. */
export function romanLanguage(text: string): 'mr-IN' | 'hi-IN' | null {
  const mr = (text.match(ROMAN_MARATHI) ?? []).length;
  const hi = (text.match(ROMAN_HINDI) ?? []).length;
  if (mr >= 2 || (mr > hi && mr >= 1)) return 'mr-IN';
  if (hi >= 2 || (hi > mr && hi >= 1)) return 'hi-IN';
  return null;
}

/** Words that only Marathi uses (Hindi has है, था, किया, आप, चाहिए, मेरा where Marathi has आहे, होता, केले, तुम्ही, पाहिजे, माझा). */
const MARATHI_WORDS = /(?:^|[\s,।?!])(?:आहे|आहेत|आहात|आहोत|होता|होती|होते|केले|केली|झाले|झाली|पाहिजे|माझा|माझी|माझे|तुम्ही|तुमचा|तुमची|आम्ही|सांगा|बोला|मराठी|सांगतो|करतो|करते)(?=[\s,।?!]|$)/g;
/** Words that only Hindi uses in the same places. */
const HINDI_WORDS = /(?:^|[\s,।?!])(?:है|हैं|था|थी|थे|किया|किये|हुआ|हुई|चाहिए|मेरा|मेरी|मेरे|आप|बताइए|बताएं|कीजिए|करता|करती|हिंदी)(?=[\s,।?!]|$)/g;

/** Devanagari is shared by Hindi and Marathi; the words used decide which one was spoken. */
function devanagariLanguage(text: string): TtsLang {
  const mr = (text.match(MARATHI_WORDS) ?? []).length;
  const hi = (text.match(HINDI_WORDS) ?? []).length;
  return mr > hi ? 'mr-IN' : 'hi-IN';
}

export function languageOfSpeech(text: string, label: string): TtsLang | null {
  const guess = scriptLanguage(text);
  if (guess === 'latin') return 'en-IN';
  // The recogniser's own label wins when it names Marathi; otherwise the words decide.
  if (guess === 'hi-IN' && label === 'mr-IN') return 'mr-IN';
  if (guess === 'hi-IN') return devanagariLanguage(text);
  if (guess) return guess;
  return label in DIGITS ? (label as TtsLang) : null;
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** Digit groups of two or more, split by single spaces or dashes: a candidate phone number. */
const PHONE = /(?<![\d₹])(?<!₹ )\+?\d{2,}(?:[ -]\d{2,})*(?!\d)/g;
/** 12-05-2026 is a date, not a phone number. */
const DATE = /^\d{1,2}[ -]\d{1,2}[ -]\d{2,4}$/;
/** Landlines have 8 digits and mobiles 10; with 0 or 91 in front that is up to 13. Longer than that is not a phone number. */
const MIN_DIGITS = 8;
const MAX_DIGITS = 13;
function groups(digits: string, hadSeparators: boolean, original: string): string[] {
  if (hadSeparators) {
    const parts = original.replace(/^\+/, '').split(/[ -]+/).filter(Boolean);
    // "+91 98765 43210": the country code is always India's here, and saying it only slows the sentence down.
    if (parts[0] === '91' && parts.length > 1 && /^\+/.test(original)) parts.shift();
    return parts;
  }
  const d = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  const out: string[] = [];
  for (let i = 0; i < d.length; i += 5) out.push(d.slice(i, i + 5));
  // Never leave a lone digit as the last group: "98765 43210" and "98765 4321 0" sound very different.
  if (out.length > 1 && out[out.length - 1].length === 1) out.splice(-2, 2, out[out.length - 2] + out[out.length - 1]);
  return out;
}

/**
 * Rewrites every phone number in `sentence` as digit words, in the language the sentence is written in.
 * `fallback` is used only when the sentence has no letters to judge by (for example just "9876543210.").
 */
export function speakPhoneNumbers(sentence: string, fallback: string): string {
  const guess = scriptLanguage(sentence);
  const wanted = guess === 'latin' ? 'en-IN' : guess ?? fallback;
  // Devanagari is shared by Hindi and Marathi: the voice's own language settles it.
  const lang: TtsLang = wanted === 'hi-IN' && fallback === 'mr-IN' ? 'mr-IN' : wanted in DIGITS ? (wanted as TtsLang) : 'en-IN';
  const words = DIGITS[lang];

  return sentence.replace(PHONE, (match) => {
    const all = match.replace(/\D/g, '');
    if (all.length < MIN_DIGITS || all.length > MAX_DIGITS || DATE.test(match)) return match;
    const hadSeparators = /[ -]/.test(match);
    const parts = groups(all, hadSeparators, match);
    return parts.map((p) => [...p].map((c) => words[Number(c)]).join(' ')).join(', ');
  });
}
