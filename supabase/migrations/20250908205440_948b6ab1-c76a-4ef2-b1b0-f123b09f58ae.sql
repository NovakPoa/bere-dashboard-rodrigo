-- Create investment_prices table for historical price tracking
CREATE TABLE IF NOT EXISTS public.investment_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID NOT NULL,
  price NUMERIC NOT NULL,
  price_date DATE NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.investment_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own investment prices" 
ON public.investment_prices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investment prices" 
ON public.investment_prices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment prices" 
ON public.investment_prices 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment prices" 
ON public.investment_prices 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add foreign key constraint
ALTER TABLE public.investment_prices 
ADD CONSTRAINT fk_investment_prices_investment_id 
FOREIGN KEY (investment_id) REFERENCES public.investments(id) ON DELETE CASCADE;

-- Create unique constraint to prevent duplicate prices for same investment on same date
ALTER TABLE public.investment_prices 
ADD CONSTRAINT unique_investment_price_date 
UNIQUE (investment_id, price_date);

-- Create index for better performance
CREATE INDEX idx_investment_prices_investment_date 
ON public.investment_prices (investment_id, price_date DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_investment_prices_updated_at
BEFORE UPDATE ON public.investment_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();