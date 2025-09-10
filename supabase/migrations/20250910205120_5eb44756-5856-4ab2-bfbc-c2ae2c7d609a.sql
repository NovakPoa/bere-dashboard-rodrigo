-- Fix the security definer view issue by dropping and recreating the view properly
DROP VIEW IF EXISTS public.habit_sessions_with_names;

-- Recreate the view without security definer to respect RLS
CREATE VIEW public.habit_sessions_with_names AS
SELECT 
  hs.id,
  hs.user_id,
  hs.habit_id,
  hd.name as habit_name,
  hs.date,
  hs.sessions_completed,
  hs.time_spent_minutes,
  hs.created_at,
  hs.updated_at
FROM public.habit_sessions hs
JOIN public.habit_definitions hd ON hs.habit_id = hd.id;