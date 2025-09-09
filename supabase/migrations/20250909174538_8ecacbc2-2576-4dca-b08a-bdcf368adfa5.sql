-- Add UPDATE and DELETE policies for atividade_fisica table
CREATE POLICY "Users can update own activities" 
ON public.atividade_fisica 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own activities" 
ON public.atividade_fisica 
FOR DELETE 
USING (user_id = auth.uid());