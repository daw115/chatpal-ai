export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export const MODELS: AIModel[] = [
  // Claude (Anthropic)
  { id: "claude-sonnet-4-6-thinking", name: "Claude Sonnet 4.6 Thinking", provider: "Anthropic" },
  { id: "claude-opus-4-6-thinking", name: "Claude Opus 4.6 Thinking", provider: "Anthropic" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "Anthropic" },
  // Gemini (Google)
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "Google" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "Google" },
  // GPT (OpenAI)
  { id: "gpt-5.1", name: "GPT-5.1", provider: "OpenAI" },
  { id: "gpt-5.1-codex", name: "GPT-5.1 Codex", provider: "OpenAI" },
  { id: "gpt-5.1-codex-max", name: "GPT-5.1 Codex Max", provider: "OpenAI" },
  { id: "gpt-5.2", name: "GPT-5.2", provider: "OpenAI" },
  { id: "gpt-5.2-codex", name: "GPT-5.2 Codex", provider: "OpenAI" },
  { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", provider: "OpenAI" },
  { id: "gpt-5.4", name: "GPT-5.4", provider: "OpenAI" },
];
