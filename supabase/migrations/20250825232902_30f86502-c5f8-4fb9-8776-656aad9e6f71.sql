
-- 1) Normalização de telefones
CREATE OR REPLACE FUNCTION public.normalize_phone(input text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
IMMUTABLE
AS $$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    WHEN length(regexp_replace(input, '[^0-9]', '', 'g')) = 0 THEN NULL
    ELSE '+' || regexp_replace(input, '[^0-9]', '', 'g')
  END;
$$;

-- 2) Atualizar a extração de telefone a partir de wa_id (aceitar os dois formatos)
CREATE OR REPLACE FUNCTION public.extract_phone_from_wa_id(wa_id text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
IMMUTABLE
AS $$
  SELECT public.normalize_phone(
    CASE
      WHEN wa_id IS NULL THEN NULL
      WHEN wa_id LIKE 'whatsapp:+%' THEN substring(wa_id from 'whatsapp:\+(.*)')
      ELSE wa_id
    END
  );
$$;

-- 3) Garantir profiles.phone_number normalizado
CREATE OR REPLACE FUNCTION public.normalize_profile_phone_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.phone_number IS NOT NULL THEN
    NEW.phone_number := public.normalize_phone(NEW.phone_number);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS before_write_normalize_phone ON public.profiles;
CREATE TRIGGER before_write_normalize_phone
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_phone_trg();

-- 4) Atualizar a função de link para usar número normalizado
CREATE OR REPLACE FUNCTION public.link_whatsapp_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  extracted_phone TEXT;
  target_user_id UUID;
BEGIN
  extracted_phone := public.extract_phone_from_wa_id(NEW.wa_id);
  IF extracted_phone IS NOT NULL THEN
    SELECT id INTO target_user_id
    FROM public.profiles
    WHERE public.normalize_phone(phone_number) = extracted_phone;

    IF target_user_id IS NOT NULL THEN
      NEW.user_id := target_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) Atualizar vinculação retroativa para comparar por número normalizado
CREATE OR REPLACE FUNCTION public.link_historical_whatsapp_data(target_user_id uuid, user_phone text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  normalized_phone TEXT := public.normalize_phone(user_phone);
  total_updated INTEGER := 0;
  updated_count INTEGER;
BEGIN
  -- alimentacao
  UPDATE public.alimentacao
  SET user_id = target_user_id
  WHERE user_id IS NULL
    AND public.extract_phone_from_wa_id(wa_id) = normalized_phone;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;

  -- financeiro
  UPDATE public.financeiro
  SET user_id = target_user_id
  WHERE user_id IS NULL
    AND public.extract_phone_from_wa_id(wa_id) = normalized_phone;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;

  -- atividade_fisica
  UPDATE public.atividade_fisica
  SET user_id = target_user_id
  WHERE user_id IS NULL
    AND public.extract_phone_from_wa_id(wa_id) = normalized_phone;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;

  -- cultura
  UPDATE public.cultura
  SET user_id = target_user_id
  WHERE user_id IS NULL
    AND public.extract_phone_from_wa_id(wa_id) = normalized_phone;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;

  -- habitos
  UPDATE public.habitos
  SET user_id = target_user_id
  WHERE user_id IS NULL
    AND public.extract_phone_from_wa_id(wa_id) = normalized_phone;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;

  RETURN total_updated;
END;
$function$;

-- 6) Triggers para ligar automaticamente (na inserção e quando o wa_id mudar)
-- alimentacao
DROP TRIGGER IF EXISTS a_link_whatsapp_data ON public.alimentacao;
CREATE TRIGGER a_link_whatsapp_data
BEFORE INSERT ON public.alimentacao
FOR EACH ROW EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS a_link_whatsapp_data_upd ON public.alimentacao;
CREATE TRIGGER a_link_whatsapp_data_upd
BEFORE UPDATE OF wa_id ON public.alimentacao
FOR EACH ROW
WHEN (NEW.wa_id IS DISTINCT FROM OLD.wa_id)
EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS b_set_user_id ON public.alimentacao;
CREATE TRIGGER b_set_user_id
BEFORE INSERT ON public.alimentacao
FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- financeiro
DROP TRIGGER IF EXISTS a_link_whatsapp_data ON public.financeiro;
CREATE TRIGGER a_link_whatsapp_data
BEFORE INSERT ON public.financeiro
FOR EACH ROW EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS a_link_whatsapp_data_upd ON public.financeiro;
CREATE TRIGGER a_link_whatsapp_data_upd
BEFORE UPDATE OF wa_id ON public.financeiro
FOR EACH ROW
WHEN (NEW.wa_id IS DISTINCT FROM OLD.wa_id)
EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS b_set_user_id ON public.financeiro;
CREATE TRIGGER b_set_user_id
BEFORE INSERT ON public.financeiro
FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- atividade_fisica
DROP TRIGGER IF EXISTS a_link_whatsapp_data ON public.atividade_fisica;
CREATE TRIGGER a_link_whatsapp_data
BEFORE INSERT ON public.atividade_fisica
FOR EACH ROW EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS a_link_whatsapp_data_upd ON public.atividade_fisica;
CREATE TRIGGER a_link_whatsapp_data_upd
BEFORE UPDATE OF wa_id ON public.atividade_fisica
FOR EACH ROW
WHEN (NEW.wa_id IS DISTINCT FROM OLD.wa_id)
EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS b_set_user_id ON public.atividade_fisica;
CREATE TRIGGER b_set_user_id
BEFORE INSERT ON public.atividade_fisica
FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- cultura
DROP TRIGGER IF EXISTS a_link_whatsapp_data ON public.cultura;
CREATE TRIGGER a_link_whatsapp_data
BEFORE INSERT ON public.cultura
FOR EACH ROW EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS a_link_whatsapp_data_upd ON public.cultura;
CREATE TRIGGER a_link_whatsapp_data_upd
BEFORE UPDATE OF wa_id ON public.cultura
FOR EACH ROW
WHEN (NEW.wa_id IS DISTINCT FROM OLD.wa_id)
EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS b_set_user_id ON public.cultura;
CREATE TRIGGER b_set_user_id
BEFORE INSERT ON public.cultura
FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- habitos
DROP TRIGGER IF EXISTS a_link_whatsapp_data ON public.habitos;
CREATE TRIGGER a_link_whatsapp_data
BEFORE INSERT ON public.habitos
FOR EACH ROW EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS a_link_whatsapp_data_upd ON public.habitos;
CREATE TRIGGER a_link_whatsapp_data_upd
BEFORE UPDATE OF wa_id ON public.habitos
FOR EACH ROW
WHEN (NEW.wa_id IS DISTINCT FROM OLD.wa_id)
EXECUTE FUNCTION public.link_whatsapp_data();

