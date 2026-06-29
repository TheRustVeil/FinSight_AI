'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Loader2, User, Mail, Lock, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useRegister } from '@/hooks/useAuth';

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [success, setSuccess] = useState(false);
  const { mutate: register, isPending, error } = useRegister();

  const { register: reg, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const apiError = (error as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error?.message;

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
        <p className="text-muted-foreground text-sm">
          We sent a verification link to your email address. Click it to activate your account.
        </p>
        <Link href="/login" className="mt-6 inline-block text-primary hover:text-primary/80 text-sm font-medium">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
      <p className="text-muted-foreground text-sm mb-6">Start your financial journey with AI</p>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit((d) => register(d, { onSuccess: () => setSuccess(true) }))} className="space-y-4">
        <div>
          <label className="text-muted-foreground text-sm font-medium block mb-1.5">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              {...reg('fullName')}
              placeholder="Rahul Sharma"
              className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>
          {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="text-muted-foreground text-sm font-medium block mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              {...reg('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="text-muted-foreground text-sm font-medium block mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              {...reg('password')}
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-muted-foreground text-sm mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:text-primary/80 font-medium">Sign in</Link>
      </p>

      <p className="text-center text-muted-foreground text-xs mt-4">
        By creating an account, you agree to our{' '}
        <span className="text-muted-foreground">Terms of Service</span> and{' '}
        <span className="text-muted-foreground">Privacy Policy</span>
      </p>
    </>
  );
}
