import type { Metadata } from 'next';
import { LogoMark } from '@/components/layout/Logo';
import { ClientOnly } from '@/components/shared/ClientOnly';

export const metadata: Metadata = { title: 'Auth' };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Engineering grid + radial fade */}
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,transparent_0%,hsl(var(--background))_70%)]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <LogoMark size={42} />
            <span className="text-2xl font-bold tracking-tight text-foreground">FinSight AI</span>
          </div>
          <p className="label-mono">Your AI-Powered Personal Finance Copilot</p>
        </div>

        {/* Card */}
        <div className="border border-border bg-card/80 backdrop-blur-sm rounded-xl p-8 shadow-2xl shadow-black/40">
          {/* Render the form only after mount: browser extensions (password
              managers / wallets) inject into password fields before React
              hydrates, which otherwise crashes the page with a hydration error. */}
          <ClientOnly
            fallback={
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            }
          >
            {children}
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
