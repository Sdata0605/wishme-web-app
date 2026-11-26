# WishMe AI Phone Call (Sarvam): How It Works

This explains how an AI phone call is started, how Vobiz connects it, how Sarvam listens, thinks and speaks, and how the reply is kept in the caller's language.

---

## 1. The parts involved

| Part | What it does | Where it lives |
|---|---|---|
| **Mobile app** | The user asks the assistant to call someone. The app reads back the number and purpose, and needs a spoken yes. | `wishme-mobile-app/artifacts/mobile` |
| **`ai-call-start`** (Supabase function) | Checks the request, creates the call record, and asks Vobiz to ring the number. | `wishmefinal-webapp-latest/supabase/functions/ai-call-start` |
| **Vobiz** | The telephone provider. It rings the phone, reports ringing, answer and hang-up, and streams the call audio to us. | External (`https://api.vobiz.ai`) |
| **`vobiz-call`** (Supabase function) | Receives Vobiz's events and runs the conversation. | `supabase/functions/vobiz-call` |
| **Sarvam** | Speech-to-text (listening), the chat model (writing the reply) and text-to-speech (speaking). | External (`https://api.sarvam.ai`) |
| **Database** (`ai_calls`, `platform_settings`) | Stores each call, its transcript, outcome, settings and price. | Supabase Postgres |
| **Storage** | Keeps call recordings when recording is on. | Supabase storage |

---

## 2. Settings that control calls

| Setting | Current value | Meaning |
|---|---|---|
| `ai_call_engine` | `sarvam` | The engine that runs phone calls. |
| `ai_call_sarvam_model` | `bulbul:v3` | The Sarvam voice model for calls. It covers Indian languages. |
| `ai_call_record` | `true` | Whether call audio is recorded. |
| `ai_call_recording_days` | `30` | How long a recording is kept. |
| `ai_call_price` | `0` | Price charged to the user's wallet per call. |
| `ai_call_daily_limit` | `5` | Daily call limit per user. |

Secrets (kept outside the settings table) hold the Vobiz account ID and token, and the Sarvam API key.

---

## 3. Starting a call

1. **The user asks** the assistant to call someone, for example "call Prashant and ask how he is".
2. **The app asks for confirmation.** The assistant reads back who will be called, the number and the purpose, and says it is an AI and the call is written down. The user must say yes.
3. **The app calls `ai-call-start`** with the number, purpose, details, language (`english`, `hindi` or `hinglish`) and `confirmed: true`.
4. **`ai-call-start` checks** the request (logged in, valid number, daily limit, balance), then creates a row in `ai_calls` with status `queued`.
5. **It asks Vobiz to place the call.** It gives Vobiz three callback addresses for this call: `answer_url`, `ring_url` and `hangup_url`. Each carries a token made from the call ID and a server secret, because Vobiz cannot log in.
6. **Vobiz rings the phone.** The call moves to `ringing`.

---

## 4. The call through Vobiz

Vobiz talks to `vobiz-call` through these URLs:

| Step | Vobiz calls | What we do |
|---|---|---|
| Ringing | `/ring` | Mark the call `ringing`. |
| Answered | `/answer` | Mark the call `in-progress` and record the answer time. Reply with XML that starts the recording (if on) and opens an audio **stream** back to us. |
| Audio stream | `/stream` (WebSocket) | Vobiz sends the caller's audio and receives the AI's audio here. This is the conversation. |
| Hang-up | `/hangup` | Finish the call: save transcript, summary, outcome, duration and price. If it was never answered, the status becomes `no-answer`. |
| Recording ready | `/recording` | Copy the recording into our storage. |

The phone line uses **mu-law audio at 8 kHz**. Inside the server we convert it to **16 kHz PCM** for listening, and convert Sarvam's **24 kHz** speech back to 8 kHz mu-law for the phone.

---

## 5. How Sarvam listens, thinks and speaks

Sarvam is **three services chained together**:

```
Caller's voice ──► Speech-to-text ──► Chat model ──► Text-to-speech ──► Caller's ear
                  (saaras v3,        (sarvam-105b-    (bulbul v3,
                   realtime)          conversations)   Indian voices)
```

### 5.1 Listening (speech to text)
- A realtime WebSocket to Sarvam's speech-to-text service (`saaras:v3-realtime`), with `language_code=auto` so Sarvam detects the language itself.
- Each finished sentence arrives as a `transcript.final` event with the **text** and the **detected language** (the `language` field, for example `mr-IN`, `kn-IN` or `en-IN`).
- Voice activity detection tells us when the caller starts speaking. The AI then stops talking at once (an interruption).

### 5.2 Thinking (the chat model)
- Each finished caller sentence is added to the conversation and sent to the chat model (`sarvam-105b-conversations`).
- The model's reply is streamed. As soon as a full sentence arrives, it is sent to speech, so the caller hears the start without waiting for the whole answer.
- The model can also call two tools: `report_outcome` (record how the call went) and `end_call` (hang up after goodbye).
- The system prompt holds the task, the speaking style, the safety rules (never ask for card numbers, OTPs or passwords; say it is an AI; never agree to pay) and the **language rule**.

### 5.3 Speaking (text to speech)
- Each sentence goes to Sarvam's text-to-speech WebSocket (`bulbul:v3`) with a **language code** (`en-IN`, `hi-IN`, `mr-IN`, `kn-IN`, and so on) and a speaker voice.
- Sarvam returns audio in chunks. Each chunk is converted to the phone format and played to the caller.
- Phone numbers are spoken digit by digit, in the language of the sentence.

---

## 6. How the reply is given in the caller's language

This is what makes the AI answer in the same language as the caller. It happens in four steps, for every sentence the caller says.

