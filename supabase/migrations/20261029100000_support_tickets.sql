-- Support tickets and admin replies

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
  source text NOT NULL DEFAULT 'mobile',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_replied_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  admin_id uuid NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  email_sent boolean NOT NULL DEFAULT false,
  email_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_status_created_at_idx
  ON public.support_tickets (status, created_at DESC);

CREATE INDEX IF NOT EXISTS support_ticket_replies_ticket_id_created_at_idx
  ON public.support_ticket_replies (ticket_id, created_at);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- support_tickets

-- Anyone (anon or authenticated) may open a ticket, always as 'open'.
-- user_id must be null or the caller's own id, so nobody can file under someone else.
CREATE POLICY "Anyone can create support tickets"
  ON public.support_tickets
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'open'
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Admins can view support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (public.is_admin_by_auth_uid());

CREATE POLICY "Users can view their own support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update support tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_by_auth_uid())
  WITH CHECK (public.is_admin_by_auth_uid());

-- support_ticket_replies
-- No INSERT policy: only the service role writes replies.

CREATE POLICY "Admins can view support ticket replies"
  ON public.support_ticket_replies
  FOR SELECT
  TO authenticated
  USING (public.is_admin_by_auth_uid());

CREATE POLICY "Ticket owners can view replies to their tickets"
  ON public.support_ticket_replies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = support_ticket_replies.ticket_id
        AND t.user_id = auth.uid()
    )
  );
