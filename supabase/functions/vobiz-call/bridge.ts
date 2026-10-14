/** What every call engine (Gemini, Sarvam) must provide, and how it talks back to the phone. */

export interface BridgeEvents {
  /** Audio for the person to hear: base64 mu-law 8 kHz, plus how long it plays. */
  onSpeak: (mulawBase64: string, ms: number) => void;
  /** The person talked over the AI: throw away whatever is still queued to play. */
  onClearAudio: () => void;
  /** A finished line of the conversation, for the transcript. */
  onLine: (role: 'assistant' | 'user', text: string) => void;
  /** The AI's own verdict on how the call went. */
  onOutcome: (args: Record<string, unknown>) => void;
  /** The AI has said goodbye and wants to hang up. */
  onWantsToHangUp: () => void;
  /** The engine itself stopped. */
  onEnded: (reason: string) => void;
}

/** What the phone network says it is sending us, from the stream's `start` event. */
export interface InboundFormat {
  encoding: string;
  sampleRate: number;
}

export interface Bridge {
  /** Connects to the engine. Rejects if it cannot be reached. */
  start(): Promise<void>;
  /** Speaks the agreed opening line. */
  greet(): void;
  /** The audio format the phone network is actually sending, if it told us. */
  setInboundFormat(format: InboundFormat): void;
  /** One frame of the person's voice, base64, in the format above. */
  onPhoneAudio(b64: string): void;
  /** Tells the engine something out of band (for example that time is nearly up). */
  say(text: string): void;
  close(): void;
}
