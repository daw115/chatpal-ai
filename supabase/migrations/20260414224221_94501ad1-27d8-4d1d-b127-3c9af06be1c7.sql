
CREATE TABLE public.saved_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'Ogólne',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompts" ON public.saved_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own prompts" ON public.saved_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompts" ON public.saved_prompts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prompts" ON public.saved_prompts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_prompts_updated_at
BEFORE UPDATE ON public.saved_prompts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
