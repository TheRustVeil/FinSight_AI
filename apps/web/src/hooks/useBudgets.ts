'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface BudgetCategoryInput {
  categoryId: string;
  allocatedAmount: number;
  alertAtPercent?: number;
}

export interface CreateBudgetInput {
  name: string;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  totalAmount?: number;
  categories: BudgetCategoryInput[];
}

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiClient.get('/budgets').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useBudget(id: string | null) {
  return useQuery({
    queryKey: ['budgets', id],
    queryFn: () => apiClient.get(`/budgets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetInput) => apiClient.post('/budgets', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBudgetInput> }) =>
      apiClient.patch(`/budgets/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/budgets/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
