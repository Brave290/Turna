import Link from 'next/link';
import {
  Users,
  PiggyBank,
  ArrowLeftRight,
  BookOpen,
  Bell,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';

export const dynamic = 'force-dynamic';

export default async function DashboardHomePage() {
  const { profile, circles, activeCircles, stats, notifications } =
    await getDashboardData();

  const recent = circles.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted mb-1">Welcome back</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-forest">
            {profile.display_name}
          </h1>
        </div>
        <Link href="/dashboard/circles/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Circle
        </Link>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Circles"
          value={String(stats.circleCount)}
          icon={Users}
          hint={`${stats.activeCount} active`}
        />
        <StatCard
          label="Contributions due"
          value={String(stats.pendingContributions)}
          icon={PiggyBank}
          hint="Needs your action"
        />
        <StatCard
          label="Payouts pending"
          value={String(stats.pendingPayouts)}
          icon={ArrowLeftRight}
          hint="In the pipeline"
        />
        <StatCard
          label="You've contributed"
          value={formatCurrency(stats.totalContributed)}
          icon={TrendingUp}
          hint="Confirmed total"
        />
      </section>

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
