/**
 * Runs the real Sarvam call bridge against a fake Sarvam server, plus the voice choice and the call prompt:
 *
 *   node --experimental-transform-types scripts/callBridge.selfcheck.ts
 *
 * The fake behaves like the real one did in testing: it refuses a speaker that does not belong to the model with an
 * error message, and it sends audio back in uneven chunks.
 */

import { register } from 'node:module';

register('./call-hooks.mjs', import.meta.url);
const g = globalThis as Record<string, any>;
const audio = await import(new URL('../supabase/functions/_shared/callAudio.ts', import.meta.url).href);
const voiceMod = await import(new URL('../supabase/functions/_shared/callVoice.ts', import.meta.url).href);
const prompt = await import(new URL('../supabase/functions/_shared/callPrompt.ts', import.meta.url).href);
const { SarvamCallBridge } = await import(new URL('../supabase/functions/vobiz-call/sarvam.ts', import.meta.url).href);

let checks = 0;
function check(name: string, ok: boolean, detail?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${name}${detail === undefined ? '' : `\n  got: ${JSON.stringify(detail)}`}`);
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Which voice is chosen ──────────────────────────────────────────────────
{
  const none = () => undefined;
  let c = voiceMod.chooseSarvamVoice(none, 'english');
  check('English default: newer model, conversational voice', c.voice.model === 'bulbul:v4-flash' && c.voice.speaker === 'sophia_en_conversational', c);
  check('the proven voice is the fallback', c.fallbackVoice?.model === 'bulbul:v3' && c.fallbackVoice?.speaker === 'ritu', c);
  c = voiceMod.chooseSarvamVoice(none, 'hindi');
  check('Hindi default', c.voice.speaker === 'ritu_hi_conversation' && c.voice.model === 'bulbul:v4-flash', c);
  check('Hinglish uses the Hindi voice', voiceMod.chooseSarvamVoice(none, 'hinglish').voice.speaker === 'ritu_hi_conversation');
  c = voiceMod.chooseSarvamVoice((k: string) => (k === 'ai_call_sarvam_model' ? 'bulbul:v3' : undefined), 'english');
  check('the admin can go back to the old model', c.voice.model === 'bulbul:v3' && c.voice.speaker === 'ritu' && c.fallbackVoice === undefined, c);
  c = voiceMod.chooseSarvamVoice((k: string) => (k === 'ai_call_sarvam_speaker_english' ? ' Zarina_EN_Conversation ' : undefined), 'english');
  check('the admin can pick another speaker (tidied)', c.voice.speaker === 'zarina_en_conversation', c);
  c = voiceMod.chooseSarvamVoice((k: string) => (k === 'ai_call_sarvam_speaker_english' ? 'rm -rf /; x' : undefined), 'english');
  check('a malformed speaker setting is ignored', c.voice.speaker === 'sophia_en_conversational', c);
  check('a woman is recognised', voiceMod.speakerGender('sophia_en_conversational') === 'female' && voiceMod.speakerGender('ritu') === 'female');
  check('a man is recognised', voiceMod.speakerGender('rahul_hi_conversational') === 'male' && voiceMod.speakerGender('shubh') === 'male');
}

// ─── What the AI is told and says ───────────────────────────────────────────
{
  const brief = { userName: 'Prashant', toName: 'Rahul', purpose: 'Book an appointment', details: '', language: 'english', recorded: false };
  const open = prompt.openingLine(brief);
  check('English opening names the AI and the user', /AI assistant/.test(open) && /Prashant/.test(open) && /Rahul/.test(open), open);
  check('English opening says the call is written down', /written down/.test(open), open);
  check('English opening asks if it is a good time', /minute/.test(open), open);
  const rec = prompt.openingLine({ ...brief, recorded: true });
  check('recording is announced truthfully', /recorded/.test(rec) && !/written down/.test(rec), rec);

  const hi = prompt.openingLine({ ...brief, language: 'hindi' });
  check('Hindi opening is in Devanagari with the AI notice', /एआई असिस्टेंट/.test(hi) && /यह बातचीत लिखी जा रही है/.test(hi), hi);
  check('Hindi opening has no verb that depends on gender', !/रहा हूँ|रही हूँ|रहा हूं|रही हूं/.test(hi), hi);

  const sys = prompt.callSystemPrompt({ ...brief, gender: 'female' });
  check('the prompt still forbids pretending to be human', /Never pretend to be a human/.test(sys));
  check('the prompt has the speaking style', /HOW TO SOUND/.test(sys) && /contractions/.test(sys));
  check('the prompt asks for Hindi in Devanagari', /Devanagari/.test(sys));
  check('a female voice gets feminine Hindi', /रही हूँ/.test(sys) && !/कर रहा हूँ/.test(sys));
  const male = prompt.callSystemPrompt({ ...brief, gender: 'male' });
  check('a male voice gets masculine Hindi', /कर रहा हूँ/.test(male) && !/कर रही हूँ/.test(male));
  check('the prompt still ends with the hang-up rules', /ENDING THE CALL/.test(sys) && /report_outcome/.test(sys));
}

// ─── The bridge, talking to a fake Sarvam ───────────────────────────────────
const tone = (seconds: number, amp = 9000) => {
  const n = Math.round(24000 * seconds);
  const out = new Uint8Array(n * 2);
  const v = new DataView(out.buffer);
  for (let i = 0; i < n; i++) v.setInt16(i * 2, Math.round(amp * Math.sin((2 * Math.PI * 440 * i) / 24000)), true);
  return out;
};

/** Fake server: `valid(model, speaker)` decides whether a voice is accepted; `failHandshake` refuses the connection. */
function fakeSarvam(opts: { valid: (model: string, speaker: string) => boolean; failHandshake?: (model: string) => boolean; audioSeconds?: number }) {
  g.__sockets = [];
  g.__wsBehavior = (sock: any, kind: string, data?: string) => {
    if (!sock.url.includes('text-to-speech')) {
      if (kind === 'connect') sock.emit('open');
      return;
    }
    const model = new URL(sock.url).searchParams.get('model') ?? '';
    if (kind === 'connect') {
      if (opts.failHandshake?.(model)) {
        sock.emit('error', new Error('handshake refused'));
        sock.emit('close');
      } else sock.emit('open');
      return;
    }
    const msg = JSON.parse(data!);
    if (msg.type === 'config') sock.speaker = msg.data.speaker;
    if (msg.type === 'config' && !opts.valid(model, msg.data.speaker)) {
      sock.rejected = true;
      setTimeout(() => sock.emit('message', JSON.stringify({ type: 'error', data: { message: `400: Speaker '${msg.data.speaker}' is not compatible with model ${model}` } })), 2);
    }
    if (msg.type === 'flush' && !sock.rejected) {
      const pcm = tone(opts.audioSeconds ?? 1);
      const sizes = [4001, 7777, 1920, 30001]; // odd, uneven pieces
      let pos = 0;
      let k = 0;
      const send = () => {
        if (pos >= pcm.length) {
          sock.emit('message', JSON.stringify({ type: 'event', data: { event_type: 'final' } }));
          return;
        }
        const len = Math.min(sizes[k++ % sizes.length] & ~1, pcm.length - pos);
        sock.emit('message', JSON.stringify({ type: 'audio', data: { audio: audio.bytesToBase64(pcm.subarray(pos, pos + len)) } }));
        pos += len;
        setTimeout(send, 1);
      };
      setTimeout(send, 2);
    }
  };
}

function makeBridge(voice: any, fallbackVoice: any) {
  const spoken: { payload: string; ms: number }[] = [];
  const events = {
    onSpeak: (payload: string, ms: number) => spoken.push({ payload, ms }),
    onClearAudio() {}, onLine() {}, onOutcome() {}, onWantsToHangUp() {}, onEnded() {},
  };
  const brief = { userName: 'Prashant', toName: 'Rahul', purpose: 'Book an appointment', details: '', language: 'english', recorded: false };
  const bridge = new SarvamCallBridge(brief, { apiKey: 'test-key', model: 'm', voice, fallbackVoice }, events);
  return { bridge, spoken };
}
const ttsSockets = () => g.__sockets.filter((s: any) => s.url.includes('text-to-speech'));
const totalMs = (spoken: { ms: number }[]) => spoken.reduce((n, s) => n + s.ms, 0);
const V4 = { model: 'bulbul:v4-flash', speaker: 'sophia_en_conversational' };
const V3 = { model: 'bulbul:v3', speaker: 'ritu' };
const compatible = (model: string, speaker: string) => (model === 'bulbul:v4-flash') === speaker.includes('_');

{
  fakeSarvam({ valid: compatible });
  const { bridge, spoken } = makeBridge(V4, V3);
  await bridge.start();
  bridge.greet();
  await wait(150);
  check('the chosen voice is requested on the right model', ttsSockets().length === 1 && ttsSockets()[0].url.includes('model=bulbul%3Av4-flash'), ttsSockets().map((s: any) => s.url));
  check('the speaker is sent in the config', ttsSockets()[0].sent.some((m: string) => m.includes('sophia_en_conversational')));
  check('audio reaches the phone', spoken.length > 0, spoken.length);
  check('a second of voice is a second of phone audio', Math.abs(totalMs(spoken) - 1000) < 5, totalMs(spoken));
  const mu = audio.base64ToBytes(spoken[0].payload);
  check('every piece is mu-law at 8 bytes per millisecond', mu.length === Math.round(spoken[0].ms * 8), { bytes: mu.length, ms: spoken[0].ms });
  check('no fallback when the voice works', ttsSockets().length === 1);
  bridge.close();
}

{
  fakeSarvam({ valid: compatible });
  const { bridge, spoken } = makeBridge({ model: 'bulbul:v4-flash', speaker: 'ritu' }, V3); // a speaker of the wrong model
  await bridge.start();
  bridge.greet();
  await wait(250);
  const socks = ttsSockets();
  check('a refused voice falls back to the proven one', socks.length === 2 && socks[1].url.includes('model=bulbul%3Av3') && socks[1].speaker === 'ritu', socks.map((s: any) => [s.url, s.speaker]));
  check('the sentence that was waiting is spoken after all', spoken.length > 0 && Math.abs(totalMs(spoken) - 1000) < 5, totalMs(spoken));
  const texts = socks[1].sent.filter((m: string) => m.includes('"type":"text"'));
  check('and it is spoken exactly once', texts.length === 1, texts.length);
  check('the replayed text is the opening line', /AI assistant/.test(texts[0]));
  bridge.close();
}

{
  fakeSarvam({ valid: compatible, failHandshake: (model) => model === 'bulbul:v4-flash' });
  const { bridge, spoken } = makeBridge(V4, V3);
  const started = await Promise.race([bridge.start().then(() => 'started'), wait(1500).then(() => 'hung')]);
  check('a refused connection cannot leave the call waiting forever', started === 'started', started);
  bridge.greet();
  await wait(300);
  check('and the call still gets its voice', spoken.length > 0 && ttsSockets().some((s: any) => s.url.includes('bulbul%3Av3')), ttsSockets().map((s: any) => s.url));
  bridge.close();
}

{
  fakeSarvam({ valid: compatible });
  const { bridge, spoken } = makeBridge(V4, V3);
  await bridge.start();
  bridge.greet();
  await wait(150);
  const before = ttsSockets().length;
  ttsSockets()[0].emit('message', JSON.stringify({ type: 'error', data: { message: 'connection idle' } })); // later, after it has spoken
  await wait(50);
  check('a voice that has already spoken is not swapped over a later hiccup', ttsSockets().length === before && ttsSockets()[0].speaker === 'sophia_en_conversational');
  check('(audio had already been delivered)', spoken.length > 0);
  bridge.close();
}

{
  fakeSarvam({ valid: compatible, audioSeconds: 0.5 });
  const { bridge } = makeBridge(V3, undefined);
  await bridge.start();
  await (bridge as any).speak('Please note the number 98765 43210. Thank you.', (bridge as any).gen);
  await wait(60);
  const sent = ttsSockets()[0].sent.filter((m: string) => m.includes('"type":"text"')).map((m: string) => JSON.parse(m).data.text);
  check('phone numbers are spoken as English digit words on an English call', sent.length === 1 && /nine eight seven six five, four three two one zero/.test(sent[0]) && !/98765/.test(sent[0]), sent);
  bridge.close();
}

console.log(`callBridge: all ${checks} checks passed`);
