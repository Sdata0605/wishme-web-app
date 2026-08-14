-- Fix Loved Ones RLS Policies
-- Drop existing policies that use incorrect user_id mapping
DROP POLICY IF EXISTS "Users manage own loved ones" ON loved_ones;
DROP POLICY IF EXISTS "Users view own loved ones" ON loved_ones;

-- Create new policies that correctly map auth.uid() to profiles.id
CREATE POLICY "Users view own loved ones" 
ON loved_ones 
FOR SELECT 
USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users insert own loved ones" 
ON loved_ones 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users update own loved ones" 
ON loved_ones 
FOR UPDATE 
USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users delete own loved ones" 
ON loved_ones 
FOR DELETE 
USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));