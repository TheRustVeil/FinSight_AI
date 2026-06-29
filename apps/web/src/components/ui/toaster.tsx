'use client';

import { useUIStore } from '@/stores/ui.store';
import { X } from 'lucide-react';

export function Toaster() {
  const { toasts, removeToast } = useUIStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm max-w-sm animate-fade-in ${
            t.variant === 'destructive'
              ? 'bg-red-950 border-red-800 text-red-200'
              : 'bg-card border-border text-foreground'
          }`}
        >
          <div className="flex-1">
            <p className="font-medium">{t.title}</p>
            {t.description && <p className="text-muted-foreground text-xs mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => removeToast(t.id)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
