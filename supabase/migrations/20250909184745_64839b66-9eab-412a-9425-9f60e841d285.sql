-- Add default_view column to calendar_settings table
ALTER TABLE public.calendar_settings 
ADD COLUMN default_view text NOT NULL DEFAULT 'WEEK';

-- Update existing records to use weekly view as default
UPDATE public.calendar_settings 
SET default_view = 'WEEK' 
WHERE default_view IS NULL;