'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

interface RegisterInput { fullName: string; email: string; password: string; }
interface LoginInput { email: string; password: string; }

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterInput) => apiClient.post('/auth/register', data).then((r) => r.data),
  });
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => apiClient.post('/auth/login', data).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      router.push('/dashboard');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout').then((r) => r.data),
    onSettled: () => {
      logout();
      router.push('/login');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: { email: string }) => apiClient.post('/auth/forgot-password', data).then((r) => r.data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      apiClient.post('/auth/reset-password', data).then((r) => r.data),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (data: { token: string }) => apiClient.post('/auth/verify-email', data).then((r) => r.data),
  });
}

export function useMe() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me').then((r) => r.data.user),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });
}
