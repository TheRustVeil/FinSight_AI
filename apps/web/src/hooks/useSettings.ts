'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  currency: string;
  timezone: string;
  plan?: string;
  createdAt: string;
}

export interface UserPreferences {
  notificationEmail: boolean;
  notificationInApp: boolean;
  budgetAlertThreshold: number;
  aiAutoCategorize: boolean;
  theme: 'light' | 'dark' | 'system';
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.get('/users/me').then((r) => r.data as UserProfile),
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => apiClient.get('/users/me/preferences').then((r) => r.data as UserPreferences),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (data: Partial<UserProfile>) => apiClient.patch('/users/me', data).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      const current = useAuthStore.getState().user;
      if (current && data) setUser({ ...current, ...data });
    },
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) => apiClient.patch('/users/me/preferences', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preferences'] }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => apiClient.delete('/users/me').then((r) => r.data),
  });
}
