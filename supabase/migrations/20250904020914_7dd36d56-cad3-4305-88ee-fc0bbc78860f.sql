-- Create investments table
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_investimento TEXT NOT NULL,
  tipo_investimento TEXT NOT NULL,
  corretora TEXT NOT NULL,
  valor_investido DECIMAL(15,2) NOT NULL,
  preco_atual DECIMAL(15,2) NOT NULL,
  quantidade DECIMAL(15,6) NOT NULL,
  data_investimento DATE NOT NULL,
  data_atualizacao_preco TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own investments" 
ON public.investments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investments" 
ON public.investments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments" 
ON public.investments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments" 
ON public.investments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_investments_updated_at
BEFORE UPDATE ON public.investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();