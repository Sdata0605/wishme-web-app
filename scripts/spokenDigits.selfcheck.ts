/**
 * Self-check for how the voice relay says phone numbers and picks the voice language:
 *
 *   node --experimental-strip-types scripts/spokenDigits.selfcheck.ts
 *
 * Exits with an error (non-zero) on the first failing check.
 */

const m = await import(new URL('../supabase/functions/_shared/spokenDigits.ts', import.meta.url).href);

let checks = 0;
function check(name: string, ok: boolean): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${name}`);
}
const say = (s: string, fallback = 'hi-IN') => m.speakPhoneNumbers(s, fallback);

// The same number, in the language of the sentence it is in
check('English sentence: English digits even when the voice is Hindi',
  say('I will call Rahul on 98765 43210. Shall I go ahead?', 'hi-IN') === 'I will call Rahul on nine eight seven six five, four three two one zero. Shall I go ahead?');
check('English digits when the voice is Kannada too', say('Calling 9876543210 now', 'kn-IN') === 'Calling nine eight seven six five, four three two one zero now');
check('Kannada sentence: Kannada digits',
  say('ನಾನು 98765 43210 ಗೆ ಕರೆ ಮಾಡುತ್ತೇನೆ', 'hi-IN') === 'ನಾನು ಒಂಬತ್ತು ಎಂಟು ಏಳು ಆರು ಐದು, ನಾಲ್ಕು ಮೂರು ಎರಡು ಒಂದು ಸೊನ್ನೆ ಗೆ ಕರೆ ಮಾಡುತ್ತೇನೆ');
check('Hindi sentence: Hindi digits',
  say('मैं 9876543210 पर कॉल करूँगा', 'en-IN') === 'मैं नौ आठ सात छह पाँच, चार तीन दो एक शून्य पर कॉल करूँगा');
check('Marathi voice, Devanagari sentence: Marathi digits', say('मी 9876543210 वर फोन करतो', 'mr-IN').includes('नऊ आठ सात सहा पाच'));
check('Tamil sentence: Tamil digits', say('நான் 9876543210 அழைக்கிறேன்', 'hi-IN').includes('ஒன்பது எட்டு ஏழு ஆறு ஐந்து'));
check('Telugu sentence: Telugu digits', say('నేను 9876543210 కి కాల్ చేస్తాను', 'hi-IN').includes('తొమ్మిది ఎనిమిది ఏడు ఆరు ఐదు'));
check('Malayalam sentence: Malayalam digits', say('ഞാൻ 9876543210 വിളിക്കാം', 'hi-IN').includes('ഒമ്പത് എട്ട് ഏഴ് ആറ് അഞ്ച്'));
check('Bengali sentence: Bengali digits', say('আমি 9876543210 এ ফোন করব', 'hi-IN').includes('নয় আট সাত ছয় পাঁচ'));
check('Only digits: the voice language decides', say('9876543210', 'kn-IN') === 'ಒಂಬತ್ತು ಎಂಟು ಏಳು ಆರು ಐದು, ನಾಲ್ಕು ಮೂರು ಎರಡು ಒಂದು ಸೊನ್ನೆ');
check('Only digits, English voice', say('9876543210', 'en-IN') === 'nine eight seven six five, four three two one zero');

// Formats
check('country code is dropped', say('Call +91 98765 43210 please', 'en-IN') === 'Call nine eight seven six five, four three two one zero please');
check('country code without a plus and no spaces', say('Call 919876543210', 'en-IN') === 'Call nine eight seven six five, four three two one zero');
check('dashes', say('Call 98765-43210', 'en-IN') === 'Call nine eight seven six five, four three two one zero');
check('a landline keeps its own grouping', say('Call 080 2345 6789', 'en-IN') === 'Call zero eight zero, two three four five, six seven eight nine');
check('two numbers in one sentence',
  say('Use 9876543210 or 9123456780', 'en-IN') === 'Use nine eight seven six five, four three two one zero or nine one two three four, five six seven eight zero');

// Things that are NOT phone numbers stay exactly as they are
check('a date', say('It is on 12-05-2026', 'en-IN') === 'It is on 12-05-2026');
check('a year', say('In 2026 we will', 'en-IN') === 'In 2026 we will');
check('an amount', say('That costs ₹150000', 'en-IN') === 'That costs ₹150000');
check('an amount with a space', say('That costs ₹ 15000000', 'en-IN') === 'That costs ₹ 15000000');
check('a time', say('At 5:30 pm, 2 tickets', 'en-IN') === 'At 5:30 pm, 2 tickets');
check('an OTP-length number', say('Code 123456', 'en-IN') === 'Code 123456');
check('a card-length number', say('Card 4111 1111 1111 1111', 'en-IN') === 'Card 4111 1111 1111 1111');
check('no digits', say('Hello there', 'en-IN') === 'Hello there');

// Which language the user is speaking
check('English text is English even if the recogniser said Hindi', m.languageOfSpeech('Call Rahul please', 'hi-IN') === 'en-IN');
check('Kannada text', m.languageOfSpeech('ರಾಹುಲ್ ಗೆ ಕರೆ ಮಾಡಿ', 'hi-IN') === 'kn-IN');
check('Hindi text', m.languageOfSpeech('राहुल को कॉल करो', 'en-IN') === 'hi-IN');
check('Devanagari with a Marathi label is Marathi', m.languageOfSpeech('राहुलला फोन कर', 'mr-IN') === 'mr-IN');
check('Tamil text', m.languageOfSpeech('ராகுலை அழை', 'hi-IN') === 'ta-IN');
check('mostly Hindi with an English app name is Hindi', m.languageOfSpeech('मुझे WhatsApp खोलना है', 'en-IN') === 'hi-IN');
check('mostly English with one Hindi word is English', m.languageOfSpeech('Please open WhatsApp kholo now and then', 'hi-IN') === 'en-IN');
check('digits only fall back to the label', m.languageOfSpeech('9876543210', 'kn-IN') === 'kn-IN');
check('nothing to go on', m.languageOfSpeech('...', 'xx-XX') === null);

console.log(`spokenDigits: all ${checks} checks passed`);
