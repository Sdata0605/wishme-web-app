# How Sarvam Detects the Caller's Language and Replies in It

This covers only the language part of an AI phone call run by Sarvam: how the caller's language is detected, what is sent to each Sarvam service, and how the reply is given in that language.

The code is in `supabase/functions/vobiz-call/sarvam.ts`, with helpers in `supabase/functions/_shared/` (`spokenDigits.ts`, `callPrompt.ts`, `callVoice.ts`).

---

## 1. Detecting the caller's language

Every sentence the caller says goes through Sarvam's speech-to-text service. The result is checked in this order:

1. **Sarvam's language label.** The service returns a `language` field with each finished sentence (for example `mr-IN`, `kn-IN`, `en-IN`). If it names an Indian language, that is used.
2. **The script of the text.** If the text is in an Indian script, the script gives the language:
   - Devanagari is shared by Hindi and Marathi, so the words decide. Marathi words such as आहे, होता, तुम्ही point to Marathi; Hindi words such as है, था, आप point to Hindi.
   - Kannada, Tamil, Telugu, Malayalam, Bengali, Gujarati, Punjabi and Odia each have their own script.
3. **Romanised speech** (an Indian language typed in English letters, such as "tumhi kon ahat"). The chat model judges the language from its meaning, so this works for any language.
4. **Short English replies** such as "ok", "yes" or "sure" keep the current language, so they do not switch the call back to English.

When the language changes, the voice is switched to match before the reply.

---

## 2. What is sent to Sarvam

### 2.1 Speech to text (listening)
A realtime WebSocket to `speech-to-text-realtime`, with `model=saaras:v3-realtime` and `language_code=auto`, so Sarvam detects the language itself.

Each chunk of the caller's audio is sent as:
```json
{ "event": "audio_input", "audio": "<base64 PCM, 16 kHz, mono>" }
```

Sarvam sends back, for each finished sentence:
```json
{ "event": "transcript.final", "text": "...", "language": "mr-IN", "language_confidence": 0.9 }
```

### 2.2 Chat model (deciding the reply)
Each finished caller sentence is sent to Sarvam's chat endpoint (`https://api.sarvam.ai/v1/chat/completions`) as:

```json
{
  "model": "sarvam-105b-conversations",
  "messages": [
    { "role": "system", "content": "<the call prompt, plus the language line>" },
    { "role": "user", "content": "[Note, not spoken by them] They are speaking Marathi. Reply ONLY in Marathi, in its own script, with no English sentence.\n<what the caller said>" }
  ],
  "tools": [ "report_outcome", "end_call" ],
  "tool_choice": "auto",
  "temperature": 0.3,
  "max_tokens": 300,
  "reasoning_effort": "low",
  "stream": true
}
```

The **system message** is rebuilt for every reply. When the caller is not speaking English, it ends with:

> LANGUAGE FOR THIS REPLY: the caller is speaking Marathi. Write every word of your reply in Marathi, in its own script. Never answer in English while the caller is speaking Marathi.

The **note** carries the language change into the conversation with the caller's words.

### 2.3 Text to speech (speaking the reply)
A WebSocket to `text-to-speech` with `model=bulbul:v3`. The first message sets the language and voice:

```json
{
  "type": "config",
  "data": {
    "language_code": "mr-IN",
    "speaker": "ritu",
    "pace": 1.0,
    "speech_sample_rate": "24000",
    "output_audio_codec": "linear16"
  }
}
```

Each sentence of the reply is then sent as:
```json
{ "type": "text", "data": { "text": "<one sentence of the reply>" } }
{ "type": "flush" }
```

Sarvam returns the audio in chunks, which are converted to the phone's format and played to the caller. Phone numbers are spoken digit by digit in the language of the sentence.

---

## 3. How the reply is given in the caller's language

1. **The language is set.** The detected language becomes the reply language. The voice connection is reopened with the matching `language_code`. Indian languages other than English and Hindi use the `bulbul:v3` voice.
2. **The chat model is told.** The system message and the note both say which language to reply in, and to use its own script.
3. **The reply is checked before speaking.** Each reply sentence's script is read. If the model wrote Devanagari (Marathi or Hindi) while the voice is set to English, the voice switches to match before the sentence is spoken.
4. **The sentence is spoken.** The text goes to the text-to-speech service with the matching language code.

If the caller speaks again in another language, the same steps run for that sentence, so the reply follows the caller.

---

## 4. Example

1. The call opens in English: *"Hi, this is an AI assistant calling for Prashant Patole…"*
2. The caller says: *"तुम्ही कोण आहात?"* (Marathi).
3. Speech to text returns `language: mr-IN`. The voice switches to Marathi.
4. The chat model gets the Marathi language line and writes its reply in Marathi.
5. The Marathi voice speaks the reply.

---

## 5. Log lines to check

| Log line | Meaning |
|---|---|
| `[sarvam-call] stt final keys=... language=mr-IN` | The language label Sarvam returned for the sentence. |
| `[sarvam-call] heard (mr-IN, devanagari): mr-IN` | The language chosen for the sentence, and how it was decided. |
| `[sarvam-call] reply language: Marathi` | The language the chat model was told to use. |
| `[sarvam-call] voice lang en-IN -> mr-IN` | The voice switched to the caller's language. |

If `language=` shows `none`, Sarvam is not returning a language label for that sentence, and the detection falls back to the script and the meaning.
