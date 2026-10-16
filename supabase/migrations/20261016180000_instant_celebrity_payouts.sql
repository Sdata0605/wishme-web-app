-- Instant celebrity payouts through RazorpayX.
--
-- A withdrawal now goes: reserve the money (request_celebrity_payout: balance lowered, request 'pending') ->
-- the celebrity-payout edge function sends it to the bank ('processing') -> the RazorpayX webhook confirms
-- ('processed', with the bank's UTR) or reports a failure ('failed' / 'reversed').
-- Whenever a request that has not been paid ends in failure, the money goes back to the celebrity's balance,
-- exactly once, by the trigger below.

ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_payout_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS utr text,
  ADD COLUMN IF NOT EXISTS failure_reason text;

-- One provider payout belongs to one request; also what the webhook looks requests up by.
CREATE UNIQUE INDEX IF NOT EXISTS payout_requests_provider_payout_id_key
  ON public.payout_requests (provider_payout_id)
  WHERE provider_payout_id IS NOT NULL;

-- Give the money back once when a request that was not paid ends as rejected, failed or reversed.
CREATE OR REPLACE FUNCTION public.restore_balance_on_payout_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('pending', 'processing')
     AND NEW.status IN ('rejected', 'failed', 'reversed') THEN
    UPDATE celebrities
    SET available_balance = COALESCE(available_balance, 0) + NEW.requested_amount
    WHERE id = NEW.celebrity_id;
  END IF;
  RETURN NEW;
END;
$$;
