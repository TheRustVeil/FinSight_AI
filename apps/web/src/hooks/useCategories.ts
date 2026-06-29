'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.get('/categories').then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });
}
