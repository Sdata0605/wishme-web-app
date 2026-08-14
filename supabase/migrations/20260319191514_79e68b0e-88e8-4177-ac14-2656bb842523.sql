
DROP POLICY IF EXISTS "Admin can view all greeting cards" ON greeting_card_generations;

CREATE POLICY "Admin can view all greeting cards"
ON greeting_card_generations
FOR SELECT
TO authenticated
USING (public.is_admin_by_auth_uid());
