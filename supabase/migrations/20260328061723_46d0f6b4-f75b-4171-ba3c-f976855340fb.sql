-- Insert pricing row for Hari Raj Shetty so subscription works
INSERT INTO public.celebrity_favorite_pricing (celebrity_id, price, is_enabled, celebrity_commission_percentage, referrer_commission_percentage)
VALUES ('00865ec8-5b5e-435f-ae8f-625d343f02f6', 999, true, 5, 10)
ON CONFLICT (celebrity_id) DO NOTHING;