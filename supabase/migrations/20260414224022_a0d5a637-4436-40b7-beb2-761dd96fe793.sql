
CREATE TABLE public.custom_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Bot',
  system_prompt text NOT NULL DEFAULT '',
  default_model text NOT NULL DEFAULT 'gemini-3-flash',
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom agents" ON public.custom_agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own custom agents" ON public.custom_agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom agents" ON public.custom_agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom agents" ON public.custom_agents FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_custom_agents_updated_at
BEFORE UPDATE ON public.custom_agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
