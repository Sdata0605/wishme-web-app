/**
 * Audio for phone calls: G.711 mu-law (what the phone network uses, 8 kHz) <-> linear PCM
 * (what the AI engines use, 16 kHz in and 24 kHz out). Pure functions, no dependencies.
 */

const BIAS = 0x84;
const CLIP = 32635;
const SEG_END = [0xff, 0x1ff, 0x3ff, 0x7ff, 0xfff, 0x1fff, 0x3fff, 0x7fff];

export function pcm16ToMulaw(sample: number): number {
  let s = sample < 0 ? -sample : sample;
  const sign = sample < 0 ? 0x80 : 0;
  if (s > CLIP) s = CLIP;
  s += BIAS;
  let seg = 0;
  while (seg < SEG_END.length && s > SEG_END[seg]) seg++;
  if (seg >= 8) return ~sign & 0xff;
  const mantissa = (s >> (seg + 3)) & 0x0f;
  return ~(sign | (seg << 4) | mantissa) & 0xff;
}

export function mulawToPcm16(u: number): number {
  u = ~u & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + BIAS) << exponent;
  sample -= BIAS;
  return sign ? -sample : sample;
}

/** mu-law bytes -> 16-bit little-endian PCM (same sample rate). */
export function decodeMulaw(mu: Uint8Array): Uint8Array {
  const out = new Uint8Array(mu.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < mu.length; i++) view.setInt16(i * 2, mulawToPcm16(mu[i]), true);
  return out;
}

/** 16-bit little-endian PCM -> mu-law bytes (same sample rate). */
export function encodeMulaw(pcm: Uint8Array): Uint8Array {
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const n = Math.floor(pcm.byteLength / 2);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = pcm16ToMulaw(view.getInt16(i * 2, true));
  return out;
}

/** 8 kHz -> 16 kHz, interpolating between samples so the result is not harsh. */
export function upsample8kTo16k(pcm8k: Uint8Array): Uint8Array {
  const src = new DataView(pcm8k.buffer, pcm8k.byteOffset, pcm8k.byteLength);
  const n = Math.floor(pcm8k.byteLength / 2);
  const out = new Uint8Array(n * 4);
  const dst = new DataView(out.buffer);
  for (let i = 0; i < n; i++) {
    const a = src.getInt16(i * 2, true);
    const b = i + 1 < n ? src.getInt16((i + 1) * 2, true) : a;
    dst.setInt16(i * 4, a, true);
    dst.setInt16(i * 4 + 2, (a + b) >> 1, true);
  }
  return out;
}

/** 24 kHz or 16 kHz -> 8 kHz, averaging each group so it does not sound grainy. */
export function downsampleTo8k(pcm: Uint8Array, fromRate = 24000): Uint8Array {
  const step = Math.round(fromRate / 8000);
  if (step <= 1) return pcm;
  const src = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const inSamples = Math.floor(pcm.byteLength / 2);
  const outSamples = Math.floor(inSamples / step);
  const out = new Uint8Array(outSamples * 2);
  const dst = new DataView(out.buffer);
  for (let i = 0; i < outSamples; i++) {
    let sum = 0;
    for (let k = 0; k < step; k++) sum += src.getInt16((i * step + k) * 2, true);
    dst.setInt16(i * 2, Math.round(sum / step), true);
  }
  return out;
}

// ─── base64 (chunked, so long frames never blow the call stack) ───────────────

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Phone audio -> base64 PCM 16 kHz for the AI. Gateways differ: most send mu-law at 8 kHz, some
 * send linear PCM, so the format the stream announced decides how it is read.
 */
export function phoneToEngine(b64: string, encoding = 'audio/x-mulaw', sampleRate = 8000): string {
  const raw = base64ToBytes(b64);
  const enc = encoding.toLowerCase();
  const isLinear = (enc.includes('l16') || enc.includes('pcm')) && !enc.includes('pcmu');
  const pcm = isLinear ? raw : decodeMulaw(raw);
  const rate = isLinear ? sampleRate : 8000;
  return bytesToBase64(rate === 16000 ? pcm : upsample8kTo16k(pcm));
}

/** AI audio (base64 PCM at `rate`) -> base64 mu-law 8 kHz for the phone. */
export const engineToPhone = (b64: string, rate = 24000): string =>
  bytesToBase64(encodeMulaw(downsampleTo8k(base64ToBytes(b64), rate)));

/** How long (ms) a block of mu-law 8 kHz audio takes to play: 8 bytes per millisecond. */
export const mulawMs = (b64Length: number): number => ((b64Length * 3) / 4) / 8;

