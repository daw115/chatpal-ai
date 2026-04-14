
-- Create storage bucket for chat file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', false);

-- RLS: authenticated users can upload files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can read their own files
CREATE POLICY "Users can read own chat files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can delete their own files
CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);
