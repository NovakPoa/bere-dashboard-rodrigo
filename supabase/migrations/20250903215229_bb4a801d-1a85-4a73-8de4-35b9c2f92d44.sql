-- Enable RLS on remaining tables that need it

-- org_blocks table - enable RLS if not already enabled
ALTER TABLE public.org_blocks ENABLE ROW LEVEL SECURITY;

-- org_pages table - enable RLS if not already enabled  
ALTER TABLE public.org_pages ENABLE ROW LEVEL SECURITY;

-- habit_definitions table - enable RLS if not already enabled
ALTER TABLE public.habit_definitions ENABLE ROW LEVEL SECURITY;

-- habit_sessions table - enable RLS if not already enabled
ALTER TABLE public.habit_sessions ENABLE ROW LEVEL SECURITY;

-- profiles table - enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- calendar_settings table - enable RLS if not already enabled
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on alimentacao table if not already enabled
ALTER TABLE public.alimentacao ENABLE ROW LEVEL SECURITY;

-- Enable RLS on atividade_fisica table if not already enabled  
ALTER TABLE public.atividade_fisica ENABLE ROW LEVEL SECURITY;

-- Enable RLS on cultura table if not already enabled
ALTER TABLE public.cultura ENABLE ROW LEVEL SECURITY;

-- Enable RLS on financeiro table if not already enabled
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- Enable RLS on habitos table if not already enabled
ALTER TABLE public.habitos ENABLE ROW LEVEL SECURITY;