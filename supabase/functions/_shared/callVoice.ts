/**
 * Which Sarvam voice speaks on a phone call.
 *
 * Sarvam has two speech models, and a speaker belongs to exactly one of them: asking `bulbul:v4-flash` for the old
 * speaker "ritu" is refused outright (and a refused voice means a silent call). So the model and the speaker are
 * always chosen together here, and the proven voice (`bulbul:v3` / ritu) is kept as the fallback.
 *
 * The admin can change the choice without a code change, through platform_settings:
 *   ai_call_sarvam_model             bulbul:v4-flash (default) or bulbul:v3
 *   ai_call_sarvam_speaker_english   a speaker of that model, for calls in English
 *   ai_call_sarvam_speaker_hindi     a speaker of that model, for calls in Hindi or Hinglish
 */

export const V3 = 'bulbul:v3';
export const V4 = 'bulbul:v4-flash';

export interface SarvamVoice {
  model: string;
  speaker: string;
}

type Group = 'english' | 'hindi';

/** Conversational-style voices: the style meant for two people talking, rather than announcements or ads. */
const DEFAULTS: Record<string, Record<Group, string>> = {
  [V4]: { english: 'sophia_en_conversational', hindi: 'ritu_hi_conversation' },
  [V3]: { english: 'ritu', hindi: 'ritu' },
};

const SPEAKER_FORMAT = /^[a-z0-9_]{2,40}$/;

/** First names of Sarvam's male speakers; everyone else is treated as a woman's voice. */
const MALE = new Set([
  'aayan', 'aditya', 'advait', 'amit', 'anand', 'aravind', 'aryaman', 'ashok', 'ashutosh', 'ashwin', 'bhavik', 'chetan',
  'chirag', 'dev', 'deven', 'girish', 'gokul', 'harpreet', 'jaspal', 'kabir', 'kalpit', 'kunal', 'mahesh', 'manan',
  'mani', 'mohit', 'mukul', 'nachiket', 'nilesh', 'ojas', 'rahul', 'ratan', 'rehan', 'rohan', 'rustom', 'shubh',
  'soham', 'sumit', 'tarun', 'vaibhav', 'varun', 'vijay', 'vipul',
]);

export function speakerGender(speaker: string): 'female' | 'male' {
  return MALE.has(speaker.split('_')[0]) ? 'male' : 'female';
}

export interface VoiceChoice {
  voice: SarvamVoice;
  /** Used instead if Sarvam refuses `voice`; absent when `voice` already is the proven one. */
  fallbackVoice?: SarvamVoice;
  gender: 'female' | 'male';
}

export function chooseSarvamVoice(
  setting: (key: string) => string | undefined | null,
  language: 'english' | 'hindi' | 'hinglish',
): VoiceChoice {
  const model = String(setting('ai_call_sarvam_model') ?? '').trim() === V3 ? V3 : V4;
  const group: Group = language === 'english' ? 'english' : 'hindi';
  const custom = String(setting(`ai_call_sarvam_speaker_${group}`) ?? '').trim().toLowerCase();
  const speaker = SPEAKER_FORMAT.test(custom) ? custom : DEFAULTS[model][group];

  const voice: SarvamVoice = { model, speaker };
  const proven: SarvamVoice = { model: V3, speaker: DEFAULTS[V3][group] };
  const isProven = voice.model === proven.model && voice.speaker === proven.speaker;
  return { voice, fallbackVoice: isProven ? undefined : proven, gender: speakerGender(speaker) };
}
