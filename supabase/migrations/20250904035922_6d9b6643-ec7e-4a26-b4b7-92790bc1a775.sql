-- Add currency support to investments table
ALTER TABLE public.investments 
ADD COLUMN moeda text NOT NULL DEFAULT 'BRL';

-- Add check constraint to ensure valid currencies
ALTER TABLE public.investments 
ADD CONSTRAINT investments_moeda_check 
CHECK (moeda IN ('BRL', 'USD'));