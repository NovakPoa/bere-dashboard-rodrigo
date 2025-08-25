-- Remove políticas anônimas perigosas de org_pages e org_blocks
DROP POLICY IF EXISTS "Anon can select org_pages" ON public.org_pages;
DROP POLICY IF EXISTS "Anon can insert org_pages" ON public.org_pages;
DROP POLICY IF EXISTS "Anon can update org_pages" ON public.org_pages;
DROP POLICY IF EXISTS "Anon can delete org_pages" ON public.org_pages;

DROP POLICY IF EXISTS "Anon can select org_blocks" ON public.org_blocks;
DROP POLICY IF EXISTS "Anon can insert org_blocks" ON public.org_blocks;
DROP POLICY IF EXISTS "Anon can update org_blocks" ON public.org_blocks;
DROP POLICY IF EXISTS "Anon can delete org_blocks" ON public.org_blocks;

-- Corrigir search_path das funções existentes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_whatsapp_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  extracted_phone TEXT;
  target_user_id UUID;
BEGIN
  -- Extract phone number from wa_id
  extracted_phone := public.extract_phone_from_wa_id(NEW.wa_id);
  
  -- If we have a phone number, try to find matching user
  IF extracted_phone IS NOT NULL THEN
    SELECT id INTO target_user_id
    FROM public.profiles
    WHERE phone_number = extracted_phone;
    
    -- If user found, link the data
    IF target_user_id IS NOT NULL THEN
      NEW.user_id := target_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_historical_whatsapp_data(target_user_id uuid, user_phone text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  wa_id_pattern TEXT;
  total_updated INTEGER := 0;
  updated_count INTEGER;
BEGIN
  wa_id_pattern := 'whatsapp:+' || user_phone;
  
  -- Update alimentacao records
  UPDATE public.alimentacao 
  SET user_id = target_user_id 
  WHERE wa_id = wa_id_pattern AND user_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  -- Update financeiro records
  UPDATE public.financeiro 
  SET user_id = target_user_id 
  WHERE wa_id = wa_id_pattern AND user_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  -- Update atividade_fisica records
  UPDATE public.atividade_fisica 
  SET user_id = target_user_id 
  WHERE wa_id = wa_id_pattern AND user_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  -- Update cultura records
  UPDATE public.cultura 
  SET user_id = target_user_id 
  WHERE wa_id = wa_id_pattern AND user_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  -- Update habitos records
  UPDATE public.habitos 
  SET user_id = target_user_id 
  WHERE wa_id = wa_id_pattern AND user_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  RETURN total_updated;
END;
$function$;