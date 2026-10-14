/**
 * Measures the phone-audio conversion with test tones, old method against new:
 *
 *   node --experimental-strip-types scripts/callAudio.selfcheck.ts
 *
 * Exits with an error (non-zero) on the first failing check, and prints the numbers it measured.
 */

const a = await import(new URL('../supabase/functions/_shared/callAudio.ts', import.meta.url).href);

let checks = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${name} ${detail}`);
}
const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-12));

/** 16-bit little-endian PCM of a sine wave. */
function tone(freq: number, rate: number, seconds: number, amp = 8000): Uint8Array {
  const n = Math.round(rate * seconds);
  const out = new Uint8Array(n * 2);
  const v = new DataView(out.buffer);
  for (let i = 0; i < n; i++) v.setInt16(i * 2, Math.round(amp * Math.sin((2 * Math.PI * freq * i) / rate)), true);
  return out;
}
const rmsOf = (x: ArrayLike<number>, skip = 400) => {
  let s = 0;
  let n = 0;
  for (let i = skip; i < x.length - skip; i++) {
    s += x[i] * x[i];
    n++;
  }
  return Math.sqrt(s / n);
};
const toSamples = (pcm: Uint8Array) => {
  const v = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  return Array.from({ length: pcm.byteLength >> 1 }, (_, i) => v.getInt16(i * 2, true));
};

const AMP = 8000;
const inputRms = AMP / Math.SQRT2;

// ── Filter design ───────────────────────────────────────────────────────────
const h: Float64Array = a.designLowpass(24000, 3400, 4600, 70);
const response = (f: number, fs: number) => {
  let re = 0;
  let im = 0;
  for (let n = 0; n < h.length; n++) {
    re += h[n] * Math.cos((2 * Math.PI * f * n) / fs);
    im -= h[n] * Math.sin((2 * Math.PI * f * n) / fs);
  }
  return Math.hypot(re, im);
};
check('filter has unity gain at DC', Math.abs(response(0, 24000) - 1) < 1e-9);
for (const f of [300, 1000, 2000, 3000, 3400]) {
  check(`speech band is flat at ${f} Hz`, Math.abs(db(response(f, 24000))) < 0.25, `${db(response(f, 24000)).toFixed(2)} dB`);
}
for (const f of [4600, 5000, 6000, 8000, 11000]) {
  check(`${f} Hz is cut by at least 65 dB`, db(response(f, 24000)) < -65, `${db(response(f, 24000)).toFixed(1)} dB`);
}
console.log(`filter: ${h.length} taps, ripple in the speech band < 0.25 dB, stopband below -65 dB`);

// ── The old method (averaging groups of three samples) for comparison ───────
console.log('\n tone     old method   new method   (output level relative to the input tone)');
for (const f of [1000, 3000, 5000, 6000, 7000, 9000]) {
  const input = tone(f, 24000, 1, AMP);
  const oldOut = toSamples(a.downsampleTo8k(input, 24000));
  const dec = new a.Decimator(24000);
  const newOut = Array.from(dec.process(input));
  console.log(`${String(f).padStart(5)} Hz   ${db(rmsOf(oldOut) / inputRms).toFixed(1).padStart(7)} dB   ${db(rmsOf(newOut) / inputRms).toFixed(1).padStart(7)} dB`);
  if (f <= 3000) {
    check(`${f} Hz speech tone passes through at full level`, Math.abs(db(rmsOf(newOut) / inputRms)) < 0.3);
  } else if (f >= 5000) {
    // 5-9 kHz is not speech the phone can carry: the old method let a large part of it through as a buzz.
    check(`${f} Hz is removed instead of folded into the speech band`, db(rmsOf(newOut) / inputRms) < -60);
    check(`(old method for comparison) ${f} Hz leaked`, db(rmsOf(oldOut) / inputRms) > -25);
  }
}

// ── Chunk boundaries: the same audio in odd-sized pieces must give the same result ──
{
  const signal = new Uint8Array(24000 * 2 * 2);
  const t1 = tone(700, 24000, 2, 6000);
  const t2 = tone(2300, 24000, 2, 3000);
  const v = new DataView(signal.buffer);
  for (let i = 0; i < 48000; i++) v.setInt16(i * 2, Math.max(-32768, Math.min(32767, new DataView(t1.buffer).getInt16(i * 2, true) + new DataView(t2.buffer).getInt16(i * 2, true))), true);

  const whole = Array.from(new a.Decimator(24000).process(signal));
  const dec = new a.Decimator(24000);
  const pieces: number[] = [];
  let pos = 0;
  const sizes = [1, 7, 959, 2, 1443, 61, 3, 5000, 17];
  for (let k = 0; pos < signal.length; k++) {
    const len = Math.min(sizes[k % sizes.length], signal.length - pos); // includes odd byte counts: half a sample
    pieces.push(...dec.process(signal.subarray(pos, pos + len)));
    pos += len;
  }
  let worst = 0;
  for (let i = 0; i < whole.length; i++) worst = Math.max(worst, Math.abs(whole[i] - pieces[i]));
  check('chunked audio gives the same number of samples', whole.length === pieces.length, `${whole.length} vs ${pieces.length}`);
  check('chunked audio is identical to whole audio', worst < 1e-6, `max difference ${worst}`);

  // Old method on the same chunks: whole samples are lost and the signal jumps at every join.
  const oldPieces: number[] = [];
  pos = 0;
  for (let k = 0; pos < signal.length; k++) {
    const len = Math.min(sizes[k % sizes.length] * 2, signal.length - pos);
    oldPieces.push(...toSamples(a.downsampleTo8k(signal.subarray(pos, pos + len), 24000)));
    pos += len;
  }
  console.log(`\nchunked in odd sizes: new method keeps all ${pieces.length} samples (identical to one piece); old method kept ${oldPieces.length} of ${whole.length}`);
  check('(old method for comparison) lost samples at chunk joins', oldPieces.length < whole.length);
}

// ── Level stage and limiter ─────────────────────────────────────────────────
{
  const run = (amp: number, seconds: number, chunk: number) => {
    const input = Float64Array.from(toSamples(tone(500, 8000, seconds, amp)));
    const cond = new a.VoiceConditioner({ targetDb: -19, maxBoostDb: 9, maxCutDb: 8 });
    const out: number[] = [];
    for (let i = 0; i < input.length; i += chunk) out.push(...cond.process(input.subarray(i, i + chunk)));
    const skip = Math.round(input.length * 0.6); // judge it once it has settled
    const level = (x: ArrayLike<number>) => db(rmsOf(Array.from(x).slice(skip), 0) / 32768);
    return { before: level(input), after: level(out) };
  };
  const quiet = run(600, 4, 160);
  console.log(`quiet voice: ${quiet.before.toFixed(1)} -> ${quiet.after.toFixed(1)} dBFS (target -19, boost limit 9 dB)`);
  check('a quiet voice is brought up, by at most 9 dB', quiet.after - quiet.before > 5 && quiet.after - quiet.before <= 9.05);

  const hot = run(14000, 4, 160);
  console.log(`hot voice:   ${hot.before.toFixed(1)} -> ${hot.after.toFixed(1)} dBFS (cut limit 8 dB)`);
  check('a very loud voice is turned down, by at most 8 dB', hot.before - hot.after > 5 && hot.before - hot.after <= 8.05);

  const near = run(5200, 4, 160); // 5200 peak is about -19 dBFS RMS already
  check('a voice already at the target is left alone', Math.abs(near.after - near.before) < 0.6, `${(near.after - near.before).toFixed(2)} dB`);

  const big = run(3000, 4, 3040); // chunks of 380 ms, as Sarvam sends them
  check('settles just as well with large chunks', Math.abs(big.after - -19) < 1.5, `${big.after.toFixed(1)} dBFS`);

  const silence = new Float64Array(8000).map(() => (Math.random() - 0.5) * 40);
  const out3 = new a.VoiceConditioner().process(silence);
  check('silence and hiss between words are not amplified', rmsOf(out3, 0) <= rmsOf(silence, 0) * 1.01);

  const overs = new Float64Array([0, 40000, -40000, 33000, 20000, -20000, 100, -100]);
  const lim = overs.map((x) => a.softLimit(x));
  check('peaks never exceed full scale', lim.every((x: number) => Math.abs(x) <= 32767));
  check('small signals pass the limiter untouched', a.softLimit(100) === 100 && a.softLimit(-5000) === -5000);
  check('the limiter is smooth (no jump at the knee)', Math.abs(a.softLimit(0.8 * 32767 + 1) - (0.8 * 32767 + 1)) < 2);

  // The level carries on between sentences: an interruption resets the filter only.
  const enc = new a.PhoneEncoder(24000);
  const first = a.bytesToBase64(tone(300, 24000, 0.5, 2000));
  enc.encode(first);
  enc.encode(first);
  enc.reset();
  const after = a.base64ToBytes(enc.encode(first).payload);
  const settled = rmsOf(toSamples(a.decodeMulaw(after).slice(0, after.length * 2)), 200);
  check('after an interruption the voice level is not reset', settled > 1300, `rms ${settled.toFixed(0)}`);
}

// ── Full path ───────────────────────────────────────────────────────────────
{
  const enc = new a.PhoneEncoder(24000);
  const input = tone(1000, 24000, 0.5, 8000);
  const { payload, ms } = enc.encode(a.bytesToBase64(input));
  check('half a second of audio is 500 ms of phone audio', Math.abs(ms - 500) < 1, `${ms} ms`);
  const mu = a.base64ToBytes(payload);
  check('8 kHz mu-law has one byte per sample', mu.length === 4000, `${mu.length} bytes`);
  const back = toSamples(a.decodeMulaw(mu).slice(0, mu.length * 2));
  check('mu-law round trip keeps the tone', Math.abs(db(rmsOf(back, 100) / inputRms)) < 3);
  const enc16 = new a.PhoneEncoder(16000);
  check('16 kHz input works too', Math.abs(enc16.encode(a.bytesToBase64(tone(1000, 16000, 0.5, 8000))).ms - 500) < 1);
  const enc8 = new a.PhoneEncoder(8000);
  check('8 kHz input passes straight through', Math.abs(enc8.encode(a.bytesToBase64(tone(1000, 8000, 0.5, 8000))).ms - 500) < 1);
}

console.log(`\ncallAudio: all ${checks} checks passed`);
