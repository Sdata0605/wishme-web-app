/**
 * Gemini Live bridge for a phone call.
 *
 *   person's voice ──(mu-law 8 kHz)──► here ──(PCM 16 kHz)──► Gemini Live
 *   person's ear   ◄──(mu-law 8 kHz)── here ◄──(PCM 24 kHz)── Gemini Live
 *
 * Gemini does the hearing, thinking and speaking in one session, which keeps the pauses short.
 */

import { PhoneEncoder, phoneToEngine } from '../_shared/callAudio.ts';
import { CALL_TOOLS, callSystemPrompt, openingLine, type CallBrief } from '../_shared/callPrompt.ts';
const LANGUAGE_NAME: Record<string, string> = {
  'en-IN': 'English', 'hi-IN': 'Hindi', 'mr-IN': 'Marathi', 'bn-IN': 'Bengali', 'gu-IN': 'Gujarati', 'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam', 'od-IN': 'Odia', 'pa-IN': 'Punjabi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
};

/**
 * The model hears the caller, so it is the one to say which language they switched to. (Judging the transcript
 * by its script failed: romanised Marathi or Hindi came out as "English" and the model was told to speak English.)
 */
const SET_LANGUAGE = {
  name: 'set_language',
  description: 'Call this as soon as the other person speaks a different language from the one you are using (any Indian language, or English), passing the name of that language. Then speak only that language from your next sentence.',
  parameters: {
    type: 'OBJECT',
    properties: { language: { type: 'STRING', description: 'The language name, for example Marathi, Kannada, Tamil, Hindi or English.' } },
    required: ['language'],
  },
};
import type { Bridge, BridgeEvents, InboundFormat } from './bridge.ts';

const WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
/** The app's in-app assistant connects here, with a one-time token; the calls now do the same. */
const CONSTRAINED_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';

