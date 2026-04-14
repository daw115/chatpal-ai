
-- Add pinned column to conversations
ALTER TABLE public.conversations ADD COLUMN pinned boolean NOT NULL DEFAULT false;

-- Create conversation_folders table
CREATE TABLE public.conversation_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON public.conversation_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own folders" ON public.conversation_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.conversation_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.conversation_folders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_conversation_folders_updated_at
BEFORE UPDATE ON public.conversation_folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id to conversations
ALTER TABLE public.conversations ADD COLUMN folder_id uuid REFERENCES public.conversation_folders(id) ON DELETE SET NULL;
