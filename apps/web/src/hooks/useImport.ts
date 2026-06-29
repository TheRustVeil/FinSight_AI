'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ColumnMapping {
  date: string;
  amount: string;
  merchant?: string;
  description?: string;
  type?: string;
  typeExpenseValue?: string;
}

export interface CsvPreview {
  headers: string[];
  rows: Record<string, string>[];
}

export function useImportBatches() {
  return useQuery({
    queryKey: ['import', 'batches'],
    queryFn: () => apiClient.get('/import').then((r) => r.data),
  });
}

export function useImportBatch(batchId: string | null) {
  return useQuery({
    queryKey: ['import', 'batch', batchId],
    queryFn: () => apiClient.get(`/import/${batchId}`).then((r) => r.data),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const status = (query.state.data as { batch?: { status: string } })?.batch?.status;
      return status === 'processing' || status === 'pending' ? 2000 : false;
    },
  });
}

export function usePreviewCsv() {
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiClient.post<CsvPreview>('/import/preview', fd).then((r) => r.data);
    },
  });
}

export function useStartImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, mapping, accountId }: { file: File; mapping: ColumnMapping; accountId?: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mapping', JSON.stringify(mapping));
      if (accountId) fd.append('accountId', accountId);
      return apiClient.post('/import', fd).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => apiClient.delete(`/import/${batchId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
