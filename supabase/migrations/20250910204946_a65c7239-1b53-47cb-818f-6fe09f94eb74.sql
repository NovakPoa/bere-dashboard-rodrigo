-- Create investment_transactions table
CREATE TABLE public.investment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price > 0),
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own investment transactions" 
ON public.investment_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investment transactions" 
ON public.investment_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment transactions" 
ON public.investment_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment transactions" 
ON public.investment_transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_investment_transactions_investment_id ON public.investment_transactions(investment_id);
CREATE INDEX idx_investment_transactions_user_id ON public.investment_transactions(user_id);
CREATE INDEX idx_investment_transactions_date ON public.investment_transactions(transaction_date);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_investment_transactions_updated_at
BEFORE UPDATE ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add new columns to investments table to track position status
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS current_quantity NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_purchase_price NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS realized_profit_loss NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false;