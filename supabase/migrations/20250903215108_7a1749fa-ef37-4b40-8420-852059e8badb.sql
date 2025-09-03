-- Enable RLS on terra_users table
ALTER TABLE public.terra_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own Terra connection
CREATE POLICY "Users can view their own terra connection"
ON public.terra_users
FOR SELECT
USING (reference_id = auth.uid()::text);

-- Create policy to allow webhook to insert/update terra users (without auth)
CREATE POLICY "Allow webhook to manage terra users"
ON public.terra_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure the webhook function can access terra_data_payloads table
ALTER TABLE public.terra_data_payloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow webhook to insert data payloads"
ON public.terra_data_payloads
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Allow sync function to access data payloads"
ON public.terra_data_payloads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);