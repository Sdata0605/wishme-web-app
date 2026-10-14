/**
 * Sarvam bridge for a phone call. Unlike Gemini, Sarvam is three services chained together:
 *
 *   person's voice ──(mu-law 8k → PCM 16k)──► speech-to-text ──► chat model ──► text-to-speech
 *   person's ear   ◄──(PCM 24k → mu-law 8k)──────────────────────────────────────────┘
 *
 * Each finished sentence is spoken as soon as the model produces it, so the person does not wait
 * for the whole answer. The same report_outcome / end_call tools as the Gemini bridge are used.
 */

import NodeWebSocket from 'npm:ws';
import { PhoneEncoder, phoneToEngine } from '../_shared/callAudio.ts';
import { speakPhoneNumbers } from '../_shared/spokenDigits.ts';
import { CALL_TOOLS, callSystemPrompt, openingLine, type CallBrief } from '../_shared/callPrompt.ts';
import type { Bridge, BridgeEvents, InboundFormat } from './bridge.ts';

const STT_URL =
  'wss://api.sarvam.ai/speech-to-text-realtime/ws?model=saaras:v3-realtime&sample_rate=16000&encoding=linear16&stream_type=fast&endpointing=vad&silence_duration_ms=400&language_code=';
const TTS_URL = 'wss://api.sarvam.ai/text-to-speech/ws?send_completion_event=true';
const CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions';

interface Sock {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

/** Supabase's runtime cannot put headers on the built-in WebSocket, so the `ws` package is used. */
function openSarvamSocket(url: string, header: string, key: string): Sock {
  const ws = new NodeWebSocket(url, { headers: { [header]: key } });
  const sock: Sock = {
    readyState: 0,
    send: (d) => ws.send(d),
    close: () => ws.close(),
    onopen: null, onmessage: null, onclose: null, onerror: null,
  };
  ws.on('open', () => { sock.readyState = 1; sock.onopen?.(); });
  ws.on('message', (data: unknown, isBinary: boolean) => sock.onmessage?.({ data: isBinary ? '' : String(data) }));
  ws.on('close', () => { sock.readyState = 3; sock.onclose?.(); });
  ws.on('error', () => sock.onerror?.());
  return sock;
}

type Json = Record<string, unknown>;

/** A Sarvam voice: the speech model and a speaker that belongs to it (a speaker from the other model is refused). */
export interface SarvamVoice {
  model: string;
  speaker: string;
}

const toOpenAiTools = (decls: typeof CALL_TOOLS) =>
  decls.map((d) => ({
    type: 'function',
    function: {
      name: d.name,
      description: d.description,
      parameters: JSON.parse(JSON.stringify(d.parameters).replace(/"type":"([A-Z]+)"/g, (_m, t) => `"type":"${String(t).toLowerCase()}"`)),
    },
  }));

export class SarvamCallBridge implements Bridge {
  private stt: Sock | null = null;
  private tts: Sock | null = null;
  private sttQueue: string[] = [];
  private messages: Json[] = [];
  private ttsLang: string;
  private closed = false;
  /** Bumped whenever the person interrupts, so stale audio and replies are dropped. */
  private gen = 0;
  private abort: AbortController | null = null;
  private speaking = 0;
  private playUntil = 0;
  private inbound: InboundFormat = { encoding: 'audio/x-mulaw', sampleRate: 8000 };
  /** The voice in use. If Sarvam refuses it before it has ever spoken, the fallback voice takes over. */
  private voice: SarvamVoice;
  private voiceWorked = false;
  private usedFallback = false;
  /** Everything sent to the voice that has not finished yet, so it can be said again if the voice is swapped. */
  private unfinished: { text: string; gen: number }[] = [];
  private phone = new PhoneEncoder(24000);
  /** Settles when the current speech connection has opened (or failed): a sentence must never be sent before. */
  private ttsReady: Promise<void> = Promise.resolve();
  private pinger: ReturnType<typeof setInterval> | null = null;

  constructor(
    private brief: CallBrief,
    private opts: { apiKey: string; model: string; voice: SarvamVoice; fallbackVoice?: SarvamVoice },
    private events: BridgeEvents,
  ) {
    this.voice = opts.voice;
    this.ttsLang = brief.language === 'english' ? 'en-IN' : 'hi-IN';
    this.messages = [{ role: 'system', content: callSystemPrompt(brief) }];
  }

  async start(): Promise<void> {
    this.connectStt();
    await this.connectTts();
    // Sarvam closes a speech connection that sits idle for about a minute; keep it open between turns so the
    // next sentence never waits for a reconnect.
    this.pinger = setInterval(() => {
      if (this.tts?.readyState === 1) this.tts.send(JSON.stringify({ type: 'ping' }));
    }, 20_000);
  }

  greet() {
    const line = openingLine(this.brief);
    this.messages.push({ role: 'assistant', content: line });
    this.events.onLine('assistant', line);
    void this.speak(line, this.gen);
  }

