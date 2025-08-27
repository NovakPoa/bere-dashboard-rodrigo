-- Create habit_definitions table for habit configurations
CREATE TABLE public.habit_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_sessions INTEGER NOT NULL DEFAULT 1,
  target_time_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on habit_definitions
ALTER TABLE public.habit_definitions ENABLE ROW LEVEL SECURITY;

-- Create policies for habit_definitions
CREATE POLICY "Users can view their own habit definitions" 
ON public.habit_definitions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habit definitions" 
ON public.habit_definitions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit definitions" 
ON public.habit_definitions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit definitions" 
ON public.habit_definitions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create habit_sessions table for daily session logs
CREATE TABLE public.habit_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habit_definitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  sessions_completed INTEGER NOT NULL DEFAULT 0,
  time_spent_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(habit_id, date)
);

-- Enable RLS on habit_sessions
ALTER TABLE public.habit_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for habit_sessions
CREATE POLICY "Users can view their own habit sessions" 
ON public.habit_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habit sessions" 
ON public.habit_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit sessions" 
ON public.habit_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit sessions" 
ON public.habit_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on habit_definitions
CREATE TRIGGER update_habit_definitions_updated_at
BEFORE UPDATE ON public.habit_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on habit_sessions
CREATE TRIGGER update_habit_sessions_updated_at
BEFORE UPDATE ON public.habit_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing habits data to new structure
-- First, create habit definitions from unique habit names in the habitos table
INSERT INTO public.habit_definitions (user_id, name, target_sessions, target_time_minutes)
SELECT DISTINCT 
  user_id,
  nome as name,
  COALESCE(quantidade_sessoes, 1) as target_sessions,
  COALESCE(tempo_total_sessoes, 30) as target_time_minutes
FROM public.habitos 
WHERE user_id IS NOT NULL AND nome IS NOT NULL;