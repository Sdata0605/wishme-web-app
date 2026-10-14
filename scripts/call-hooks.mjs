/**
 * Module hooks for scripts/callBridge.selfcheck.ts: swaps the `ws` package (the connection to Sarvam) for a fake
 * that the test controls, and leaves every other module real.
 */
const FAKE_WS = `
globalThis.__sockets ??= [];
export default class FakeWS {
  constructor(url, options) {
    this.url = url; this.options = options; this.handlers = {}; this.sent = []; this.closed = false;
    globalThis.__sockets.push(this);
    setTimeout(() => globalThis.__wsBehavior?.(this, 'connect'), 1);
  }
  on(event, cb) { (this.handlers[event] ??= []).push(cb); }
  emit(event, ...args) { (this.handlers[event] ?? []).forEach((f) => f(...args)); }
  send(data) { this.sent.push(String(data)); globalThis.__wsBehavior?.(this, 'send', String(data)); }
  close() { if (!this.closed) { this.closed = true; setTimeout(() => this.emit('close'), 0); } }
}`;

export async function resolve(specifier, context, next) {
  if (specifier === 'npm:ws') return { url: 'fake:ws', shortCircuit: true };
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url === 'fake:ws') return { format: 'module', source: FAKE_WS, shortCircuit: true };
  return next(url, context);
}
