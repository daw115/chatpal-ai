
-- Add shared_token column
ALTER TABLE public.conversations ADD COLUMN shared_token uuid DEFAULT NULL;
CREATE UNIQUE INDEX idx_conversations_shared_token ON public.conversations(shared_token) WHERE shared_token IS NOT NULL;

-- Allow anyone to read shared conversations by token
CREATE POLICY "Anyone can view shared conversations"
ON public.conversations FOR SELECT
USING (shared_token IS NOT NULL);

-- Allow anyone to read messages of shared conversations
CREATE POLICY "Anyone can view messages of shared conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.shared_token IS NOT NULL
  )
);
