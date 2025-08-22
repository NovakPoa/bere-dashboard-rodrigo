-- Add user_id columns and update schemas
ALTER TABLE public.financeiro ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.alimentacao ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cultura ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.habitos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create trigger to automatically set user_id
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to all tables
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

-- Update RLS policies for financeiro table
DROP POLICY IF EXISTS "anon can select financeiro" ON public.financeiro;

CREATE POLICY "Users can view their own financeiro records"
ON public.financeiro FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financeiro records"
ON public.financeiro FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financeiro records"
ON public.financeiro FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financeiro records"
ON public.financeiro FOR DELETE
USING (auth.uid() = user_id);

-- Update RLS policies for alimentacao table
DROP POLICY IF EXISTS "Public read access for alimentacao" ON public.alimentacao;

CREATE POLICY "Users can view their own alimentacao records"
ON public.alimentacao FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alimentacao records"
ON public.alimentacao FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alimentacao records"
ON public.alimentacao FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alimentacao records"
ON public.alimentacao FOR DELETE
USING (auth.uid() = user_id);

-- Update RLS policies for cultura table
DROP POLICY IF EXISTS "Public read access for cultura" ON public.cultura;

CREATE POLICY "Users can view their own cultura records"
ON public.cultura FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cultura records"
ON public.cultura FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cultura records"
ON public.cultura FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cultura records"
ON public.cultura FOR DELETE
USING (auth.uid() = user_id);

-- Update RLS policies for habitos table
DROP POLICY IF EXISTS "Public read access for habitos" ON public.habitos;

CREATE POLICY "Users can view their own habitos records"
ON public.habitos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habitos records"
ON public.habitos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habitos records"
ON public.habitos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habitos records"
ON public.habitos FOR DELETE
USING (auth.uid() = user_id);