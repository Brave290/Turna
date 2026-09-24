import Link from 'next/link';
import {
  Users,
  PiggyBank,
  ArrowLeftRight,
  BookOpen,
  Bell,
  Plus,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getInitials,
} from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Stagger, StaggerItem } from '@/components/motion';

export const dynamic = 'force-dynamic';

export default async function DashboardHomePage() {
  const { profile, circles, activeCircles, stats, notifications, user } =
    await getDashboardData();

  const recent = circles.slice(0, 5);
  const wallets = (stats as { wallets?: unknown[] }).wallets ?? [];
  const walletList = wallets as {
    circle_id: string;
    paid_amount: number;
    expected_amount: number;
    circles: { name: string; currency: string } | null;
  }[];
  const totalPaid = walletList.reduce((s, w) => s + Number(w.paid_amount || 0), 0);
  const totalExpected = walletList.reduce(
    (s, w) => s + Number(w.expected_amount || 0),
    0
  );
  const settlePct =
    totalExpected > 0
      ? Math.min(100, Math.round((totalPaid / totalExpected) * 100))
      : 0;
  const initials = getInitials(profile.display_name || user.email || 'TU');
  const firstName = (profile.display_name || 'there').split(/\s+/)[0];

  return (
    <div className="space-y-7">
      {/* ── Fintech hero ── */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-forest text-white">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse at 15% 20%, rgba(0,194,168,0.35), transparent 50%), radial-gradient(ellipse at 85% 80%, rgba(124,92,255,0.25), transparent 45%)',
          }}
        />
        <div className="relative px-5 sm:px-7 py-6 sm:py-7 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <Link
              href="/dashboard/profile"
              prefetch
              className="shrink-0"
              aria-label="Open profile"
            >
              <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-white flex items-center justify-center font-display text-xl font-bold ring-2 ring-white/20 shadow-glow">
                {initials}
              </span>
            </Link>
            <div className="min-w-0">
              <p className="text-xs text-primary-light/80 uppercase tracking-widest mb-1">
                Overview
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight truncate">
                Hi, {firstName}
              </h1>
              <p className="text-sm text-white/50 mt-1">
                {activeCircles.length > 0
                  ? `${activeCircles.length} active circle${activeCircles.length === 1 ? '' : 's'} · cycle ${circles[0]?.current_cycle || 0}`
                  : 'No active circles yet — start one below.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href="/dashboard/profile"
              className="btn-outline border-white/20 text-white hover:bg-white/10 btn-sm"
            >
              Profile
            </Link>
            <Link href="/dashboard/circles/new" className="btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              New circle
            </Link>
          </div>
        </div>

        {/* Wallet strip */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 border-t border-white/10 divide-x divide-white/10">
          <HeroStat
            icon={Wallet}
            label="Settled"
            value={formatCurrency(totalPaid)}
            sub="Your confirmed total"
          />
          <HeroStat
            icon={Clock}
            label="Expected"
            value={formatCurrency(totalExpected)}
            sub="Across wallets"
          />
          <HeroStat
            icon={TrendingUp}
            label="Progress"
            value={`${settlePct}%`}
            sub="Paid vs expected"
          />
          <HeroStat
            icon={Bell}
            label="Unread"
            value={String(stats.unreadNotifications)}
            sub="Notifications"
          />
        </div>
      </section>

      {/* ── Metric cards ── */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4" stagger={0.05}>
        <StaggerItem>
          <StatCard
            label="Circles"
            value={String(stats.circleCount)}
            icon={Users}
            hint={`${stats.activeCount} active`}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Due"
            value={String(stats.pendingContributions)}
            icon={PiggyBank}
            hint="Contributions waiting"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Payouts"
            value={String(stats.pendingPayouts)}
            icon={ArrowLeftRight}
            hint="In the pipeline"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Contributed"
            value={formatCurrency(stats.totalContributed)}
            icon={ArrowUpRight}
            hint="Confirmed on-chain of trust"
          />
        </StaggerItem>
      </Stagger>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-forest">Your circles</h2>
            <Link
              href="/dashboard/circles"
              className="text-sm text-primary hover:text-primary-hover font-medium"
            >
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <Users className="w-8 h-8 text-muted mx-auto mb-3" />
              <p className="text-muted mb-4">
                No circles yet. Start one and invite your people.
              </p>
              <Link href="/dashboard/circles/new" className="btn-primary inline-flex">
                <Plus className="w-4 h-4" />
                Create your first circle
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((circle) => (
                <li key={circle.id}>
                  <Link
                    href={`/dashboard/circles/${circle.id}`}
                    className="flex items-center justify-between gap-3 py-3 group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-forest group-hover:text-primary transition-colors truncate">
                        {circle.name}
                      </p>
                      <p className="text-sm text-muted">
                        {formatCurrency(circle.contribution_amount, circle.currency)} ·{' '}
                        {circle.frequency} · created {formatDate(circle.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={circle.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {activeCircles.length > 0 && (
            <p className="text-xs text-muted mt-4">
              {activeCircles.length} active circle
              {activeCircles.length === 1 ? '' : 's'} in progress
            </p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-forest">Notifications</h2>
            <Link
              href="/dashboard/notifications"
              className="text-sm text-primary hover:text-primary-hover font-medium"
            >
              See all
            </Link>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-7 h-7 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted">You&apos;re all caught up.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notifications.slice(0, 6).map((n) => (
                <li key={n.id} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-sm font-medium text-forest">{n.title}</p>
                  <p className="text-xs text-muted line-clamp-2">{n.body}</p>
                  <p className="text-[11px] text-muted mt-1">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 pt-4 border-t border-border">
            <Link
              href="/dashboard/ledger"
              className="flex items-center gap-2 text-sm text-forest hover:text-primary transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Open append-only ledger
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="px-4 sm:px-5 py-4 min-w-0">
      <div className="flex items-center gap-1.5 text-white/45 text-[11px] uppercase tracking-wider mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="font-display text-lg sm:text-xl font-bold text-white truncate">
        {value}
      </p>
      <p className="text-[11px] text-white/40 truncate">{sub}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm text-muted">{label}</p>
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-forest tracking-tight">
        {value}
      </p>
      <p className="text-xs text-muted mt-1">{hint}</p>
    </div>
  );
}
