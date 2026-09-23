"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X } from "lucide-react";
import { useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@turna/types";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
}

export function NotificationBell({ notifications, unreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2 text-muted hover:text-forest hover:bg-border/40 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 card bg-white/95 backdrop-blur-xl border-border/60 shadow-card p-0 overflow-hidden"
              role="dialog"
              aria-label="Notifications"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                <p className="font-semibold text-forest text-sm">Notifications</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted hover:text-forest p-1"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="w-6 h-6 text-muted mx-auto mb-2" />
                    <p className="text-sm text-muted">No notifications yet.</p>
                  </div>
                ) : (
                  <ul>
                    {notifications.slice(0, 8).map((n) => (
                      <li
                        key={n.id}
                        className={`px-4 py-3 border-b border-border/40 last:border-0 ${
                          n.status !== "read" ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-forest">{n.title}</p>
                          {n.status !== "read" && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[11px] text-muted mt-1">
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
                className="block px-4 py-3 text-center text-sm font-medium text-primary hover:bg-primary/5 transition-colors border-t border-border/60"
              >
                View all notifications
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
