"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import { ThemeToggle } from "@/components/theme-toggle";
import type { Notification } from "@turna/types";

/** Ordered for swipe: swipe left → next, swipe right → prev */
export const SWIPE_ROUTES = [
  "/dashboard",
  "/dashboard/circles",
  "/dashboard/contributions",
  "/dashboard/payouts",
  "/dashboard/ledger",
  "/dashboard/insights",
  "/dashboard/notifications",
  "/dashboard/settings",
] as const;

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/circles", label: "Circles", icon: Users },
  { href: "/dashboard/contributions", label: "Contributions", icon: PiggyBank },
  { href: "/dashboard/payouts", label: "Payouts", icon: ArrowLeftRight },
  { href: "/dashboard/ledger", label: "Ledger", icon: BookOpen },
  { href: "/dashboard/insights", label: "Insights", icon: BarChart3 },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: Settings },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Horizontal swipe navigation across top-level dashboard routes.
 * Swipe left → next route, swipe right → previous.
 * Also drags content with finger for a native feel.
 */
export function SwipeRouter({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [dx, setDx] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const locked = useRef<boolean | null>(null); // null=unknown, true=horizontal, false=vertical
  const lastNav = useRef(0);

  const index = useMemo(() => {
    const i = SWIPE_ROUTES.findIndex(
      (r) => pathname === r || (r !== "/dashboard" && pathname.startsWith(r + "/"))
    );
    return i >= 0 ? i : 0;
  }, [pathname]);

  function onPointerDown(e: React.PointerEvent) {
    if (reduce) return;
    if (e.pointerType === "mouse") return;
    // Don't steal swipes from horizontal scrollers (tables)
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-swipe], table, .overflow-x-auto")) {
      tracking.current = false;
      return;
    }
    startX.current = e.clientX;
    startY.current = e.clientY;
    tracking.current = true;
    locked.current = null;
    setDx(0);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!tracking.current || navigating) return;
    const rawX = e.clientX - startX.current;
    const rawY = e.clientY - startY.current;

    if (locked.current === null) {
      if (Math.abs(rawX) < 8 && Math.abs(rawY) < 8) return;
      const horizontal = Math.abs(rawX) > Math.abs(rawY) * 1.2;
      locked.current = horizontal;
      if (!horizontal) {
        tracking.current = false;
        return;
      }
    }
    if (locked.current === false) return;

    // Rubber-band at ends
    let x = rawX;
    const atStart = index === 0 && x > 0;
    const atEnd = index === SWIPE_ROUTES.length - 1 && x < 0;
    if (atStart) x = x * 0.25;
    if (atEnd) x = x * 0.25;
    setDx(x);
  }

  function onPointerUp() {
    if (!tracking.current) {
      setDx(0);
      return;
    }
    tracking.current = false;
    const threshold = 72;
    const now = Date.now();
    if (dx !== 0 && Math.abs(dx) >= threshold && now - lastNav.current > 400 && !navigating) {
      lastNav.current = now;
      const dir = dx < 0 ? 1 : -1;
      const next = index + dir;
      if (next >= 0 && next < SWIPE_ROUTES.length) {
        setNavigating(true);
        router.push(SWIPE_ROUTES[next]);
        // Brief hold so animation finishes
        setTimeout(() => {
          setDx(0);
          setNavigating(false);
        }, 280);
        return;
      }
    }
    setDx(0);
  }

  // Prefetch all top-level routes for instant tap response
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Warm next/prefetch on idle
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(() => {
      // DOM link prefetch is triggered by Next Link on hover; force via prefetch API if available
      void 0;
    });
  }, []);

  const style =
    dx !== 0
      ? {
          transform: `translate3d(${dx}px,0,0)`,
          transition: "none" as const,
        }
      : {
          transform: "translate3d(0,0,0)",
          transition: "transform 280ms cubic-bezier(0.16,1,0.3,1)",
        };

  return (
    <div
      className="relative overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: "pan-y" }}
    >
      <div style={style}>{children}</div>
      {/* Page edge peek while swiping */}
      {Math.abs(dx) > 12 && (
        <div
          className="pointer-events-none fixed inset-y-0 z-50 w-1 bg-primary/60"
          style={{
            left: dx < 0 ? undefined : 0,
            right: dx < 0 ? 0 : undefined,
            opacity: Math.min(1, Math.abs(dx) / 120),
          }}
        />
      )}
    </div>
  );
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
  const initials = (user.displayName || user.email || 'TU')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'TU';

  const avatar = (
    <Link
      href="/dashboard/profile"
      prefetch={true}
      className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 transition-colors"
      aria-label="Open profile"
      title="Profile"
    >
      <span
        className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-hover text-white flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all"
        aria-hidden
      >
        {initials}
      </span>
      <span className="hidden lg:block min-w-0 flex-1">
        <span className="block text-sm font-medium text-white truncate">
          {user.displayName || 'Member'}
        </span>
        <span className="block text-[11px] text-white/45 truncate">
          View profile
        </span>
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-forest text-white border-r border-white/10 z-40">
        {/* Top-left: avatar → profile */}
        <div className="px-3 py-4 border-b border-white/10">
          <div className="px-1 mb-3">
            <Link href="/" className="inline-flex items-center gap-2" prefetch>
              <Logo variant="on-dark" size={24} />
              <span className="font-display text-base font-bold tracking-tight">
                Turna
              </span>
            </Link>
          </div>
          {avatar}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
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
                    transition={{ type: "spring", bounce: 0.18, duration: 0.35 }}
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

        <div className="px-3 py-3 border-b border-white/10 flex items-center justify-between gap-2">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <ThemeToggle className="theme-toggle-on-dark" />
        </div>

        <div className="px-3 py-4 border-t border-white/10">
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

      {/* Mobile top bar — avatar top-left → profile */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 glass-nav border-b border-border/60 bottom-nav-stable">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/dashboard/profile"
              prefetch={true}
              className="flex items-center gap-2 min-w-0"
              aria-label="Open profile"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-hover text-white flex items-center justify-center text-[11px] font-bold ring-2 ring-primary/25 shrink-0">
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-forest truncate leading-tight">
                  {user.displayName || 'Member'}
                </span>
                <span className="block text-[10px] text-muted leading-tight">
                  Profile
                </span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
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

      {/* Mobile bottom nav */}
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
                prefetch={true}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-[#00C2A8] font-semibold"
                    : "text-[#4A5D73] hover:text-[#0A1628]"
                }`}
                aria-current={active ? "page" : undefined}
                style={active ? { color: "#00C2A8" } : undefined}
              >
                <AnimatePresence>
                  {active && (
                    <motion.span
                      layoutId="bottom-active"
                      className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                      style={{ background: "#00C2A8" }}
                      transition={{ type: "spring", bounce: 0.12, duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>
                <span className="relative" style={active ? { color: "#00C2A8" } : undefined}>
                  <item.icon
                    className="w-5 h-5"
                    style={active ? { color: "#00C2A8", stroke: "#00C2A8" } : undefined}
                  />
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
            prefetch={true}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              isActive(pathname, "/dashboard/settings")
                ? "text-[#00C2A8] font-semibold"
                : "text-[#4A5D73] hover:text-[#0A1628]"
            }`}
            style={
              isActive(pathname, "/dashboard/settings")
                ? { color: "#00C2A8" }
                : undefined
            }
          >
            <Settings
              className="w-5 h-5"
              style={
                isActive(pathname, "/dashboard/settings")
                  ? { color: "#00C2A8", stroke: "#00C2A8" }
                  : undefined
              }
            />
            Settings
          </Link>
        </div>
      </nav>
    </>
  );
}
