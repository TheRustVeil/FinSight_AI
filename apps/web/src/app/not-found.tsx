import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <p className="text-[120px] font-bold leading-none bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-16 h-16 text-foreground/5" strokeWidth={1} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
        <p className="text-muted-foreground text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          <Home className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
