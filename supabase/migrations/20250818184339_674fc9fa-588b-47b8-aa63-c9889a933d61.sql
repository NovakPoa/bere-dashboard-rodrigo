-- Fix RLS policies for tables with no policies
-- Add basic policies for tables that need them

-- 1) alimentacao - add basic RLS policies
ALTER TABLE public.alimentacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for alimentacao" 
ON public.alimentacao FOR SELECT 
USING (true);

-- 2) cultura - add basic RLS policies  
ALTER TABLE public.cultura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for cultura"
ON public.cultura FOR SELECT
USING (true);

-- 3) habitos - add basic RLS policies
ALTER TABLE public.habitos ENABLE ROW LEVEL SECURITY; 
CREATE POLICY "Public read access for habitos"
ON public.habitos FOR SELECT
USING (true);