### Step 1 — Work out the caller's language
Each caller sentence is checked in this order:

1. **Sarvam's language label.** The speech-to-text result includes a `language` field. If it names an Indian language (for example `mr-IN`, `kn-IN`, `ta-IN`), that is used.
2. **The script of the text.** If the text is written in an Indian script, the script gives the language:
   - Devanagari is shared by Hindi and Marathi, so the words decide between them (for example "आहे" and "होता" point to Marathi, "है" and "था" to Hindi).
   - Kannada, Tamil, Telugu, Malayalam, Bengali, Gujarati, Punjabi and Odia each have their own script.
3. **Romanised speech** (an Indian language typed in English letters, such as "tumhi kon ahat" or "naanu ella aagide"). The chat model judges the language from its meaning, so this works for any language, not only a fixed word list.
4. **Very short English replies** such as "ok", "yes" or "sure" keep the current language, so they do not switch the call back to English.

### Step 2 — Switch the voice
When the language changes, the speech connection is reopened with the new language code. Indian languages other than English and Hindi use the `bulbul:v3` voice, which speaks them natively. The voice, and any interruption of the AI's current speech, are changed at the start of the caller's next sentence.

### Step 3 — Tell the chat model
The system prompt is rebuilt for every reply. When the caller speaks a non-English language, it ends with a line such as:

> *LANGUAGE FOR THIS REPLY: the caller is speaking Marathi. Write every word of your reply in Marathi, in its own script. Never answer in English while the caller is speaking Marathi.*

A note is also added to the conversation with the caller's sentence, so the model knows the language change.

### Step 4 — Check the script before speaking
Before each reply sentence is spoken, the code checks its script. If the model wrote Devanagari (Marathi or Hindi) while the voice is set to English, the voice switches to match the written text before the sentence is spoken. This catches cases where the model still answers in the wrong language.

### What the caller hears
Example:
1. The call opens in English: *"Hi, this is an AI assistant calling for Prashant Patole…"*
2. The caller replies: *"तुम्ही कोण आहात?"* (Marathi).
3. The call detects Marathi, the model writes its reply in Marathi, and the Marathi voice speaks it.
4. The caller then says something in Kannada. The call switches to Kannada for the next reply, in the same way.

Each step is logged with the `[sarvam-call]` prefix, for example:
- `stt final ... language=mr-IN`: the recogniser's label for the sentence
- `heard (mr-IN, devanagari): mr-IN`: the language chosen for it
- `reply language: Marathi`: the language the model was told to use
- `voice lang en-IN -> mr-IN`: the voice switch

---

## 7. Interruptions

If the caller speaks while the AI is talking, the AI stops at once, the audio already queued is cleared, and the new speech is handled as the next turn. The language is checked before the reply, so the reply matches the new speech.

---

## 8. Ending the call and saving the result

- The AI says goodbye, calls `report_outcome` (`success`, `partial`, `declined`, `no_info` or `callback_requested`) and then `end_call`.
- The call also ends if the caller hangs up, if the time limit (about 15 minutes) is reached, or if the phone is not answered.
- On finish, the server saves: the transcript, a short summary (written by the chat model), the outcome, the duration, the end reason and the price. If the call was answered and billed, the price is taken from the user's wallet.
- Recordings are copied into storage and kept for `ai_call_recording_days`.

---

## 9. Statuses

| Status | Meaning |
|---|---|
| `queued` | Row created, not yet sent to Vobiz. |
| `ringing` | Vobiz is ringing the phone. |
| `in-progress` | Answered; the conversation is running. |
| `completed` | Answered and finished normally. |
| `no-answer` | Not answered (busy, rejected by the carrier, or rang out). |
| `failed` | Could not start (for example the provider refused the call). |

---

## 10. Where to look when something goes wrong

- **Database:** `ai_calls` (one row per call: `transcript`, `status`, `ended_reason`, `started_at`).
- **Function logs** (Supabase dashboard → Edge Functions → `vobiz-call` → Logs). The useful prefixes are:
  - `[vobiz-call <id>]`: call lifecycle, timings (for example `first audio sent to the phone`), and the finish reason.
  - `[sarvam-call]`: what the recogniser heard, the detected language, the reply language and voice switches.
- **Vobiz console:** the call detail page shows the hang-up cause (for example `Busy Line`, which means the carrier ended the call before it reached the phone), the ring time and the cost.

**Common causes of trouble**
- *No call reaches the phone:* check Vobiz balance, verified numbers on a trial account, and the caller ID.
- *Answered but no speech:* check the `first audio sent` timing and the `[sarvam-call]` lines.
- *Wrong language:* check `heard (...)` and `reply language`. If the recogniser returns English text for Marathi speech, the language cannot be detected.

---

## 11. Files

| File | Role |
|---|---|
| `supabase/functions/ai-call-start/index.ts` | Starts a call and asks Vobiz to ring. |
| `supabase/functions/vobiz-call/index.ts` | Vobiz callbacks, audio stream, finish, recording. |
| `supabase/functions/vobiz-call/sarvam.ts` | Sarvam listening, thinking and speaking; language switching and reply language. |
| `supabase/functions/_shared/callPrompt.ts` | System prompt, speaking style and language rules. |
| `supabase/functions/_shared/callVoice.ts` | Chooses the Sarvam voice (model and speaker). |
| `supabase/functions/_shared/spokenDigits.ts` | Script and language detection; speaking phone numbers. |
| `supabase/functions/_shared/callAudio.ts` | Converts audio between the phone format and Sarvam. |
| `supabase/functions/_shared/vobiz.ts` | Vobiz settings, the call token and the outbound call. |
