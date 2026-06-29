'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface TransactionFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
  type?: 'income' | 'expense' | 'transfer';
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'date' | 'amount' | 'merchant';
  sortOrder?: 'asc' | 'desc';
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiClient.get('/transactions', { params: filters }).then((r) => r.data),
    staleTime: 60 * 1000,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => apiClient.get(`/transactions/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post('/transactions', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/transactions/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/transactions/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useConfirmCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      apiClient.post(`/transactions/${id}/confirm-category`, { categoryId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useTransactionSummary(params: { startDate?: string; endDate?: string; accountId?: string } = {}) {
  return useQuery({
    queryKey: ['dashboard', 'summary', params],
    queryFn: () => apiClient.get('/transactions/stats/summary', { params }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCategoryBreakdown(params: { startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: ['dashboard', 'by-category', params],
    queryFn: () => apiClient.get('/transactions/stats/by-category', { params }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSpendingTrend(months = 6) {
  return useQuery({
    queryKey: ['dashboard', 'trend', months],
    queryFn: () => apiClient.get('/transactions/stats/trend', { params: { months } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopMerchants(params: { startDate?: string; endDate?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['dashboard', 'merchants', params],
    queryFn: () => apiClient.get('/transactions/stats/by-merchant', { params }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}
