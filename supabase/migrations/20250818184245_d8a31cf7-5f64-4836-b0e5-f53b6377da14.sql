-- Secure atividade_fisica by user ownership and remove public access
-- 1) Add user_id column to link rows to authenticated users
ALTER TABLE public.atividade_fisica
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS idx_atividade_fisica_user_id ON public.atividade_fisica(user_id);

-- 2) Ensure RLS is enabled
ALTER TABLE public.atividade_fisica ENABLE ROW LEVEL SECURITY;

-- 3) Drop overly permissive public policies
DROP POLICY IF EXISTS "Clients can insert activities" ON public.atividade_fisica;
DROP POLICY IF EXISTS "Clients can select activities" ON public.atividade_fisica;

-- 4) Restrictive policies based on authenticated user
CREATE POLICY "Users can select own activities"
ON public.atividade_fisica
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activities"
ON public.atividade_fisica
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());