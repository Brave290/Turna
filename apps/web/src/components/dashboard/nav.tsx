"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
}

export function DashboardNav({ user }: DashboardNavProps) {
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary-light"
                    : "text-white/65 hover:text-white hover:bg-white/5"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">
              {user.displayName || "Member"}
            </p>
            <p className="text-xs text-white/45 truncate">
              {user.email}
            </p>
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

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 glass-nav border-b border-border/60">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-forest">
            <Logo variant="primary" size={26} />
            <span className="font-display text-base font-bold tracking-tight">
              Turna
            </span>
          </Link>
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
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-nav border-t border-border/60 pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5">
          {navItems.slice(0, 4).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted hover:text-forest"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/dashboard/settings"
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
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
