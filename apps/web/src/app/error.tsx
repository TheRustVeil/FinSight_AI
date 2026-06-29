'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production this would report to an error tracking service (Sentry, etc.)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mb-2">
          An unexpected error occurred. You can try again or head back to your dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono mb-4">Error ID: {error.digest}</p>
        )}

        {/* Surface the real error so crashes are diagnosable (dev only). */}
        {process.env.NODE_ENV === 'development' && (error.message || error.stack) && (
          <details className="text-left mb-6 bg-muted/50 border border-border rounded-lg p-4" open>
            <summary className="cursor-pointer text-sm font-medium text-foreground mb-2">
              {error.message || 'Error details'}
            </summary>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words overflow-auto max-h-64 mt-2">
              {error.stack}
            </pre>
          </details>
        )}
        <div className="flex gap-3 justify-center mt-8">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <RotateCw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border border-border hover:bg-muted text-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
