'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Home,
  Users,
  FileText,
  User,
  Settings,
  HelpCircle,
  LogOut,
  NotebookPen,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { signOut } from '@/lib/auth-actions';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import type { Notification } from '@turna/types';

/** Ordered for swipe: swipe left → next, swipe right → prev */
export const SWIPE_ROUTES = [
  '/dashboard',
  '/dashboard/circles',
  '/dashboard/ledger',
  '/dashboard/solo-ledger',
  '/dashboard/profile',
] as const;

/** Mobile bottom nav — Home, Circles, Ledger, Solo, Profile */
const bottomNav = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/circles', label: 'Circles', icon: Users },
  { href: '/dashboard/ledger', label: 'Ledger', icon: FileText },
  { href: '/dashboard/solo-ledger', label: 'Solo', icon: NotebookPen },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
] as const;

/** Desktop sidebar — primary + secondary */
const sidePrimary = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/circles', label: 'Circles', icon: Users },
  { href: '/dashboard/ledger', label: 'Ledger', icon: FileText },
  { href: '/dashboard/solo-ledger', label: 'Solo Ledger', icon: NotebookPen },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
] as const;

const sideSecondary = [
  { href: '/dashboard/audit-log', label: 'Audit log', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/settings/help', label: 'Help', icon: HelpCircle },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Horizontal swipe navigation across primary dashboard routes.
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
  const locked = useRef<boolean | null>(null);
  const lastNav = useRef(0);

  const index = useMemo(() => {
    const i = SWIPE_ROUTES.findIndex(
      (r) => pathname === r || (r !== '/dashboard' && pathname.startsWith(r + '/'))
    );
    return i >= 0 ? i : 0;
  }, [pathname]);

  function onPointerDown(e: React.PointerEvent) {
    if (reduce) return;
    if (e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (
      target.closest(
        "[data-no-swipe], table, .overflow-x-auto, a, button, input, textarea, select, [role='button']"
      )
    ) {
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

    let x = rawX;
    if (index === 0 && x > 0) x = x * 0.25;
    if (index === SWIPE_ROUTES.length - 1 && x < 0) x = x * 0.25;
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
        setTimeout(() => {
          setDx(0);
          setNavigating(false);
        }, 280);
        return;
      }
    }
    setDx(0);
  }

  const style =
    dx !== 0
      ? { transform: `translate3d(${dx}px,0,0)`, transition: 'none' as const }
      : {
          transform: 'translate3d(0,0,0)',
          transition: 'transform 280ms cubic-bezier(0.16,1,0.3,1)',
        };

  return (
    <div
      className="relative overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'pan-y' }}
    >
      <div style={style}>{children}</div>
    </div>
  );
}

interface DashboardNavProps {
  user: {
    email?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  notifications?: Notification[];
  unreadCount?: number;
}

export function DashboardNav({
  user,
  notifications = [],
  unreadCount = 0,
}: DashboardNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initials = (user.displayName || user.email || 'TU')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'TU';

  useEffect(() => {
    sidePrimary.forEach((item) => router.prefetch(item.href));
    sideSecondary.forEach((item) => router.prefetch(item.href));
    bottomNav.forEach((item) => router.prefetch(item.href));
  }, [router]);

  const avatarNode = user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt=""
      className="w-full h-full object-cover"
    />
  ) : (
    initials
  );

  return (
    <>
      {/* Desktop sidebar — light, calm */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-border z-40">
        <div className="px-5 py-5 border-b border-border/70">
          <Link href="/" className="inline-flex items-center gap-2" prefetch>
            <Logo variant="default" size={28} />
            <span className="font-display text-lg font-bold tracking-tight text-forest">
              Turna
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {sidePrimary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted hover:text-forest hover:bg-cream'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-border/70 space-y-0.5">
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
            />
            <ThemeToggle />
          </div>
          {sideSecondary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted hover:text-forest hover:bg-cream'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:text-error hover:bg-error/5 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top header — Turna + bell + avatar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-b border-border bottom-nav-stable">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="inline-flex items-center gap-2" prefetch>
            <Logo variant="default" size={24} />
            <span className="font-display text-base font-bold tracking-tight text-forest">
              Turna
            </span>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
            />
            <Link
              href="/dashboard/profile"
              prefetch
              className="w-9 h-9 rounded-full bg-forest text-primary-light flex items-center justify-center text-[11px] font-bold overflow-hidden ring-2 ring-primary/20"
              aria-label="Open profile"
            >
              {avatarNode}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav — Home, Circles, Ledger, Profile */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border pb-[env(safe-area-inset-bottom)] bottom-nav-stable"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5">
          {bottomNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`relative flex touch-manipulation select-none flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-100 active:scale-95 ${
                  active
                    ? "text-primary font-semibold"
                    : "text-muted hover:text-forest"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <AnimatePresence>
                  {active && (
                    <motion.span
                      layoutId="bottom-active"
                      className="absolute top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary"
                      transition={{ type: "spring", bounce: 0.12, duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>
                <item.icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
