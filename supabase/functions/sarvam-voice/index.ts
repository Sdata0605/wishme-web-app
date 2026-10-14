/**
 * sarvam-voice — real-time voice relay between the WishMe app and Sarvam AI.
 *
 *   phone ──WebSocket──► this function ──► Sarvam speech-to-text (live)
 *                                      ──► Sarvam chat model (streaming, with tools)
 *                                      ──► Sarvam text-to-speech (streaming)
 *   phone ◄── audio / transcripts / tool calls ◄──
 *
 * The Sarvam key never leaves the server. Tools (open a screen, tap, call...) run on the
 * phone: the model's tool calls are forwarded to the app and the results are fed back.
 *
 * Phone → relay (JSON text frames):
 *   {type:'auth', token}                        Supabase user access token (first message)
 *   {type:'start', system, tools, voice, language, greeting?, history?}
 *   {type:'audio', data}                        base64 PCM16 mono 16 kHz microphone audio
 *   {type:'tool_result', id, result}
 *   {type:'text', text}                         typed text instead of speech
 *   {type:'end'}
 * Relay → phone:
 *   {type:'ready'} {type:'transcript', role, text, final} {type:'audio', data}   (PCM16 mono 24 kHz)
 *   {type:'tool_call', id, name, args} {type:'interrupted'} {type:'turn_complete'}
 *   {type:'metrics', ...} {type:'goaway'} {type:'error', message}
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import NodeWebSocket from 'npm:ws';
import { languageOfSpeech, speakPhoneNumbers } from '../_shared/spokenDigits.ts';

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

/** The Sarvam key: set from the admin panel (encrypted store) first, else the server secret. */
async function loadSarvamKey(): Promise<string> {
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data } = await db.rpc('ai_secret_get', { p_name: 'ai_sarvam_api_key' });
    if (typeof data === 'string' && data) return data;
  } catch { /* fall back to the server secret */ }
  return Deno.env.get('SARVAM_API_KEY') ?? '';
}
const LLM_MODEL = Deno.env.get('SARVAM_LLM_MODEL') ?? 'sarvam-105b-conversations';
// Supabase caps a function at 150 s (Free) / 400 s (paid); warn the app a little before.
const MAX_SESSION_MS = Number(Deno.env.get('SARVAM_MAX_SESSION_MS') ?? '0');

/** Supabase ends a function at a fixed age counted from when its worker booted, not from the call. */
const WORKER_BORN = Date.now();

const STT_URL =
  'wss://api.sarvam.ai/speech-to-text-realtime/ws?model=saaras:v3-realtime&sample_rate=16000&encoding=linear16&stream_type=fast&endpointing=vad&silence_duration_ms=400&language_code=';
/** Words the recognizer should expect from a voice-controlled WishMe session. */
const BASE_HINT =
  'WishMe app voice commands: tap, press, click, scroll, open, go back, call, wallet, flights, hotels, bus tickets, electricity bill, recharge, Fetch Bill, Continue. Apps: WhatsApp, YouTube, Instagram, Facebook, Flipkart, Paytm, PhonePe, Google Pay, Gmail, Maps, Camera.';

const TTS_URL = 'wss://api.sarvam.ai/text-to-speech/ws?model=bulbul:v3&send_completion_event=true';
const CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions';

const TTS_LANGS = new Set(['bn-IN', 'en-IN', 'gu-IN', 'hi-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN']);
const TOOL_TIMEOUT_MS = 25_000;
const MAX_TOOL_HOPS = 6;

type Json = Record<string, unknown>;
interface ToolCall { id: string; name: string; args: Json }

/** Gemini-style declarations (type: 'STRING') → OpenAI-style tools (type: 'string'). */
const lowerTypes = (s: unknown): unknown =>
  Array.isArray(s)
    ? s.map(lowerTypes)
    : s && typeof s === 'object'
      ? Object.fromEntries(
          Object.entries(s as Json).map(([k, v]) => [k, k === 'type' && typeof v === 'string' ? v.toLowerCase() : lowerTypes(v)]),
        )
      : s;

const toOpenAiTools = (decls: unknown[]) =>
  decls.map((d) => {
    const f = d as { name: string; description?: string; parameters?: unknown };
    return { type: 'function', function: { name: f.name, description: f.description ?? '', parameters: f.parameters ? lowerTypes(f.parameters) : { type: 'object', properties: {} } } };
  });