/** Mints a single-use Live token the way the in-app voice token function does. Null if Google refuses. */
async function mintLiveToken(apiKey: string): Promise<string | null> {
  const now = Date.now();
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 10 * 60_000).toISOString(),
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
      }),
      signal: AbortSignal.timeout(4000),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[gemini] token request failed: ${res.status} ${text.slice(0, 200)}`);
      return null;
    }
    const name = (JSON.parse(text) as { name?: string }).name ?? null;
    console.log(`[gemini] token minted: ${name ? 'yes' : 'no name in reply'}`);
    return name;
  } catch (e) {
    console.error('[gemini] token request threw:', e instanceof Error ? e.message : e);
    return null;
  }
}

export class GeminiCallBridge implements Bridge {
  private ws: WebSocket | null = null;
  private ready = false;
  private closed = false;
  private queue: string[] = [];
  private inbound: InboundFormat = { encoding: 'audio/x-mulaw', sampleRate: 8000 };
  private userBuf = '';
  private aiBuf = '';
  /** The language the model was last told to speak. Gemini only follows a language it is told about. */
  private replyLang = '';
  /** One per sample rate Gemini sends, each keeping its filter running from chunk to chunk. */
  private encoders = new Map<number, PhoneEncoder>();

  constructor(
    private brief: CallBrief,
    private opts: { apiKey: string; model: string; voice: string },
    private events: BridgeEvents,
  ) {}

  async start(): Promise<void> {
    // Same connection as the in-app assistant: a one-time token on the constrained endpoint. If the token
    // cannot be minted, the API key on the plain endpoint is tried as before.
    const token = await mintLiveToken(this.opts.apiKey);
    const url = token
      ? `${CONSTRAINED_WS_URL}?access_token=${encodeURIComponent(token)}`
      : `${WS_URL}?key=${encodeURIComponent(this.opts.apiKey)}`;
    console.log(`[gemini] connecting via ${token ? 'token (constrained)' : 'API key (plain)'}`);
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      // Gemini normally confirms its setup in well under 2 s. Waiting longer only delays the fallback voice.
      const giveUp = setTimeout(() => {
        console.error('[gemini] no setupComplete within 4000 ms');
        reject(new Error('Gemini did not answer in time'));
      }, 4_000);
      let messagesSeen = 0;

      ws.onopen = () => {
        console.log('[gemini] socket open, sending setup');
        ws.send(JSON.stringify({
          setup: {
            model: `models/${this.opts.model}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.opts.voice } } },
            },
            systemInstruction: { parts: [{ text: `${callSystemPrompt(this.brief)}

LANGUAGE TOOL: whenever the other person switches to another language, call set_language with its name before you reply, and then keep to that language until they switch again.` }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            // A phone line has no echo cancellation and plenty of hiss, so only clear speech should
            // count as the person starting to talk; once they stop, reply quickly.
            realtimeInputConfig: {
              automaticActivityDetection: {
                startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
                endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
                prefixPaddingMs: 60,
                silenceDurationMs: 400,
              },
            },
            tools: [{ functionDeclarations: [...CALL_TOOLS, SET_LANGUAGE] }],
          },
        }));
      };

      ws.onmessage = (e) => {
        let msg: Record<string, any>;
        try {
          msg = JSON.parse(typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data as ArrayBuffer));
        } catch {
          return;
        }
        // The first messages say what Gemini is doing, so a stuck setup shows up in the logs.
        if (messagesSeen++ < 3 && !msg.setupComplete) console.log('[gemini] message:', Object.keys(msg).join(','));
        if (msg.setupComplete) {
          clearTimeout(giveUp);
          console.log('[gemini] setupComplete');
          this.ready = true;
          for (const a of this.queue.splice(0)) this.sendAudio(a);
          resolve();
          return;
        }
        this.onMessage(msg);
      };

      ws.onerror = (e: Event) => {
        console.error('[gemini] socket error', (e as ErrorEvent).message ?? '');
        clearTimeout(giveUp);
        if (!this.ready) reject(new Error('Could not reach Gemini'));
      };
      ws.onclose = (e: CloseEvent) => {
        console.error(`[gemini] socket closed, code ${e.code}, reason: ${e.reason || '(none)'}`);
        clearTimeout(giveUp);
        if (!this.ready) reject(new Error('Gemini closed the connection during setup'));
        else this.events.onEnded('assistant-ended-call');
      };
    });
  }

  setInboundFormat(format: InboundFormat) {
    this.inbound = format;
  }

  /** Makes the AI speak the agreed opening line the moment the audio path is ready. */
  greet() {
    const line = openingLine(this.brief);
    this.send({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text: `The call has just connected. Say this opening line now, word for word, then wait for the reply: "${line}"` }] }],
        turnComplete: true,
      },
    });
  }

  onPhoneAudio(b64: string) {
    if (this.closed) return;
    const converted = phoneToEngine(b64, this.inbound.encoding, this.inbound.sampleRate);
    if (!this.ready) {
      if (this.queue.length < 400) this.queue.push(converted);
      return;
    }
    this.sendAudio(converted);
  }

  say(text: string) {
    this.send({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.flushUser();
    this.flushAi();
    try { this.ws?.close(); } catch { /* already closed */ }
  }

  // ─── internals ─────────────────────────────────────────────────────────────

  private sendAudio(data: string) {
    this.send({ realtimeInput: { audio: { data, mimeType: 'audio/pcm;rate=16000' } } });
  }

  private send(payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  private onMessage(msg: Record<string, any>) {
    for (const fc of msg.toolCall?.functionCalls ?? []) {
      if (fc.name === 'report_outcome') this.events.onOutcome(fc.args ?? {});
      else if (fc.name === 'end_call') this.events.onWantsToHangUp();
      else if (fc.name === 'set_language') this.changeLanguage(String(fc.args?.language ?? ''));
      this.send({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name, response: { ok: true } }] } });
    }

    const sc = msg.serverContent;
    if (!sc) return;

    if (sc.inputTranscription?.text) {
      this.flushAi();
      this.userBuf += sc.inputTranscription.text;
    }
    if (sc.outputTranscription?.text) {
      this.flushUser();
      this.aiBuf += sc.outputTranscription.text;
    }
    if (sc.interrupted) {
      this.events.onClearAudio();
      this.flushAi();
      for (const e of this.encoders.values()) e.reset();
    }

    for (const part of sc.modelTurn?.parts ?? []) {
      const data = part.inlineData?.data;
      if (!data) continue;
      const mime: string = part.inlineData.mimeType ?? '';
      const rate = mime.includes('16000') ? 16000 : mime.includes('8000') ? 8000 : 24000;
      let enc = this.encoders.get(rate);
      if (!enc) this.encoders.set(rate, (enc = new PhoneEncoder(rate)));
      const { payload, ms } = enc.encode(data);
      this.events.onSpeak(payload, ms);
    }

    if (sc.turnComplete) {
      this.flushUser();
      this.flushAi();
    }
  }

  private flushUser() {
    const said = this.userBuf.trim();
    if (said) this.events.onLine('user', said);
    this.userBuf = '';
  }

  /** Applies a set_language call: the model is told which language to speak from now on. */
  private changeLanguage(name: string) {
    const code = Object.keys(LANGUAGE_NAME).find((c) => LANGUAGE_NAME[c].toLowerCase() === name.trim().toLowerCase());
    if (!code || code === this.replyLang) return;
    this.replyLang = code;
    const lang = LANGUAGE_NAME[code];
    this.send({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text: `[Instruction from the call system, not spoken by the other person] Speak only in ${lang} from now on, starting with your very next sentence, and keep doing so for the rest of the call even if they mix in other languages. Write it in its own script.${code === 'en-IN' ? ' Speak English with an Indian English accent, not American or British.' : ''}` }] }],
        turnComplete: false,
      },
    });
  }

  private flushAi() {
    if (this.aiBuf.trim()) this.events.onLine('assistant', this.aiBuf.trim());
    this.aiBuf = '';
  }
}