// ─── Phone-quality conversion ─────────────────────────────────────────────────
//
// The helpers above convert each chunk on its own and average groups of samples, which is a very weak filter:
// everything the voice has above 4 kHz is folded back into the speech band as a metallic, "radio" buzz, and any
// chunk that does not hold a whole number of samples loses its tail and clicks at the join. This section does the
// job properly: a long low-pass filter before the sample rate is cut, kept running across chunks, followed by a
// gentle level stage so the voice sits at a comfortable volume without clipping on the narrow phone codec.

/** Zeroth-order modified Bessel function, needed by the Kaiser window. */
function bessel0(x: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; k < 60; k++) {
    term *= (x / (2 * k)) ** 2;
    sum += term;
    if (term < 1e-12 * sum) break;
  }
  return sum;
}

/**
 * Low-pass filter taps (Kaiser-windowed sinc): flat up to `passHz`, at least `stopDb` quieter from `stopHz` on,
 * and exactly unity gain at DC.
 */
export function designLowpass(fs: number, passHz: number, stopHz: number, stopDb = 70): Float64Array {
  const dw = (2 * Math.PI * (stopHz - passHz)) / fs;
  let taps = Math.ceil((stopDb - 8) / (2.285 * dw)) + 1;
  if (taps % 2 === 0) taps++;
  const beta = 0.1102 * (stopDb - 8.7);
  const fc = (passHz + stopHz) / 2 / fs; // cycles per sample, centre of the transition band
  const mid = (taps - 1) / 2;
  const h = new Float64Array(taps);
  const norm = bessel0(beta);
  let sum = 0;
  for (let n = 0; n < taps; n++) {
    const x = n - mid;
    const sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
    const r = mid === 0 ? 0 : x / mid;
    h[n] = sinc * (bessel0(beta * Math.sqrt(Math.max(0, 1 - r * r))) / norm);
    sum += h[n];
  }
  for (let n = 0; n < taps; n++) h[n] /= sum;
  return h;
}

/** Telephone speech lives below about 3.4 kHz; anything from 4.6 kHz up would fold back into it at 8 kHz. */
const PASS_HZ = 3400;
const STOP_HZ = 4600;

/**
 * Cuts the sample rate to 8 kHz (from 16 or 24 kHz) with a proper anti-aliasing filter. It remembers the end of
 * the previous chunk, so audio can arrive in chunks of any size (even a half sample) and still come out as one
 * continuous signal.
 */
export class Decimator {
  private readonly h: Float64Array;
  private hist: Float64Array;
  /** Where the next output sample falls inside the next input block. */
  private phase = 0;
  /** A chunk that ended in the middle of a 16-bit sample leaves its first byte here. */
  private odd = -1;

  readonly factor: number;

  constructor(fromRate: number) {
    if (fromRate % 8000 !== 0) throw new Error(`Cannot convert ${fromRate} Hz to 8 kHz`);
    this.factor = fromRate / 8000;
    this.h = this.factor === 1 ? new Float64Array([1]) : designLowpass(fromRate, PASS_HZ, STOP_HZ);
    this.hist = new Float64Array(this.h.length - 1);
  }

  reset() {
    this.hist = new Float64Array(this.h.length - 1);
    this.phase = 0;
    this.odd = -1;
  }

  /** 16-bit little-endian PCM at `fromRate` in; samples at 8 kHz out (on the 16-bit scale, not rounded). */
  process(pcm: Uint8Array): Float64Array {
    let bytes = pcm;
    if (this.odd >= 0) {
      bytes = new Uint8Array(pcm.length + 1);
      bytes[0] = this.odd;
      bytes.set(pcm, 1);
    }
    this.odd = bytes.length & 1 ? bytes[bytes.length - 1] : -1;
    const n = bytes.length >> 1;
    const view = new DataView(bytes.buffer, bytes.byteOffset, n * 2);

    const taps = this.h.length;
    const x = new Float64Array(taps - 1 + n);
    x.set(this.hist);
    for (let i = 0; i < n; i++) x[taps - 1 + i] = view.getInt16(i * 2, true);

    const out: number[] = [];
    let i = this.phase;
    for (; i < n; i += this.factor) {
      let acc = 0;
      const base = i + taps - 1;
      for (let j = 0; j < taps; j++) acc += this.h[j] * x[base - j];
      out.push(acc);
    }
    this.phase = i - n;
    this.hist = x.slice(n); // the last taps-1 samples
    return Float64Array.from(out);
  }
}

