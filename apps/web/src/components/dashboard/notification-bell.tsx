'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, Inbox, CheckCheck } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/auth-actions';
import { ModalShell } from '@/components/modal-shell';
import { Spinner } from '@/components/spinner';
import type { Notification } from '@turna/types';

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
}

export function NotificationBell({ notifications, unreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Close on Escape (ModalShell also handles this — keep bell-level for safety)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function handleMarkAll() {
    startTransition(() => {
      void (async () => {
        await markAllNotificationsRead(null);
        setOpen(false);
        router.refresh();
      })();
    });
  }

  function handleMarkOne(id: string) {
    startTransition(() => {
      void (async () => {
        await markNotificationRead(id);
        router.refresh();
      })();
    });
  }

  const bell = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="relative rounded-xl p-2 text-muted hover:text-forest hover:bg-border/40 transition-colors dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <>
      {bell}
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        label="Notifications"
        maxWidth="max-w-md"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-primary shrink-0" />
            <p className="font-semibold text-forest text-sm">Notifications</p>
            {unreadCount > 0 && (
              <span className="badge bg-primary/10 text-primary text-[10px]">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-60"
                title="Mark all as read"
              >
                {isPending ? <Spinner className="w-3.5 h-3.5" /> : <CheckCheck className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Mark all</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-forest/70 hover:text-forest hover:bg-border/60 transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {notifications.length === 0 ? (
            <div className="py-14 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-forest mb-1">
                No notifications yet
              </p>
              <p className="text-xs text-muted">
                Updates about your circles will appear here.
              </p>
            </div>
          ) : (
            <ul>
              {notifications.slice(0, 12).map((n) => (
                <li
                  key={n.id}
                  className={`px-5 py-3.5 border-b border-border/40 last:border-0 transition-colors ${
                    n.status !== 'read' ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarkOne(n.id)}
                      disabled={n.status === 'read' || isPending}
                      className="text-left flex-1 min-w-0"
                      title={n.status === 'read' ? undefined : 'Mark as read'}
                    >
                      <p className="text-sm font-medium text-forest leading-snug">
                        {n.title}
                      </p>
                      <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                      <p className="text-[11px] text-muted/70 mt-1.5">
                        {formatRelativeTime(n.created_at)}
                      </p>
                    </button>
                    {n.status !== 'read' && (
                      <button
                        type="button"
                        onClick={() => handleMarkOne(n.id)}
                        disabled={isPending}
                        className="shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                        aria-label="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href="/dashboard/notifications"
          onClick={() => setOpen(false)}
          className="shrink-0 flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors border-t border-border/60"
        >
          View all notifications
          <Check className="w-3.5 h-3.5" />
        </Link>
      </ModalShell>
    </>
  );
}
