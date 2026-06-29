'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface ReportRange {
  startDate: string;
  endDate: string;
  accountId?: string;
}

export function useSummaryReport(range: ReportRange) {
  return useQuery({
    queryKey: ['reports', 'summary', range],
    queryFn: () => apiClient.get('/reports/summary', { params: range }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

// Trigger a file download (CSV or JSON) using a blob response
export function useExportReport() {
  const [isExporting, setIsExporting] = useState<'csv' | 'json' | null>(null);

  async function exportFile(format: 'csv' | 'json', range: ReportRange) {
    setIsExporting(format);
    try {
      const response = await apiClient.get(`/reports/export/${format}`, {
        params: range,
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finsight-${format === 'csv' ? 'transactions' : 'report'}-${range.startDate}-to-${range.endDate}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(null);
    }
  }

  return { exportFile, isExporting };
}