/** Soft limiter: untouched up to `knee`, then rounded off smoothly so peaks never reach full scale or clip. */
export function softLimit(x: number, knee = 0.8 * 32767): number {
  const a = Math.abs(x);
  if (a <= knee) return x;
  const room = 32767 - knee;
  const y = knee + room * Math.tanh((a - knee) / room);
  return x < 0 ? -y : y;
}

export interface ConditionerOptions {
  /** Level speech is brought to, in dB below full scale (RMS). Voices land around -19 measured as active speech with the default of -21. */
  targetDb?: number;
  /** Most it will ever turn quiet speech up, in dB. */
  maxBoostDb?: number;
  /** Most it will ever turn loud speech down, in dB. */
  maxCutDb?: number;
}

/**
 * Keeps the voice at a steady, comfortable level whichever voice is speaking: quiet speech is lifted toward
 * `targetDb` (a quiet voice sounds hissy because the phone codec's own noise stays the same size) and a very
 * loud one is brought down (a hot signal gets squashed by the network). The gain moves smoothly, on a time scale
 * that does not depend on how big the chunks happen to be, and peaks go through the soft limiter. Silence between
 * words is not amplified.
 */
export class VoiceConditioner {
  /** Smoothed mean square of the speech so far (energy, not an average of RMS values, which under-reads lively speech). */
  private energy = 0;
  private gain = 1;
  private readonly target: number;
  private readonly maxGain: number;
  private readonly minGain: number;
  /** Frames quieter than this (dB below full scale) are treated as silence. */
  private static readonly GATE = 10 ** (-50 / 20) * 32767;
  /** How quickly the measured level and the gain follow the voice, in seconds. */
  private static readonly LEVEL_TAU = 0.4;
  private static readonly GAIN_TAU = 0.25;

  constructor(opts: ConditionerOptions = {}) {
    this.target = 10 ** ((opts.targetDb ?? -21) / 20) * 32767;
    this.maxGain = 10 ** ((opts.maxBoostDb ?? 9) / 20);
    this.minGain = 10 ** (-(opts.maxCutDb ?? 8) / 20);
  }

  /** Forgets the level. (The filter is reset separately; the level carries on between sentences on purpose.) */
  reset() {
    this.energy = 0;
    this.gain = 1;
  }

  process(samples: Float64Array): Int16Array {
    const n = samples.length;
    const out = new Int16Array(n);
    if (!n) return out;
    const seconds = n / 8000;

    let sq = 0;
    for (let i = 0; i < n; i++) sq += samples[i] * samples[i];
    const meanSquare = sq / n;
    if (Math.sqrt(meanSquare) > VoiceConditioner.GATE) {
      this.energy = this.energy === 0
        ? meanSquare
        : this.energy + (1 - Math.exp(-seconds / VoiceConditioner.LEVEL_TAU)) * (meanSquare - this.energy);
    }
    const level = Math.sqrt(this.energy);
    const wanted = level > 0 ? Math.min(this.maxGain, Math.max(this.minGain, this.target / level)) : 1;
    // Ramp across the chunk so a change in gain is never a step.
    const next = this.gain + (1 - Math.exp(-seconds / VoiceConditioner.GAIN_TAU)) * (wanted - this.gain);
    for (let i = 0; i < n; i++) {
      const g = this.gain + ((next - this.gain) * (i + 1)) / n;
      out[i] = Math.round(softLimit(samples[i] * g));
    }
    this.gain = next;
    return out;
  }
}

/**
 * Everything between the AI's voice and the phone line, for one direction of one call: filter down to 8 kHz,
 * level, limit, and encode as mu-law. Keep one per call (the filter and level stages remember the last chunk).
 */
export class PhoneEncoder {
  private readonly decimator: Decimator;
  private readonly conditioner: VoiceConditioner;

  constructor(fromRate = 24000, opts: ConditionerOptions = {}) {
    this.decimator = new Decimator(fromRate);
    this.conditioner = new VoiceConditioner(opts);
  }

  /** Call when the caller talks over the AI: the next sentence starts with a clean filter (the level carries on). */
  reset() {
    this.decimator.reset();
  }

  /** Base64 16-bit PCM from the AI → base64 mu-law 8 kHz for the phone, plus how long it plays (ms). */
  encode(b64: string): { payload: string; ms: number } {
    const pcm = this.conditioner.process(this.decimator.process(base64ToBytes(b64)));
    const mu = new Uint8Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) mu[i] = pcm16ToMulaw(pcm[i]);
    return { payload: bytesToBase64(mu), ms: mu.length / 8 };
  }
}
