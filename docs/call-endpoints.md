# Voice Call Endpoints (Vobiz and Sarvam)

Every address used by an AI phone call, with its method and what it carries.

Supabase project base URL: `https://eqikeuqwbphwongtfzhe.supabase.co`

---

## 1. Our endpoints (Supabase edge functions)

### 1.1 Start a call
`POST https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/ai-call-start`

- **Auth:** the logged-in user's access token (`Authorization: Bearer <token>`).
- **Body (JSON):**
  ```json
  { "name": "Prashant", "phone": "+917038997834", "purpose": "ask how he is",
    "details": "", "language": "english", "confirmed": true }
  ```
- `confirmed` must be `true`. It is set only after the user says yes.
- `language` is `english`, `hindi` or `hinglish`.

### 1.2 Vobiz callbacks into `vobiz-call`
Base: `https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/vobiz-call`

Each call's callback URLs carry two query values: `id` (the call row ID) and `t` (a token made from the call ID and a server secret, because Vobiz cannot log in).

| Method | Address | Called by | Purpose |
|---|---|---|---|
| `POST` | `/ring?id=<callId>&t=<token>` | Vobiz | The phone is ringing. Status becomes `ringing`. |
| `POST` | `/answer?id=<callId>&t=<token>` | Vobiz | The phone was answered. The reply is XML that starts recording (if on) and opens the audio stream. |
| `WSS` | `/stream/<callId>/<token>` | Vobiz | Two-way audio WebSocket. Vobiz sends the caller's audio and receives the AI's audio. |
| `POST` | `/hangup?id=<callId>&t=<token>` | Vobiz | The call ended. Saves the transcript, outcome, duration and price. |
| `POST` | `/recording/<callId>/<token>` | Vobiz | The recording is ready; it is copied to our storage. |

The `answer` reply is XML of this form:
```xml
<Record recordSession="true" redirect="false" playBeep="false" fileFormat="mp3" maxLength="900"
        callbackUrl="https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/vobiz-call/recording/<callId>/<token>"
        callbackMethod="POST"/>
<Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000">
  wss://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/vobiz-call/stream/<callId>/<token>
</Stream>
```
(The `<Record>` element is only included when recording is on.)

### 1.3 Diagnostic action
`/functions/v1/vobiz-call/selftest` is a self-check route. It is not used during a call.

---

## 2. Vobiz API (telephone provider)

### 2.1 Place an outbound call
`POST https://api.vobiz.ai/api/v1/Account/{auth_id}/Call/`

**Headers**
```
Content-Type: application/json
X-Auth-ID: <VOBIZ_AUTH_ID>
X-Auth-Token: <VOBIZ_AUTH_TOKEN>
```

**Body**
```json
{
  "from": "918065354620",
  "to": "917038997834",
  "answer_url": "https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/vobiz-call/answer?id=<callId>&t=<token>",
  "answer_method": "POST",
  "ring_url": "https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/vobiz-call/ring?id=<callId>&t=<token>",
  "ring_method": "POST",
  "hangup_url": "https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/vobiz-call/hangup?id=<callId>&t=<token>",
  "hangup_method": "POST",
  "ring_timeout": "40",
  "time_limit": "900"
}
```

- `from` is our Vobiz number (digits only).
- `to` is the person to call (digits only).
- `ring_timeout` is how long to ring, in seconds.
- `time_limit` is the maximum call length, in seconds.

**Response:** the call ID (a UUID) is returned and stored in `ai_calls.vapi_call_id`. This is the ID shown in the Vobiz console.

### 2.2 Callbacks Vobiz sends to us
Vobiz calls the `ring_url`, `answer_url`, `hangup_url` and the recording callback (section 1.2) with `POST`. The answer reply must be valid XML.

### 2.3 Audio stream
Vobiz opens a WebSocket to the `/stream` address and streams the call audio as mu-law, 8 kHz, in base64 `media` messages. We reply with `playAudio` messages carrying the AI's speech in the same format.

---

