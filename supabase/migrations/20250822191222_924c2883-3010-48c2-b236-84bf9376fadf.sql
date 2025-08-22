-- Add category column to org_pages table
ALTER TABLE public.org_pages 
ADD COLUMN category text NOT NULL DEFAULT 'projetos';

-- Add content column to store HTML directly (not using blocks for now)
ALTER TABLE public.org_pages 
ADD COLUMN content text DEFAULT '';

-- Add check constraint to ensure valid categories
ALTER TABLE public.org_pages 
ADD CONSTRAINT valid_category CHECK (category IN ('tarefas', 'projetos'));