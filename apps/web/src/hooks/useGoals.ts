'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  targetDate?: string;
  category?: string;
}

export interface AddContributionInput {
  amount: number;
  notes?: string;
  contributedAt?: string;
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => apiClient.get('/goals').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useGoal(id: string | null) {
  return useQuery({
    queryKey: ['goals', id],
    queryFn: () => apiClient.get(`/goals/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalInput) => apiClient.post('/goals', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateGoalInput> }) =>
      apiClient.patch(`/goals/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/goals/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: AddContributionInput }) =>
      apiClient.post(`/goals/${goalId}/contributions`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) =>
      apiClient.delete(`/goals/${goalId}/contributions/${contributionId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}
