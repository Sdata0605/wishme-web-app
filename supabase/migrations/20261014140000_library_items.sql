-- Library: videos (and any other media) a user saves from the mobile app.
-- Greeting cards keep using greeting_card_generations.saved_to_library, so the app shows both in one Library screen.
CREATE TABLE IF NOT EXISTS public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image', 'video')),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  title text NOT NULL,
  subtitle text,
  media_url text,
  file_key text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT library_items_has_media CHECK (media_url IS NOT NULL OR file_key IS NOT NULL),
  CONSTRAINT library_items_unique_source UNIQUE (user_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_library_items_user_created ON public.library_items(user_id, created_at DESC);

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own library items"
  ON public.library_items FOR SELECT
  USING (user_id = public.get_my_profile_id());

CREATE POLICY "Users can save to their own library"
  ON public.library_items FOR INSERT
  WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Users can remove their own library items"
  ON public.library_items FOR DELETE
  USING (user_id = public.get_my_profile_id());

-- Fast "is this already saved" lookups for cards.
CREATE INDEX IF NOT EXISTS idx_greeting_cards_saved
  ON public.greeting_card_generations(user_id, created_at DESC)
  WHERE saved_to_library;
