
ALTER TABLE public.voice_call_wishes
ADD COLUMN IF NOT EXISTS disconnect_reason text,
ADD COLUMN IF NOT EXISTS call_transcript text,
ADD COLUMN IF NOT EXISTS webhook_payload jsonb;
