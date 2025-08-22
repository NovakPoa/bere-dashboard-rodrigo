-- Fix function search path security issue by updating the existing function with CASCADE
DROP FUNCTION IF EXISTS public.set_user_id() CASCADE;

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the triggers that were dropped
CREATE TRIGGER org_pages_set_user_id
  BEFORE INSERT ON public.org_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER set_user_id_financeiro
  BEFORE INSERT ON public.financeiro
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER set_user_id_alimentacao
  BEFORE INSERT ON public.alimentacao
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER set_user_id_cultura
  BEFORE INSERT ON public.cultura
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER set_user_id_habitos
  BEFORE INSERT ON public.habitos
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();