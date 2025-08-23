-- Create storage bucket for organization images
INSERT INTO storage.buckets (id, name, public) VALUES ('org-images', 'org-images', true);

-- Create policies for organization images
CREATE POLICY "Users can view org images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'org-images');

CREATE POLICY "Users can upload their own org images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'org-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own org images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'org-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own org images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'org-images' AND auth.uid()::text = (storage.foldername(name))[1]);