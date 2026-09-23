'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Bell, Check, X, Inbox } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Notification } from '@turna/types';

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
}

export function NotificationBell({ notifications, unreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.documentElement.classList.add('lock-scroll');
    } else {
      document.documentElement.classList.remove('lock-scroll');
    }
    return () => document.documentElement.classList.remove('lock-scroll');
  }, [open]);

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
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center px-1"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.span>
      )}
    </button>
  );

  const modal = mounted
    ? createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-forest/50 backdrop-blur-sm"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ type: 'spring', bounce: 0.22, duration: 0.4 }}
                className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-border bg-white shadow-card overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Notifications"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <p className="font-semibold text-forest text-sm">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="badge bg-primary/10 text-primary text-[10px]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-muted hover:text-forest p-1.5 rounded-lg hover:bg-border/50 transition-colors"
                    aria-label="Close notifications"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                            <p className="text-sm font-medium text-forest leading-snug">
                              {n.title}
                            </p>
                            {n.status !== 'read' && (
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                          <p className="text-[11px] text-muted/70 mt-1.5">
                            {formatRelativeTime(n.created_at)}
                          </p>
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <>
      {bell}
      {modal}
    </>
  );
}
