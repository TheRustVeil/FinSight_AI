'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface DateParams {
  startDate: string;
  endDate: string;
  accountId?: string;
}

export function useDashboardSummary(params: DateParams) {
  return useQuery({
    queryKey: ['dashboard', 'summary', params],
    queryFn: () => apiClient.get('/dashboard/summary', { params }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSpendingTrend(months = 6) {
  return useQuery({
    queryKey: ['dashboard', 'trend', months],
    queryFn: () => apiClient.get('/dashboard/spending-trend', { params: { months } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboardCategories(params: DateParams) {
  return useQuery({
    queryKey: ['dashboard', 'categories', params],
    queryFn: () => apiClient.get('/dashboard/category-breakdown', { params }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTopMerchants(params: DateParams & { limit?: number }) {
  return useQuery({
    queryKey: ['dashboard', 'merchants', params],
    queryFn: () => apiClient.get('/dashboard/top-merchants', { params }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecurringSubscriptions() {
  return useQuery({
    queryKey: ['dashboard', 'subscriptions'],
    queryFn: () => apiClient.get('/dashboard/recurring-subscriptions').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCashFlow(params: DateParams) {
  return useQuery({
    queryKey: ['dashboard', 'cashflow', params],
    queryFn: () => apiClient.get('/dashboard/cash-flow', { params }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useHeatmap(year: number, month: number) {
  return useQuery({
    queryKey: ['dashboard', 'heatmap', year, month],
    queryFn: () => apiClient.get('/dashboard/heatmap', { params: { year, month } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