/** The small WebSocket surface this relay uses. */
interface Sock {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

/**
 * Opens an outbound WebSocket with the Sarvam key in a header. Supabase's Deno runtime has no
 * way to set headers on the built-in WebSocket, so this uses the `ws` package behind a
 * browser-style wrapper.
 */
/** Collapses whitespace and removes control characters. */
function cleanText(value: string, max: number): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function openSarvamSocket(url: string, header: string, key: string): Sock {
  const ws = new NodeWebSocket(url, { headers: { [header]: key } });
  const sock: Sock = {
    readyState: 0,
    send: (d) => ws.send(d),
    close: () => ws.close(),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  };
  ws.on('open', () => {
    sock.readyState = 1;
    sock.onopen?.();
  });
  ws.on('message', (data: unknown, isBinary: boolean) => sock.onmessage?.({ data: isBinary ? '' : String(data) }));
  ws.on('close', () => {
    sock.readyState = 3;
    sock.onclose?.();
  });
  ws.on('error', () => sock.onerror?.());
  return sock;
}

class Session {
  private authed = false;
  private authPromise: Promise<boolean> | null = null;
  private started = false;
  private closed = false;
  private startedAt = Date.now();

  private key = '';
  private system = '';
  private tools: unknown[] = [];
  private voice = 'shubh';
  private language = 'auto';
  private messages: Json[] = [];

  private stt: Sock | null = null;
  private sttQueue: string[] = [];
  private tts: Sock | null = null;
  private ttsLang = '';
  /** True once the user has asked for a language outright, so detection stops overriding it. */
  private languagePinned = false;
  private ttsReady: Promise<void> | null = null;
  private detectedLang = '';
  /** Labels of the buttons and fields on the user's current screen, to help the recognizer hear them. */
  private screenTerms: string[] = [];

  /** Bumped on every interruption/new turn so stale audio and replies are dropped. */
  private gen = 0;
  private abort: AbortController | null = null;
  /** When the phone will have finished playing everything we've sent (it plays slower than we send). */
  private playUntil = 0;
  /** True once the current turn has said or done something the user can notice. */
  private turnVisible = false;
  private ttsPinger: ReturnType<typeof setInterval> | null = null;
  /** Sentences sent to the synthesiser that have not finished yet. */
  private inflight = 0;
  private turnT0 = 0;
  private firstAudioSent = false;
  private pendingTools = new Map<string, (r: unknown) => void>();

  constructor(private phone: WebSocket, private onClosed: () => void) {
    phone.onmessage = (e) =>
      this.onPhone(String(e.data)).catch((err) => {
        console.error('[sarvam-voice] handler failed:', err);
        this.fail(`Relay error: ${err instanceof Error ? err.message : String(err)}`);
      });
    phone.onclose = () => this.close();
    phone.onerror = () => this.close();
    // Nobody authenticates? Hang up.
    setTimeout(() => !this.authed && this.fail('Authentication timed out.'), 8000);
  }

  /**
   * The user hears the assistant while a reply is being made, being synthesised, or still
   * queued in the phone's speaker. The last part matters: audio arrives far faster than it plays.
   */
  private isSpeakingNow() {
    return this.abort !== null || this.inflight > 0 || Date.now() < this.playUntil;
  }

  // ─── Phone side ────────────────────────────────────────────────────────────

  private send(msg: Json) {
    if (this.phone.readyState === WebSocket.OPEN) this.phone.send(JSON.stringify(msg));
  }

  private fail(message: string) {
    this.send({ type: 'error', message });
    this.close();
  }

  private async onPhone(raw: string) {
    let m: Json;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }

    if (m.type === 'audio') {
      this.forwardAudio(String(m.data ?? ''));
      return;
    }
    if (!this.authed) {
      if (m.type === 'auth') {
        this.authPromise = this.authenticate(m).then((ok) => {
          if (ok) this.authed = true;
          return ok;
        });
        if (!(await this.authPromise)) return this.fail('Unauthorized');
        return;
      }
      // The app sends its login and the session setup back to back. Checking the login takes a
      // moment, so frames that arrive meanwhile must wait for it instead of being dropped.
      if (!this.authPromise || !(await this.authPromise)) return;
    }

