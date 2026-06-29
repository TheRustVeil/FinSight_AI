import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { QueryProvider } from '@/components/shared/QueryProvider';
import { DomMutationGuard } from '@/components/shared/DomMutationGuard';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: { default: 'FinSight AI', template: '%s | FinSight AI' },
  description: 'Your AI-Powered Personal Finance Copilot',
  keywords: ['finance', 'expense tracker', 'AI', 'budgeting', 'personal finance'],
  // Disable page-translation extensions (Google/Brave Translate). They rewrite
  // text nodes out from under React, causing "insertBefore ... not a child of
  // this node" crashes during reconciliation. Pairs with translate="no" below.
  other: { google: 'notranslate' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light notranslate" translate="no" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        {/* Patches Node.insertBefore/removeChild on client-module load (before
            React's commit phase) to survive translation-extension DOM mutation.
            See DomMutationGuard for why this isn't a <script>/next-script. */}
        <DomMutationGuard />
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
