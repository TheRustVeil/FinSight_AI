'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: () => apiClient.get('/insights').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInsightUnreadCount() {
  return useQuery({
    queryKey: ['insights', 'unread-count'],
    queryFn: () => apiClient.get('/insights/unread-count').then((r) => r.data.count as number),
    staleTime: 60 * 1000,
  });
}

export function useSpendingForecast() {
  return useQuery({
    queryKey: ['insights', 'forecast'],
    queryFn: () => apiClient.get('/insights/forecast').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useGenerateInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/insights/generate').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}

export function useMarkInsightRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/insights/${id}/read`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}

export function useDismissInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/insights/${id}/dismiss`).then((r) => r.data),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['insights'] });
      const prev = qc.getQueryData(['insights']);
      qc.setQueryData(['insights'], (old: { id: string }[] | undefined) => (old ?? []).filter((i) => i.id !== id));
      return { prev };
    },
    onError: (_err, _id, ctx) => qc.setQueryData(['insights'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch('/insights/read-all').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}
