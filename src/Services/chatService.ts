import { supabase } from '../lib/supabase';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl as string || 'http://10.0.2.2:8000';

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

// ─── Create a new chat session ────────────────────────────────────────────────
export async function createChatSession(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/chat/session`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type':  'application/json',
    },
  });

  if (!response.ok) throw new Error('Failed to create session');

  const data = await response.json();
  return data.session_id;
}

// ─── Stream a chat response from Medha ───────────────────────────────────────
export async function streamChat(params: {
  session_id: string;
  message:    string;
  history:    ChatMessage[];
  onToken:    (token: string) => void;      // called for each token
  onDone:     (sources: string[]) => void;  // called when stream ends
  onError:    (error: string) => void;      // called on error
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    params.onError('Not authenticated');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        session_id: params.session_id,
        message:    params.message,
        history:    params.history,
      }),
    });

    if (!response.ok) {
      params.onError(`Server error: ${response.status}`);
      return;
    }

    const reader  = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      params.onError('No response body');
      return;
    }

    // Read the stream chunk by chunk
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the chunk and split by SSE line breaks
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(6));

          if (data.token) {
            // Append token to the message bubble
            params.onToken(data.token);
          } else if (data.done) {
            // Stream complete — pass source dates for citation chips
            params.onDone(data.sources || []);
          } else if (data.error) {
            params.onError(data.error);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
  } catch (error: any) {
    params.onError(error.message || 'Connection failed');
  }
}

// ─── Get all chat sessions for sidebar ───────────────────────────────────────
export interface ChatSession {
  session_id:   string;
  title:        string;
  created_at:   string;
  last_message: string;
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const response = await fetch(`${API_URL}/api/chat/sessions`, {
    headers: { 'Authorization': `Bearer ${session.access_token}` },
  });
  if (!response.ok) return [];
  return response.json();
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const response = await fetch(`${API_URL}/api/chat/session/${sessionId}/messages`, {
    headers: { 'Authorization': `Bearer ${session.access_token}` },
  });
  if (!response.ok) return [];
  return response.json();
}