DROP TRIGGER IF EXISTS b_set_user_id ON public.habitos;
CREATE TRIGGER b_set_user_id
BEFORE INSERT ON public.habitos
FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- 7) Backfill: vincular dados históricos existentes
UPDATE public.alimentacao a
SET user_id = p.id
FROM public.profiles p
WHERE a.user_id IS NULL
  AND public.extract_phone_from_wa_id(a.wa_id) = public.normalize_phone(p.phone_number);

UPDATE public.financeiro f
SET user_id = p.id
FROM public.profiles p
WHERE f.user_id IS NULL
  AND public.extract_phone_from_wa_id(f.wa_id) = public.normalize_phone(p.phone_number);

UPDATE public.atividade_fisica af
SET user_id = p.id
FROM public.profiles p
WHERE af.user_id IS NULL
  AND public.extract_phone_from_wa_id(af.wa_id) = public.normalize_phone(p.phone_number);

UPDATE public.cultura c
SET user_id = p.id
FROM public.profiles p
WHERE c.user_id IS NULL
  AND public.extract_phone_from_wa_id(c.wa_id) = public.normalize_phone(p.phone_number);

UPDATE public.habitos h
SET user_id = p.id
FROM public.profiles p
WHERE h.user_id IS NULL
  AND public.extract_phone_from_wa_id(h.wa_id) = public.normalize_phone(p.phone_number);

-- (Opcional) Índices para acelerar comparações por wa_id normalizado
-- Requer a função normalize_phone/ extract_phone serem IMUTÁVEIS (definido acima)
CREATE INDEX IF NOT EXISTS idx_alimentacao_norm_wa ON public.alimentacao ((public.extract_phone_from_wa_id(wa_id))) WHERE wa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financeiro_norm_wa ON public.financeiro ((public.extract_phone_from_wa_id(wa_id))) WHERE wa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_atividade_fisica_norm_wa ON public.atividade_fisica ((public.extract_phone_from_wa_id(wa_id))) WHERE wa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cultura_norm_wa ON public.cultura ((public.extract_phone_from_wa_id(wa_id))) WHERE wa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habitos_norm_wa ON public.habitos ((public.extract_phone_from_wa_id(wa_id))) WHERE wa_id IS NOT NULL;
