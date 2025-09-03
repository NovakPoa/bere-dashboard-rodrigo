-- Enable RLS on terra_misc_payloads table
ALTER TABLE public.terra_misc_payloads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow webhook/service role to manage misc payloads
CREATE POLICY "Allow webhook to manage misc payloads"
ON public.terra_misc_payloads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);