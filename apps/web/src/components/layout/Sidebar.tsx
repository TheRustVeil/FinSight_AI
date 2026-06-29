'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, Upload, BrainCircuit,
  PiggyBank, Target, Lightbulb, FileText,
  Settings, ChevronRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { LogoMark } from './Logo';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Import', href: '/import', icon: Upload },
  { label: 'AI Advisor', href: '/ai-advisor', icon: BrainCircuit },
  { label: 'Budgets', href: '/budgets', icon: PiggyBank },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Insights', href: '/insights', icon: Lightbulb },
  { label: 'Reports', href: '/reports', icon: FileText },
];

function NavContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <LogoMark size={32} />
        {!collapsed && (
          <span className="font-bold tracking-tight text-sidebar-foreground text-sm">
            Fin<span className="text-primary">Sight</span> AI
          </span>
        )}
        {onNavigate && (
          <button onClick={onNavigate} className="ml-auto lg:hidden text-muted-foreground hover:text-sidebar-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto px-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="px-2 pb-4 border-t border-sidebar-border pt-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-primary/10 hover:text-sidebar-foreground',
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </>
  );
}

export function Sidebar() {
  const { sidebarOpen, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const pathname = usePathname();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  return (
    <>
      {/* ── Desktop sidebar (inline, collapsible) ── */}
      <aside
        className={cn(
          'hidden lg:flex bg-sidebar flex-col transition-all duration-300 border-r border-sidebar-border shrink-0',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        <NavContent collapsed={!sidebarOpen} />
      </aside>

      {/* ── Mobile drawer (off-canvas) ── */}
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300',
          mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMobileSidebarOpen(false)}
      />
      {/* Drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-64 bg-sidebar flex flex-col border-r border-sidebar-border lg:hidden transition-transform duration-300',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <NavContent collapsed={false} onNavigate={() => setMobileSidebarOpen(false)} />
      </aside>
    </>
  );
}