## 3. Sarvam AI (speech, chat and voice)

Authentication for all three: the Sarvam API key, sent as a header (`api-subscription-key`).

### 3.1 Speech to text (listening)
`WSS wss://api.sarvam.ai/speech-to-text-realtime/ws?model=saaras:v3-realtime&sample_rate=16000&encoding=linear16&stream_type=fast&endpointing=vad&silence_duration_ms=400&language_code=auto`

- **Header:** `api-subscription-key: <SARVAM_API_KEY>`
- **We send:** `{ "event": "audio_input", "audio": "<base64 PCM 16 kHz>" }` for each chunk.
- **Sarvam sends back:**
  - `vad.speech_start` when the caller starts speaking
  - `transcript.partial` while speaking
  - `transcript.final` with `text` and `language` (for example `mr-IN`) when a sentence ends

### 3.2 Chat model (the reply)
`POST https://api.sarvam.ai/v1/chat/completions`

- **Header:** `api-subscription-key: <SARVAM_API_KEY>` and `Content-Type: application/json`
- **Body:**
  ```json
  {
    "model": "sarvam-105b-conversations",
    "messages": [
      { "role": "system", "content": "<call prompt, with the language line>" },
      { "role": "user", "content": "[Note, not spoken by them] They are speaking Marathi. Reply ONLY in Marathi...\n<caller's words>" }
    ],
    "tools": [ { "type": "function", "function": { "name": "report_outcome", "parameters": { } } },
               { "type": "function", "function": { "name": "end_call", "parameters": { } } } ],
    "tool_choice": "auto",
    "temperature": 0.3,
    "max_tokens": 300,
    "reasoning_effort": "low",
    "stream": true
  }
  ```
- **Sarvam sends back:** a stream of `data:` lines, each with a `choices[0].delta.content` piece of text or a `tool_calls` entry.

### 3.3 Text to speech (speaking)
`WSS wss://api.sarvam.ai/text-to-speech/ws?send_completion_event=true&model=bulbul:v3`

- **Header:** `Api-Subscription-Key: <SARVAM_API_KEY>`
- **We send, first:**
  ```json
  { "type": "config", "data": { "language_code": "mr-IN", "speaker": "ritu", "pace": 1.0,
    "speech_sample_rate": "24000", "output_audio_codec": "linear16",
    "min_buffer_size": 30, "max_chunk_length": 120 } }
  ```
- **Then, for each sentence:**
  ```json
  { "type": "text", "data": { "text": "<one sentence>" } }
  { "type": "flush" }
  ```
- **Keep-alive:** `{ "type": "ping" }` every 20 seconds.
- **Sarvam sends back:** `{ "type": "audio", "data": { "audio": "<base64 PCM 24 kHz>" } }` chunks, and `{ "type": "event" }` when a sentence is finished.

---

## 4. Call flow in order

1. App → `POST /functions/v1/ai-call-start`
2. `ai-call-start` → `POST https://api.vobiz.ai/api/v1/Account/{auth_id}/Call/`
3. Vobiz rings the phone → `POST /vobiz-call/ring`
4. Phone answered → `POST /vobiz-call/answer` (reply XML)
5. Vobiz opens `WSS /vobiz-call/stream/...`
6. Caller speaks → Sarvam listens: `WSS speech-to-text-realtime`
7. Sentence ready → Sarvam chat: `POST /v1/chat/completions`
8. Reply sentence → Sarvam speaks: `WSS text-to-speech`
9. Speech audio → back to the caller over the Vobiz stream
10. Call ends → Vobiz `POST /vobiz-call/hangup`; the recording → `POST /vobiz-call/recording/...`

---

## 5. Notes

- Keep all keys (Vobiz auth ID and token, Sarvam API key) in server secrets. They must not appear in the app or in documents.
- The Vobiz callback tokens are one-way: they cannot be used to call our functions with other call IDs.
- If the Vobiz console shows a hang-up cause, it is recorded on the call's `ai_calls` row only after the `hangup` callback arrives.
