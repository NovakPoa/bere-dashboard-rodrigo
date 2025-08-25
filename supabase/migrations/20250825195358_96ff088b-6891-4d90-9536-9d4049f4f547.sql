-- Create profiles table for user data including phone number
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone_number TEXT UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to extract phone number from wa_id
CREATE OR REPLACE FUNCTION public.extract_phone_from_wa_id(wa_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Extract phone number from "whatsapp:+555181447811" format
  IF wa_id IS NULL OR NOT wa_id LIKE 'whatsapp:+%' THEN
    RETURN NULL;
  END IF;
  
  RETURN SUBSTRING(wa_id FROM 'whatsapp:\+(.*)');
END;
$$;

-- Function to link WhatsApp data to user
CREATE OR REPLACE FUNCTION public.link_whatsapp_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
$$;

-- Add triggers to all relevant tables
CREATE TRIGGER link_whatsapp_data_alimentacao
  BEFORE INSERT ON public.alimentacao
  FOR EACH ROW
  WHEN (NEW.wa_id IS NOT NULL AND NEW.user_id IS NULL)
  EXECUTE FUNCTION public.link_whatsapp_data();

CREATE TRIGGER link_whatsapp_data_financeiro
  BEFORE INSERT ON public.financeiro
  FOR EACH ROW
  WHEN (NEW.wa_id IS NOT NULL AND NEW.user_id IS NULL)
  EXECUTE FUNCTION public.link_whatsapp_data();

CREATE TRIGGER link_whatsapp_data_atividade_fisica
  BEFORE INSERT ON public.atividade_fisica
  FOR EACH ROW
  WHEN (NEW.wa_id IS NOT NULL AND NEW.user_id IS NULL)
  EXECUTE FUNCTION public.link_whatsapp_data();

CREATE TRIGGER link_whatsapp_data_cultura
  BEFORE INSERT ON public.cultura
  FOR EACH ROW
  WHEN (NEW.wa_id IS NOT NULL AND NEW.user_id IS NULL)
  EXECUTE FUNCTION public.link_whatsapp_data();

CREATE TRIGGER link_whatsapp_data_habitos
  BEFORE INSERT ON public.habitos
  FOR EACH ROW
  WHEN (NEW.wa_id IS NOT NULL AND NEW.user_id IS NULL)
  EXECUTE FUNCTION public.link_whatsapp_data();

-- Function to link historical WhatsApp data
CREATE OR REPLACE FUNCTION public.link_historical_whatsapp_data(target_user_id UUID, user_phone TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
$$;

-- Add updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();