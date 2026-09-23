"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  PiggyBank,
  ArrowLeftRight,
  BookOpen,
  BarChart3,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { signOut } from "@/lib/auth-actions";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import type { Notification } from "@turna/types";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/circles", label: "Circles", icon: Users },
  { href: "/dashboard/contributions", label: "Contributions", icon: PiggyBank },
  { href: "/dashboard/payouts", label: "Payouts", icon: ArrowLeftRight },
  { href: "/dashboard/ledger", label: "Ledger", icon: BookOpen },
  { href: "/dashboard/insights", label: "Insights", icon: BarChart3 },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

interface DashboardNavProps {
  user: {
    email?: string | null;
    displayName?: string | null;
  };
  notifications?: Notification[];
  unreadCount?: number;
}

export function DashboardNav({
  user,
  notifications = [],
  unreadCount = 0,
}: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-forest text-white border-r border-white/10 z-40">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo variant="on-dark" size={28} />
            <span className="font-display text-lg font-bold tracking-tight">
              Turna
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "text-primary-light"
                    : "text-white/65 hover:text-white hover:bg-white/5"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-primary/15"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <item.icon className="w-5 h-5 shrink-0 relative z-10" />
                <span className="relative z-10">{item.label}</span>
                {item.href === "/dashboard/notifications" && unreadCount > 0 && (
                  <span className="relative z-10 ml-auto min-w-[20px] h-5 rounded-full bg-error text-white text-[11px] font-bold flex items-center justify-center px-1.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-b border-white/10">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        </div>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">
              {user.displayName || "Member"}
            </p>
            <p className="text-xs text-white/45 truncate">{user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/65 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar — fixed, no sway */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 glass-nav border-b border-border/60 bottom-nav-stable">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-forest">
            <Logo variant="primary" size={26} />
            <span className="font-display text-base font-bold tracking-tight">
              Turna
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell notifications={notifications} unreadCount={unreadCount} />
            <form action={signOut}>
              <button
                type="submit"
                className="btn-ghost btn-sm text-muted"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav — locked, no up/down sway */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-nav border-t border-border/60 pb-[env(safe-area-inset-bottom)] bottom-nav-stable"
        aria-label="Primary"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        <div className="grid grid-cols-5">
          {navItems.slice(0, 4).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted hover:text-forest"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <AnimatePresence>
                  {active && (
                    <motion.span
                      layoutId="bottom-active"
                      className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", bounce: 0.12, duration: 0.4 }}
                    />
                  )}
                </AnimatePresence>
                <span className="relative">
                  <item.icon className="w-5 h-5" />
                  {item.href === "/dashboard/notifications" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/dashboard/settings"
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              isActive(pathname, "/dashboard/settings")
                ? "text-primary"
                : "text-muted hover:text-forest"
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
      </nav>
    </>
  );
}