    switch (m.type) {
      case 'start':
        await this.start(m);
        break;
      case 'tool_result': {
        const resolve = this.pendingTools.get(String(m.id));
        if (resolve) {
          this.pendingTools.delete(String(m.id));
          resolve(m.result);
        }
        break;
      }
      case 'text':
        if (typeof m.text === 'string') this.onUserText(m.text, '');
        break;
      case 'notify':
        // Something the assistant should tell the user (e.g. a phone call it made has finished).
        if (typeof m.text === 'string' && m.text.trim()) void this.onAppNotice(m.text);
        break;
      case 'set_language':
        // The user asked for a different language. It is a deliberate choice, so it outranks
        // whatever the recogniser detects from here on.
        if (typeof m.language === 'string' && TTS_LANGS.has(m.language)) this.switchLanguage(m.language, true);
        break;
      case 'interrupt':
        // The phone heard the user over the assistant: stop talking even if we think we're done.
        if (this.isSpeakingNow()) this.interrupt();
        break;
      case 'end':
        this.close();
        break;
    }
  }

  private async authenticate(m: Json): Promise<boolean> {
    if (typeof m.token !== 'string' || !m.token) return false;
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data, error } = await supabase.auth.getUser(m.token);
      return !error && !!data.user;
    } catch {
      return false;
    }
  }

  private async start(m: Json) {
    if (this.started) return;
    this.key = await loadSarvamKey();
    if (!this.key) return this.fail('Voice service is not configured.');
    this.started = true;
    this.system = String(m.system ?? '');
    this.tools = Array.isArray(m.tools) ? m.tools : [];
    this.voice = String(m.voice ?? 'shubh').toLowerCase();
    this.language = String(m.language ?? 'auto');
    this.messages = [{ role: 'system', content: this.system }];
    if (Array.isArray(m.history)) {
      for (const h of m.history.slice(-10) as { role?: string; text?: string }[]) {
        if (h?.text) this.messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.text).slice(0, 400) });
      }
    }

    // A persona that always answers in one language keeps that voice; otherwise the voice follows the user.
    // (It used to start in Hindi for everybody, so an English speaker's first number was read in Hindi.)
    const fixedLang = ({ english: 'en-IN', hindi: 'hi-IN', hinglish: 'hi-IN' } as Record<string, string>)[this.language];
    this.ttsLang = fixedLang ?? 'en-IN';
    this.languagePinned = !!fixedLang;
    this.connectStt();
    void this.connectTts();
    this.send({ type: 'ready' });

    if (typeof m.greeting === 'string' && m.greeting) {
      this.messages.push({ role: 'assistant', content: m.greeting });
      this.turnT0 = Date.now();
      this.firstAudioSent = false;
      this.turnVisible = true;
      this.send({ type: 'transcript', role: 'assistant', text: m.greeting, final: true });
      await this.speak(m.greeting, this.gen, true);
    }

    // Keep the speech connection from idling out between replies (Sarvam closes it after a minute).
    this.ttsPinger = setInterval(() => {
      if (this.tts?.readyState === WebSocket.OPEN) this.tts.send(JSON.stringify({ type: 'ping' }));
    }, 20_000);

    // Warn the app shortly before this worker reaches its age limit so it can move to a fresh one.
    if (MAX_SESSION_MS > 0) {
      const delay = Math.max(500, WORKER_BORN + MAX_SESSION_MS - Date.now() - 8000);
      setTimeout(() => this.send({ type: 'goaway' }), delay);
    }
  }

  /**
   * Points the voice at another language. Sarvam synthesises per language and the setting is fixed
   * when the connection opens, so the only way to change it is to drop that connection and let the
   * next sentence build a fresh one.
   */
  private switchLanguage(code: string, pinned = false) {
    if (pinned) this.languagePinned = true;
    if (code === this.ttsLang) return;
    this.ttsLang = code;
    try {
      this.tts?.close();
    } catch { /* already closed */ }
    this.tts = null;
    this.ttsReady = null;
  }

  // ─── Speech in (Sarvam STT) ────────────────────────────────────────────────

  private connectStt() {
    // Always auto: the user may switch language mid-conversation, and pinning the recogniser to one
    // would leave it mishearing everything else.
    const lang = 'auto';
    const ws = openSarvamSocket(`${STT_URL}${lang}&prompt=${encodeURIComponent(this.sttPrompt())}`, 'api-subscription-key', this.key);
    this.stt = ws;
    ws.onopen = () => {
      for (const chunk of this.sttQueue) ws.send(chunk);
      this.sttQueue = [];
    };
    ws.onmessage = (e) => {
      let j: Json;
      try {
        j = JSON.parse(String(e.data));
      } catch {
        return;
      }
      switch (j.event) {
        case 'vad.speech_start':
          this.send({ type: 'vad', event: 'start', speaking: this.isSpeakingNow() });
          // The user started talking while we were answering: stop right away.
          if (this.isSpeakingNow()) this.interrupt();
          break;
        case 'vad.speech_end':
          this.send({ type: 'vad', event: 'end' });
          break;
        case 'transcript.partial':
          if (typeof j.text === 'string' && j.text) this.send({ type: 'transcript', role: 'user', text: j.text, final: false });
          break;
        case 'transcript.final':
          if (typeof j.text === 'string') this.onUserText(j.text, String(j.language_code ?? ''));
          break;
        case 'error':
          this.send({ type: 'error', message: `Speech recognition error: ${String(j.message ?? '')}`, fatal: !!j.is_fatal });
          break;
      }
    };
    ws.onclose = () => {
      if (!this.closed && this.started) setTimeout(() => !this.closed && this.connectStt(), 300);
    };
    ws.onerror = () => {};
  }

  /** Context hint for the recognizer: the usual commands plus what is on the screen right now. */
  private sttPrompt() {
    const screen = this.screenTerms.length ? ` On the screen now: ${this.screenTerms.join(', ')}.` : '';
    return `${BASE_HINT}${screen}`.slice(0, 600);
  }

  /** Reads button/field labels out of a screen tool's result and tells the recognizer about them. */
  private learnScreen(result: unknown) {
    try {
      this.learnScreenUnsafe(result);
    } catch (e) {
      console.error('[sarvam-voice] could not learn screen terms:', e); // hints are a bonus: never fail a call for them
    }
  }

  private learnScreenUnsafe(result: unknown) {
    const r = result as { screen?: { controls?: unknown[] }; controls?: unknown[]; elements?: { label?: unknown }[] } | null;
    const raw: string[] = [];
    for (const c of (r?.screen?.controls ?? r?.controls ?? []) as unknown[]) if (typeof c === 'string') raw.push(c);
    for (const e of r?.elements ?? []) if (e && typeof e.label === 'string') raw.push(e.label);
    const terms: string[] = [];
    for (const label of raw) {
      const t = label.replace(/^\d+:\s*/, '').replace(/\s*\[[^\]]*\]\s*$/, '').replace(/…$/, '').trim();
      if (t.length >= 2 && t.length <= 36 && !/unlabelled/i.test(t) && !terms.includes(t)) terms.push(t);
      if (terms.length >= 24) break;
    }
    if (!terms.length || terms.join('|') === this.screenTerms.join('|')) return;
    this.screenTerms = terms;
    // Applies from the next thing the user says.
    if (this.stt?.readyState === WebSocket.OPEN) this.stt.send(JSON.stringify({ event: 'config.update', prompt: this.sttPrompt() }));
  }

  private forwardAudio(b64: string) {
    if (!b64) return;
    const frame = `{"event":"audio_input","audio":"${b64}"}`;
    if (this.stt?.readyState === WebSocket.OPEN) this.stt.send(frame);
    else if (this.sttQueue.length < 60) this.sttQueue.push(frame);
  }

  // ─── Speech out (Sarvam TTS) ───────────────────────────────────────────────

  private connectTts(): Promise<void> {
    const ws = openSarvamSocket(TTS_URL, 'Api-Subscription-Key', this.key);
    this.tts = ws;
    const ready = new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'config',
            data: { model: 'bulbul:v3', language_code: this.ttsLang, speaker: this.voice, pace: 1.0, speech_sample_rate: '24000', output_audio_codec: 'linear16', min_buffer_size: 30, max_chunk_length: 120 },
          }),
        );
        resolve();
      };
    });
    ws.onmessage = (e) => {
      let j: { type?: string; data?: { audio?: string; message?: string } };
      try {
        j = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (j.type === 'event') {
        // One 'final' per flushed sentence.
        this.inflight = Math.max(0, this.inflight - 1);
      } else if (j.type === 'audio' && j.data?.audio) {
        // Drop audio from a socket we already replaced (the user interrupted that reply).
        if (this.tts !== ws) return;
        if (!this.firstAudioSent) {
          this.firstAudioSent = true;
          this.send({ type: 'metrics', tts_first_audio_ms: Date.now() - this.turnT0 });
        }
        // 16-bit mono at 24 kHz is 48 bytes per millisecond.
        const ms = (j.data.audio.length * 3) / 4 / 48;
        this.playUntil = Math.max(Date.now(), this.playUntil) + ms;
        this.turnVisible = true;
        this.send({ type: 'audio', data: j.data.audio, g: this.gen });
      } else if (j.type === 'error') {
        // Typically the connection idling out. Not worth bothering the user: reconnect on the next reply.
        console.error('[sarvam-voice] speech synthesis error:', j.data?.message);
        if (this.tts === ws) {
          try {
            ws.close();
          } catch { /* ignore */ }
        }
      }
    };
    ws.onclose = () => {
      if (this.tts === ws) {
        this.tts = null;
        this.ttsReady = null;
      }
    };
    ws.onerror = () => {};
    this.ttsReady = ready;
    return ready;
  }

  private async speak(text: string, gen: number, last = false) {
    // Phone numbers are written out digit by digit in the language of the sentence, so the voice cannot
    // read them in the wrong one (English speakers were being read their numbers in Hindi).
    const clean = speakPhoneNumbers(text.replace(/[*_`#]/g, '').trim(), this.ttsLang);
    if (!clean) return;
    if (!this.tts || this.tts.readyState > WebSocket.OPEN) await this.connectTts();
    await this.ttsReady;
    if (gen !== this.gen || this.tts?.readyState !== WebSocket.OPEN) return;
    this.inflight++;
    this.tts.send(JSON.stringify({ type: 'text', data: { text: clean } }));
    this.tts.send(JSON.stringify({ type: 'flush' }));
    void last;
  }

  // ─── Conversation ──────────────────────────────────────────────────────────

  private interrupt() {
    this.gen++;
    this.abort?.abort();
    this.abort = null;
    this.playUntil = 0;
    this.turnVisible = false;
    this.inflight = 0;
    // The old synthesis can't be cancelled: drop the socket and start a clean one for the next reply.
    try {
      this.tts?.close();
    } catch { /* already closed */ }
    this.tts = null;
    this.ttsReady = null;
    void this.connectTts();
    for (const resolve of this.pendingTools.values()) resolve({ ok: false, error: 'Interrupted by the user.' });
    this.pendingTools.clear();
    this.send({ type: 'interrupted', g: this.gen });
  }

  private onUserText(text: string, lang: string) {
    const spoken = text.trim();
    if (spoken.length < 2) return;
    // The script of what was written is a better guide than the recogniser's label, which tags a lot of
    // Indian-accented English as Hindi (and the voice then read English sentences, and their numbers, in Hindi).
    const heard = languageOfSpeech(spoken, lang);
    if (heard && TTS_LANGS.has(heard)) this.detectedLang = heard;

    let forModel = spoken;
    const last = this.messages[this.messages.length - 1];
    if (this.abort && !this.turnVisible && last?.role === 'user') {
      // The previous part is still being worked on and nothing has been said or done yet: the user
      // paused mid-sentence. Treat both parts as one request instead of answering them separately.
      forModel = `${String(last.content)} ${spoken}`.trim();
      this.messages.pop();
    } else if (this.isSpeakingNow()) {
      // A new request while the old answer is still talking or running: drop the old one first.
      this.interrupt();
    }

    this.send({ type: 'transcript', role: 'user', text: spoken, final: true });
    this.messages.push({ role: 'user', content: forModel });
    void this.runTurn();
  }

  /** Lets the assistant speak up about an app event once it has finished whatever it is saying. */
  private async onAppNotice(text: string) {
    for (let i = 0; i < 40 && this.isSpeakingNow(); i++) await new Promise((r) => setTimeout(r, 250));
    if (this.closed) return;
    this.messages.push({ role: 'user', content: `[Notice from the app, not spoken by the user] ${cleanText(text, 1800)}` });
    void this.runTurn();
  }

  private async runTurn() {
    // A new utterance replaces any answer still in progress.
    this.abort?.abort();
    const gen = ++this.gen;
    const abort = new AbortController();
    this.abort = abort;
    this.turnVisible = false;
    this.inflight = 0;
    this.turnT0 = Date.now();
    this.firstAudioSent = false;

    // Follow the language the user is actually speaking — unless they asked for one outright, in
    // which case that stands even if they say the next sentence in something else.
    if (!this.languagePinned) {
      const want = this.detectedLang || this.ttsLang;
      if (want !== this.ttsLang && TTS_LANGS.has(want)) this.switchLanguage(want);
    }

    try {
      for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
        const { content, toolCalls } = await this.streamLlm(gen, abort.signal);
        if (gen !== this.gen) return;
        this.messages.push({
          role: 'assistant',
          content: content || null,
          ...(toolCalls.length ? { tool_calls: toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args) } })) } : {}),
        });
        if (!toolCalls.length) break;

        // Run the tools on the phone and feed the results back to the model.
        const results = await Promise.all(toolCalls.map((c) => this.runToolOnPhone(c)));
        // Always record the results (even if interrupted) so the conversation never ends on a
        // tool call without an answer, which the model would choke on in the next turn.
        toolCalls.forEach((c, i) => this.messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(results[i]) }));
        if (gen !== this.gen) return;
      }
      if (gen !== this.gen) return;
      this.send({ type: 'turn_complete' });
      this.send({ type: 'metrics', turn_total_ms: Date.now() - this.turnT0 });
    } catch (e) {
      if (gen === this.gen && !(e instanceof DOMException && e.name === 'AbortError')) {
        this.send({ type: 'error', message: `The assistant hit a problem: ${e instanceof Error ? e.message : 'unknown'}` });
      }
    } finally {
      if (this.abort === abort) this.abort = null;
    }
  }

  private runToolOnPhone(call: ToolCall): Promise<unknown> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingTools.delete(call.id);
        resolve({ ok: false, error: 'That took too long and was stopped.' });
      }, TOOL_TIMEOUT_MS);
      this.pendingTools.set(call.id, (r) => {
        clearTimeout(timer);
        this.learnScreen(r);
        resolve(r);
      });
      this.turnVisible = true;
      this.send({ type: 'tool_call', id: call.id, name: call.name, args: call.args });
    });
  }

  /** Streams one model response, speaking each finished sentence as soon as it exists. */
  private async streamLlm(gen: number, signal: AbortSignal): Promise<{ content: string; toolCalls: ToolCall[] }> {
    const t0 = Date.now();
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      signal,
      headers: { 'api-subscription-key': this.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: this.messages,
        tools: this.tools.length ? toOpenAiTools(this.tools) : undefined,
        tool_choice: this.tools.length ? 'auto' : undefined,
        temperature: 0.3,
        max_tokens: 500,
        reasoning_effort: 'low',
        stream: true,
      }),
    });
    if (!res.ok || !res.body) throw new Error(`model error ${res.status}`);

    let content = '';
    let spoken = 0;
    let sawFirst = false;
    const calls = new Map<number, { id: string; name: string; args: string }>();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const speakReady = (final: boolean) => {
      // Split off complete sentences from what has not been spoken yet.
      let rest = content.slice(spoken);
      for (;;) {
        const m = rest.match(/^[\s\S]*?[.!?।\n]+(?=\s|$)/) ?? (rest.length > 140 ? rest.match(/^[\s\S]{60,140}?[,;:](?=\s)/) : null);
        if (!m) break;
        const sentence = m[0];
        spoken += sentence.length;
        rest = content.slice(spoken);
        void this.speak(sentence, gen);
      }
      if (final && rest.trim()) {
        spoken = content.length;
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
        try {
          j = JSON.parse(payload);
        } catch {
          continue;
        }
        const d = j.choices?.[0]?.delta;
        if (!d) continue;
        if (d.content) {
          if (!sawFirst) {
            sawFirst = true;
            this.send({ type: 'metrics', llm_first_token_ms: Date.now() - t0 });
          }
          content += d.content;
          this.send({ type: 'transcript', role: 'assistant', text: d.content, final: false });
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
    if (gen === this.gen) speakReady(true);

    const toolCalls: ToolCall[] = [...calls.values()]
      .filter((c) => c.name)
      .map((c, i) => {
        let args: Json = {};
        try {
          args = c.args ? JSON.parse(c.args) : {};
        } catch { /* leave empty */ }
        return { id: c.id || `call_${Date.now()}_${i}`, name: c.name, args };
      });
    return { content: content.trim(), toolCalls };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.ttsPinger) clearInterval(this.ttsPinger);
    this.gen++;
    this.abort?.abort();
    for (const resolve of this.pendingTools.values()) resolve({ ok: false, error: 'Session ended.' });
    for (const ws of [this.stt, this.tts, this.phone]) {
      try {
        ws?.close();
      } catch { /* ignore */ }
    }
    this.onClosed();
  }
}

Deno.serve((req) => {
  if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('Expected a WebSocket connection', { status: 426 });
  }
  // idleTimeout 0: never drop a quiet socket on our side. The waitUntil promise keeps the
  // worker alive for as long as the call lasts (Supabase may otherwise retire it early).
  const { socket, response } = Deno.upgradeWebSocket(req, { idleTimeout: 0 });
  let resolveClosed!: () => void;
  EdgeRuntime.waitUntil(new Promise<void>((r) => (resolveClosed = r)));
  new Session(socket, () => resolveClosed());
  return response;
});
