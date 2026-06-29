'use client';

import { Menu, LogOut, User, Settings } from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { NotificationCenter } from './NotificationCenter';
import Link from 'next/link';
import { useState } from 'react';

export function Topbar() {
  const { toggleSidebar, toggleMobileSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      {/* Desktop: collapse sidebar. Mobile: open drawer */}
      <button
        onClick={toggleSidebar}
        className="hidden lg:block text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-accent"
      >
        <Menu className="w-5 h-5" />
      </button>
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-accent"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationCenter />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg hover:bg-accent px-2 py-1.5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-none">{user?.fullName}</p>
              <p className="label-mono mt-1">{user?.plan} plan</p>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <User className="w-4 h-4" /> Profile
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <div className="border-t border-border" />
              <button
                onClick={() => { setDropdownOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
