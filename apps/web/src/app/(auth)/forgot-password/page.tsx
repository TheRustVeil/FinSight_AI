'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useForgotPassword } from '@/hooks/useAuth';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { mutate: forgotPassword, isPending } = useForgotPassword();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (sent) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Check your inbox</h2>
        <p className="text-muted-foreground text-sm">If that email is registered, a reset link has been sent.</p>
        <Link href="/login" className="mt-6 inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href="/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-1">Forgot your password?</h1>
      <p className="text-muted-foreground text-sm mb-6">Enter your email and we&apos;ll send a reset link.</p>

      <form onSubmit={handleSubmit((d) => forgotPassword(d, { onSuccess: () => setSent(true) }))} className="space-y-4">
        <div>
          <label className="text-muted-foreground text-sm font-medium block mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </>
  );
}
