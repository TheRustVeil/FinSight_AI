'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // `isAuthenticated` is rehydrated from localStorage by zustand/persist, which
  // happens synchronously on the client BEFORE React's first render — but the
  // server always renders with the initial `false`. Gating on `mounted` keeps
  // the server HTML and the client's first paint identical (both null), so the
  // rehydrated value only applies after mount. Without this, the SSR/client
  // trees diverge and the App Router surfaces a hydration error as the global
  // "Something went wrong" boundary.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push('/login');
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div key={pathname} className="animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
