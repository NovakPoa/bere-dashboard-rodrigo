-- Create table for investment monthly snapshots
CREATE TABLE public.investment_monthly_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  investment_id UUID NOT NULL,
  snapshot_date DATE NOT NULL, -- Always the last day of the month
  preco_unitario NUMERIC NOT NULL,
  quantidade NUMERIC NOT NULL, -- In case quantity changes
  valor_total_brl NUMERIC NOT NULL, -- Value converted to BRL at the time
  cotacao_dolar NUMERIC, -- Exchange rate used (if USD)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(investment_id, snapshot_date)
);

-- Enable Row Level Security
ALTER TABLE public.investment_monthly_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own investment snapshots" 
ON public.investment_monthly_snapshots 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investment snapshots" 
ON public.investment_monthly_snapshots 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment snapshots" 
ON public.investment_monthly_snapshots 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment snapshots" 
ON public.investment_monthly_snapshots 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add foreign key reference to investments table
ALTER TABLE public.investment_monthly_snapshots 
ADD CONSTRAINT fk_investment_snapshots_investment_id 
FOREIGN KEY (investment_id) REFERENCES public.investments(id) ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_investment_snapshots_updated_at
BEFORE UPDATE ON public.investment_monthly_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_investment_snapshots_user_date ON public.investment_monthly_snapshots(user_id, snapshot_date);
CREATE INDEX idx_investment_snapshots_investment_date ON public.investment_monthly_snapshots(investment_id, snapshot_date);