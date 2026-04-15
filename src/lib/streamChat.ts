import * as api from './api';

type Msg = { role: "user" | "assistant" | "system"; content: string };

export async function streamChat({
  messages,
  model,
  conversationId,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: Msg[];
  model: string;
  conversationId?: string;
  onDelta: (text: string) => void;
  onDone: (usage?: { prompt_tokens: number; completion_tokens: number }) => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}) {
  await api.streamChat({
    messages,
    model,
    conversationId,
    onDelta,
    onDone,
    onError,
    signal,
  });
}
