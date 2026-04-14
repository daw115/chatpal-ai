export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export const MODELS: AIModel[] = [
  // OpenAI
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "openai/gpt-4", name: "GPT-4", provider: "OpenAI" },
  { id: "openai/o1-preview", name: "o1 Preview", provider: "OpenAI" },
  { id: "openai/o1-mini", name: "o1 Mini", provider: "OpenAI" },
  // Anthropic
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "anthropic/claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic" },
  // Google
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google" },
  { id: "google/gemini-flash-1.5", name: "Gemini Flash 1.5", provider: "Google" },
  // Meta
  { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B", provider: "Meta" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "Meta" },
  { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B", provider: "Meta" },
  // Mistral
  { id: "mistralai/mistral-large", name: "Mistral Large", provider: "Mistral" },
  { id: "mistralai/mixtral-8x7b-instruct", name: "Mixtral 8x7B", provider: "Mistral" },
];
