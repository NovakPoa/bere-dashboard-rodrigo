-- Corrigir search_path das funções restantes
CREATE OR REPLACE FUNCTION public.extract_phone_from_wa_id(wa_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Extract phone number from "whatsapp:+555181447811" format
  IF wa_id IS NULL OR NOT wa_id LIKE 'whatsapp:+%' THEN
    RETURN NULL;
  END IF;
  
  RETURN SUBSTRING(wa_id FROM 'whatsapp:\+(.*)');
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;