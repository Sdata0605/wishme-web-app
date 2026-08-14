
-- Performance indexes for /bookings page: O(log n) lookups instead of full table scans
CREATE INDEX IF NOT EXISTS idx_bookings_user_created ON bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_greeting_cards_user_created ON greeting_card_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_gen_user_created ON music_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wish_orders_user_created ON wish_celebrity_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_user_created ON voice_call_wishes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_occasion_bookings_user_created ON occasion_bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_wishes_user_created ON photo_wishes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tts_gen_user_created ON tts_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sfx_gen_user_created ON sound_effect_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_conv_user_created ON voice_conversion_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_iso_user_created ON audio_isolation_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_img_music_user_created ON image_music_generations(user_id, created_at DESC);
