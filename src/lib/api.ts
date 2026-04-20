// API client for Express backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken() {
  return authToken;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response;
}

// Auth API
export async function register(email: string, password: string) {
  const response = await fetchAPI('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  setAuthToken(data.token);
  return data;
}

export async function login(email: string, password: string) {
  const response = await fetchAPI('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  setAuthToken(data.token);
  return data;
}

export function logout() {
  setAuthToken(null);
}

export async function forgotPassword(email: string) {
  const response = await fetchAPI('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return response.json();
}

export async function resetPassword(token: string, password: string) {
  const response = await fetchAPI('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
  return response.json();
}

// Chat API
export async function streamChat({
  messages,
  model,
  conversationId,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: Array<{ role: string; content: string }>;
  model: string;
  conversationId?: string;
  onDelta: (text: string) => void;
  onDone: (usage?: { prompt_tokens: number; completion_tokens: number }) => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}) {
  try {
    const response = await fetchAPI('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, model, conversation_id: conversationId }),
      signal,
    });

    if (!response.body) {
      onError('No response body');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage: { prompt_tokens: number; completion_tokens: number } | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') {
          onDone(usage);
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.usage && !parsed.choices) {
            usage = parsed.usage;
            continue;
          }
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          // Skip unparseable lines
        }
      }
    }

    onDone(usage);
  } catch (error: any) {
    if (error.name === 'AbortError') return;
    onError(error.message || 'Chat request failed');
  }
}

// Conversations API
export async function getConversations() {
  const response = await fetchAPI('/api/conversations');
  return response.json();
}

export async function createConversation(title: string, model: string, agentId?: string) {
  const response = await fetchAPI('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, model, agent_id: agentId }),
  });
  return response.json();
}

export async function deleteConversation(id: string) {
  const response = await fetchAPI(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
  return response.json();
}

// Messages API
export async function getMessages(conversationId: string) {
  const response = await fetchAPI(`/api/conversations/${conversationId}/messages`);
  return response.json();
}

export async function createMessage(conversationId: string, role: string, content: string) {
  const response = await fetchAPI(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role, content }),
  });
  return response.json();
}
