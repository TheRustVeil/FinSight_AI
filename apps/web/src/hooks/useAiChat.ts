'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export function useConversations() {
  return useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: () => apiClient.get('/ai/conversations').then((r) => r.data as Conversation[]),
    staleTime: 30 * 1000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['ai', 'conversation', id],
    queryFn: () => apiClient.get(`/ai/conversations/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (firstMessage: string) =>
      apiClient.post('/ai/conversations', { firstMessage }).then((r) => r.data as Conversation),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/ai/conversations/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] }),
  });
}

// Streaming message sender — returns an async generator of text chunks.
// This uses a raw fetch (needed for the streaming body) instead of apiClient,
// so it must replicate apiClient's 401 auto-refresh: the access token lives in
// memory only and is null after a page refresh / expires after 15 min.
async function postMessage(conversationId: string, content: string, token: string | null) {
  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1`;
  return fetch(`${baseUrl}/ai/conversations/${conversationId}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
  });
}

async function refreshAccessToken(): Promise<string | null> {
  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1`;
  try {
    const res = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.accessToken) {
      useAuthStore.getState().setAccessToken(data.accessToken);
      return data.accessToken as string;
    }
  } catch { /* fall through */ }
  return null;
}

export async function* streamMessage(conversationId: string, content: string, token: string | null): AsyncGenerator<{ type: string; content?: string; messageId?: string; message?: string }> {
  let response = await postMessage(conversationId, content, token);

  // Token missing/expired → refresh once via the HttpOnly cookie and retry.
  if (response.status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      response = await postMessage(conversationId, content, fresh);
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(err.error?.message ?? 'Failed to send message');
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6));
        } catch { /* ignore malformed lines */ }
      }
    }
  }
}
