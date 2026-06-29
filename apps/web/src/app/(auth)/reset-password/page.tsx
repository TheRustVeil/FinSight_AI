'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Loader2, Lock, CheckCircle } from 'lucide-react';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useResetPassword } from '@/hooks/useAuth';

const schema = z.object({
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const [done, setDone] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { mutate: resetPassword, isPending, error } = useResetPassword();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const apiError = (error as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error?.message;

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-red-400">Invalid reset link. Please request a new one.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-primary text-sm">Request new link</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Password reset!</h2>
        <p className="text-muted-foreground text-sm mb-6">You can now log in with your new password.</p>
        <Link href="/login" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground mb-1">Set new password</h1>
      <p className="text-muted-foreground text-sm mb-6">Choose a strong password for your account.</p>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
          {apiError}
        </div>
      )}

      <form
        onSubmit={handleSubmit((d) => resetPassword({ token, password: d.password }, { onSuccess: () => setDone(true) }))}
        className="space-y-4"
      >
        <div>
          <label className="text-muted-foreground text-sm font-medium block mb-1.5">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              {...register('password')}
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="text-muted-foreground text-sm font-medium block mb-1.5">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              {...register('confirm')}
              type="password"
              placeholder="Repeat your password"
              className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>
          {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
