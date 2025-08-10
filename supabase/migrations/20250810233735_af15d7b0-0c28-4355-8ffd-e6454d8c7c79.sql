-- Allow public inserts/selects for bereproject so the app can save activities without auth
-- Note: This is a permissive policy intended for this app context. We can tighten it later if you add authentication.

-- Ensure RLS is enabled (should already be, but keep for safety)
ALTER TABLE public.bereproject ENABLE ROW LEVEL SECURITY;

-- Create missing policies idempotently
DO $$ BEGIN
  -- Insert policy for anon & authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bereproject' AND policyname = 'Clients can insert activities'
  ) THEN
    CREATE POLICY "Clients can insert activities"
    ON public.bereproject
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;

  -- Select policy for anon & authenticated (in case it's missing)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bereproject' AND policyname = 'Clients can select activities'
  ) THEN
    CREATE POLICY "Clients can select activities"
    ON public.bereproject
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;