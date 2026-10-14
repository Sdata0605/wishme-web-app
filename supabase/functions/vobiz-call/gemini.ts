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
import type { Bridge, BridgeEvents, InboundFormat } from './bridge.ts';

const WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export class GeminiCallBridge implements Bridge {
  private ws: WebSocket | null = null;
  private ready = false;
  private closed = false;
  private queue: string[] = [];
  private inbound: InboundFormat = { encoding: 'audio/x-mulaw', sampleRate: 8000 };
  private userBuf = '';
  private aiBuf = '';
  /** One per sample rate Gemini sends, each keeping its filter running from chunk to chunk. */
  private encoders = new Map<number, PhoneEncoder>();

  constructor(
    private brief: CallBrief,
    private opts: { apiKey: string; model: string; voice: string },
    private events: BridgeEvents,
  ) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}?key=${encodeURIComponent(this.opts.apiKey)}`);
      this.ws = ws;
      const giveUp = setTimeout(() => reject(new Error('Gemini did not answer in time')), 12_000);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          setup: {
            model: `models/${this.opts.model}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.opts.voice } } },
            },
            systemInstruction: { parts: [{ text: callSystemPrompt(this.brief) }] },
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
            tools: [{ functionDeclarations: CALL_TOOLS }],
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
        if (msg.setupComplete) {
          clearTimeout(giveUp);
          this.ready = true;
          for (const a of this.queue.splice(0)) this.sendAudio(a);
          resolve();
          return;
        }
        this.onMessage(msg);
      };

      ws.onerror = () => {
        clearTimeout(giveUp);
        if (!this.ready) reject(new Error('Could not reach Gemini'));
      };
      ws.onclose = () => {
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
    if (this.userBuf.trim()) this.events.onLine('user', this.userBuf.trim());
    this.userBuf = '';
  }

  private flushAi() {
    if (this.aiBuf.trim()) this.events.onLine('assistant', this.aiBuf.trim());
    this.aiBuf = '';
  }
}
