-- Add installment columns to financeiro table
ALTER TABLE public.financeiro 
ADD COLUMN installments_total integer,
ADD COLUMN installment_number integer,
ADD COLUMN original_expense_id bigint,
ADD COLUMN is_installment boolean DEFAULT false;

-- Create index for better performance on installment queries
CREATE INDEX idx_financeiro_original_expense_id ON public.financeiro(original_expense_id);
CREATE INDEX idx_financeiro_is_installment ON public.financeiro(is_installment);