  setInboundFormat(format: InboundFormat) {
    this.inbound = format;
  }

  onPhoneAudio(b64: string) {
    if (this.closed) return;
    // Whatever the phone sends → PCM 16 kHz, which is what the recogniser expects.
    const pcm16k = phoneToEngine(b64, this.inbound.encoding, this.inbound.sampleRate);
    const frame = JSON.stringify({ event: 'audio_input', audio: pcm16k });
    if (this.stt?.readyState === 1) this.stt.send(frame);
    else if (this.sttQueue.length < 100) this.sttQueue.push(frame);
  }

  say(text: string) {
    this.messages.push({ role: 'user', content: `[Note to you, not spoken by the other person] ${text}` });
    void this.runTurn();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.gen++;
    this.abort?.abort();
    if (this.pinger) clearInterval(this.pinger);
    for (const s of [this.stt, this.tts]) {
      try { s?.close(); } catch { /* already closed */ }
    }
  }

  private isSpeaking() {
    return this.abort !== null || this.speaking > 0 || Date.now() < this.playUntil;
  }

  // ─── Hearing ───────────────────────────────────────────────────────────────

  private connectStt() {
    const lang = this.brief.language === 'english' ? 'en-IN' : this.brief.language === 'hindi' ? 'hi-IN' : 'auto';
    const ws = openSarvamSocket(`${STT_URL}${lang}`, 'api-subscription-key', this.opts.apiKey);
    this.stt = ws;
    ws.onopen = () => {
      for (const f of this.sttQueue.splice(0)) ws.send(f);
    };
    ws.onmessage = (e) => {
      let j: Json;
      try { j = JSON.parse(e.data); } catch { return; }
      if (j.event === 'vad.speech_start' && this.isSpeaking()) this.interrupt();
      else if (j.event === 'transcript.final' && typeof j.text === 'string') this.onHeard(j.text);
    };
    ws.onclose = () => {
      if (!this.closed) setTimeout(() => !this.closed && this.connectStt(), 300);
    };
    ws.onerror = () => {};
  }

  private onHeard(text: string) {
    const spoken = text.trim();
    if (spoken.length < 2) return;
    if (this.isSpeaking()) this.interrupt();
    this.events.onLine('user', spoken);
    this.messages.push({ role: 'user', content: spoken });
    void this.runTurn();
  }

  private interrupt() {
    this.gen++;
    this.abort?.abort();
    this.abort = null;
    this.speaking = 0;
    this.playUntil = 0;
    this.unfinished = [];
    this.phone.reset();
    this.events.onClearAudio();
    // Synthesis in flight cannot be cancelled: drop the socket and open a clean one.
    try { this.tts?.close(); } catch { /* already closed */ }
    this.tts = null;
    void this.connectTts();
  }

  // ─── Speaking ──────────────────────────────────────────────────────────────

