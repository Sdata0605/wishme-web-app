# Call voice samples

Short clips of the AI's voice **as a person on the phone would hear it** (8 kHz telephone audio). Open the `.wav`
files in any player and compare. Every clip says the same sentence, so only the sound differs.

| File | What it is |
|---|---|
| `01_english_TODAY_old_sound` | English, **how calls sounded before**: old voice, old audio conversion |
| `02_english_same_voice_better_audio` | English, the *same old voice* with the new audio conversion (this isolates the audio fix) |
| `03_english_NEW_DEFAULT_sophia` | English, **the new default**: Sarvam's newer model, conversational voice "Sophia" |
| `04_english_NEW_DEFAULT_sophia_midcall` | The same voice on a line from the middle of a call |
| `05_english_alternative_roopa` | English alternative voice |
| `06_english_alternative_zarina` | English alternative voice |
| `07_hindi_TODAY_old_sound_romanised_text` | Hindi, **how it was**: the AI wrote Hindi in English letters, old conversion |
| `08_hindi_same_voice_Devanagari_better_audio` | Hindi, same old voice, text in Devanagari, new conversion |
| `09_hindi_NEW_DEFAULT_ritu_conversation` | Hindi, **the new default** (newer model, conversational "Ritu") |
| `10_hindi_NEW_DEFAULT_codemixed_midcall` | Hindi with English words mixed in (how Hinglish calls will read) |
| `11_hindi_alternative_kavya` | Hindi alternative voice |

These are test clips of the phone audio path only. The AI's real wording on a call comes from its instructions
(see `supabase/functions/_shared/callPrompt.ts`), so the sentences here are just fixed examples.

## Changing the voice without a code change

Add rows to the `platform_settings` table (`setting_key`, `setting_value`):

| setting_key | value |
|---|---|
| `ai_call_sarvam_model` | `bulbul:v4-flash` (default) or `bulbul:v3` to go back to the old model |
| `ai_call_sarvam_speaker_english` | a speaker of that model, e.g. `roopa_en_conversational` (v4) or `ritu` (v3) |
| `ai_call_sarvam_speaker_hindi` | e.g. `kavya_hi_conversational` (v4) or `ritu` (v3) |

A speaker belongs to one model: if they do not match, Sarvam refuses it and the call automatically uses the old voice
(`bulbul:v3` / `ritu`) instead of going silent.
