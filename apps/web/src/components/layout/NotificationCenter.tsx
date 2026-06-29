'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, CheckCheck, AlertTriangle, Info, TrendingUp, X } from 'lucide-react';
import {
  useNotifications,
  useNotificationUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearAllNotifications,
  type Notification,
} from '@/hooks/useNotifications';
import { formatRelative } from '@/lib/formatters';

const TYPE_ICON: Record<string, { Icon: React.ElementType; color: string }> = {
  budget_alert:   { Icon: AlertTriangle, color: 'text-red-500' },
  spending_spike: { Icon: TrendingUp, color: 'text-yellow-500' },
  insight:        { Icon: Info, color: 'text-blue-500' },
  goal_reached:   { Icon: Check, color: 'text-green-500' },
};

function NotificationRow({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const markRead = useMarkNotificationRead();
  const del = useDeleteNotification();
  const cfg = TYPE_ICON[notification.type] ?? { Icon: Info, color: 'text-primary' };

  return (
    <div
      className={`group flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${!notification.isRead ? 'bg-primary/10' : ''}`}
      onMouseEnter={() => { if (!notification.isRead) markRead.mutate(notification.id); }}
    >
      <div className="shrink-0 mt-0.5">
        <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{notification.title}</p>
        {notification.body && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notification.body}</p>}
        <p className="text-xs text-muted-foreground/70 mt-1">{formatRelative(notification.createdAt)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); del.mutate(notification.id); }}
        className="shrink-0 self-start p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useNotificationUnreadCount();
  const markAllRead = useMarkAllNotificationsRead();
  const clearAll = useClearAllNotifications();

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const list = notifications as Notification[];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">
              Notifications {unreadCount > 0 && <span className="text-primary">({unreadCount})</span>}
            </p>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {list.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              list.map((n) => <NotificationRow key={n.id} notification={n} onClose={() => setOpen(false)} />)
            )}
          </div>

          {/* Footer */}
          {list.length > 0 && (
            <button
              onClick={() => clearAll.mutate()}
              className="w-full px-4 py-2.5 border-t border-border text-xs text-muted-foreground hover:text-red-500 hover:bg-muted/50 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
