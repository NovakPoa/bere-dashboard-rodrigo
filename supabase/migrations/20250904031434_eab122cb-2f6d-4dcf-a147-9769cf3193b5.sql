-- Add health profile fields to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN height NUMERIC,
ADD COLUMN weight NUMERIC,
ADD COLUMN age INTEGER,
ADD COLUMN gender TEXT CHECK (gender IN ('masculino', 'feminino')),
ADD COLUMN activity_level TEXT CHECK (activity_level IN ('sedentario', 'levemente_ativo', 'moderadamente_ativo', 'muito_ativo', 'super_ativo'));