  private connectTts(): Promise<void> {
    const ws = openSarvamSocket(
      `${TTS_URL}&model=${encodeURIComponent(this.voice.model)}`,
      'Api-Subscription-Key',
      this.opts.apiKey,
    );
    this.tts = ws;
    const ready = new Promise<void>((resolve) => {
      // Resolve whether it opens or fails, so a refused connection can never leave the call waiting forever.
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'config',
          data: {
            language_code: this.ttsLang, speaker: this.voice.speaker, pace: 1.0,
            speech_sample_rate: '24000', output_audio_codec: 'linear16', min_buffer_size: 30, max_chunk_length: 120,
          },
        }));
        resolve();
      };
      ws.onmessage = (e) => {
        let j: { type?: string; data?: { audio?: string; message?: string } };
        try { j = JSON.parse(e.data); } catch { return; }
        if (j.type === 'event') {
          this.speaking = Math.max(0, this.speaking - 1);
          this.unfinished.shift();
        } else if (j.type === 'audio' && j.data?.audio && this.tts === ws) {
          this.voiceWorked = true;
          // Sarvam speaks at 24 kHz; the phone needs mu-law at 8 kHz, filtered properly on the way down.
          const { payload, ms } = this.phone.encode(j.data.audio);
          this.playUntil = Math.max(Date.now(), this.playUntil) + ms;
          this.events.onSpeak(payload, ms);
        } else if (j.type === 'error') {
          console.error('[sarvam-call] speech error:', j.data?.message);
          if (this.tts === ws) this.voiceFailed(ws);
        }
      };
      ws.onclose = () => {
        if (this.tts === ws) {
          this.tts = null;
          if (!this.voiceWorked) this.voiceFailed(ws);
        }
        resolve();
      };
      ws.onerror = () => resolve();
    });
    this.ttsReady = ready;
    return ready;
  }

  /**
   * Sarvam refused the voice before it ever spoke (for instance a speaker that belongs to another model). Without a
   * fallback the call would be silent, so switch to the proven voice and say again what was waiting.
   */
  private voiceFailed(ws: Sock) {
    if (this.voiceWorked || this.usedFallback || !this.opts.fallbackVoice || this.closed) return;
    this.usedFallback = true;
    this.voice = this.opts.fallbackVoice;
    console.error(`[sarvam-call] switching to the fallback voice ${this.voice.model} / ${this.voice.speaker}`);
    const waiting = this.unfinished.filter((u) => u.gen === this.gen);
    this.unfinished = [];
    this.speaking = 0;
    try { ws.close(); } catch { /* already closed */ }
    this.tts = null;
    void (async () => {
      await this.connectTts();
      for (const u of waiting) this.sendToVoice(u.text, u.gen);
    })();
  }

  private sendToVoice(clean: string, gen: number) {
    if (gen !== this.gen || this.tts?.readyState !== 1) return;
    this.speaking++;
    this.unfinished.push({ text: clean, gen });
    this.tts.send(JSON.stringify({ type: 'text', data: { text: clean } }));
    this.tts.send(JSON.stringify({ type: 'flush' }));
  }

  private async speak(text: string, gen: number) {
    // Phone numbers are written out digit by digit in the language of the sentence, so the voice cannot
    // read them in the wrong one.
    const clean = speakPhoneNumbers(text.replace(/[*_`#]/g, '').trim(), this.ttsLang);
    if (!clean) return;
    if (!this.tts || this.tts.readyState > 1) await this.connectTts();
    else await this.ttsReady; // still opening (for instance right after an interruption): wait, do not drop the sentence
    this.sendToVoice(clean, gen);
  }

  // ─── Thinking ──────────────────────────────────────────────────────────────

  private async runTurn() {
    this.abort?.abort();
    const gen = ++this.gen;
    const abort = new AbortController();
    this.abort = abort;

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        signal: abort.signal,
        headers: { 'api-subscription-key': this.opts.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.opts.model,
          messages: this.messages,
          tools: toOpenAiTools(CALL_TOOLS),
          tool_choice: 'auto',
          temperature: 0.3,
          max_tokens: 300,
          reasoning_effort: 'low',
          stream: true,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`model error ${res.status}`);

      let content = '';
      let spokenUpTo = 0;
      const calls = new Map<number, { id: string; name: string; args: string }>();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      /** Speaks every complete sentence as soon as it arrives, so the reply starts sooner. */
      const speakReady = (final: boolean) => {
        let rest = content.slice(spokenUpTo);
        for (;;) {
          const m = rest.match(/^[\s\S]*?[.!?।\n]+(?=\s|$)/);
          if (!m) break;
          spokenUpTo += m[0].length;
          rest = content.slice(spokenUpTo);
          void this.speak(m[0], gen);
        }
        if (final && rest.trim()) {
          spokenUpTo = content.length;
          void this.speak(rest, gen);
        }
      };

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          let j: { choices?: { delta?: { content?: string; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[] };
          try { j = JSON.parse(payload); } catch { continue; }
          const d = j.choices?.[0]?.delta;
          if (!d) continue;
          if (d.content) {
            content += d.content;
            speakReady(false);
          }
          for (const tc of d.tool_calls ?? []) {
            const i = tc.index ?? 0;
            const cur = calls.get(i) ?? { id: '', name: '', args: '' };
            if (tc.id) cur.id = tc.id;
            if (tc.function?.name) cur.name = tc.function.name;
            if (tc.function?.arguments) cur.args += tc.function.arguments;
            calls.set(i, cur);
          }
        }
      }
      if (gen !== this.gen) return;
      speakReady(true);

      const said = content.trim();
      if (said) {
        this.events.onLine('assistant', said);
        this.messages.push({ role: 'assistant', content: said });
      }

      for (const c of calls.values()) {
        if (!c.name) continue;
        let args: Json = {};
        try { args = c.args ? JSON.parse(c.args) : {}; } catch { /* leave empty */ }
        if (c.name === 'report_outcome') this.events.onOutcome(args);
        else if (c.name === 'end_call') {
          // Let the goodbye finish playing first.
          setTimeout(() => this.events.onWantsToHangUp(), Math.max(0, this.playUntil - Date.now()) + 800);
        }
        this.messages.push({ role: 'assistant', content: null, tool_calls: [{ id: c.id || c.name, type: 'function', function: { name: c.name, arguments: c.args || '{}' } }] });
        this.messages.push({ role: 'tool', tool_call_id: c.id || c.name, content: '{"ok":true}' });
      }
    } catch (e) {
      if (gen === this.gen && !(e instanceof DOMException && e.name === 'AbortError')) {
        console.error('[sarvam-call] turn failed:', e instanceof Error ? e.message : e);
      }
    } finally {
      if (this.abort === abort) this.abort = null;
    }
  }
}
