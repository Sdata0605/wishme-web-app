-- Occasion alerts never saved from the app: the app sends types such as "wedding" or "festival" that the
-- check constraint rejected, and it upserts on (user_id, loved_one_id, occasion_name) which had no unique index.

ALTER TABLE public.occasion_alerts DROP CONSTRAINT IF EXISTS occasion_alerts_occasion_type_check;
ALTER TABLE public.occasion_alerts ADD CONSTRAINT occasion_alerts_occasion_type_check
  CHECK (occasion_type = ANY (ARRAY['birthday', 'anniversary', 'wedding', 'festival', 'other', 'custom', 'celebrity_event']));

-- One alert per person per occasion name. (Alerts for celebrities have no loved_one_id and are not affected.)
CREATE UNIQUE INDEX IF NOT EXISTS occasion_alerts_unique_person_occasion
  ON public.occasion_alerts (user_id, loved_one_id, occasion_name);
