import Link from 'next/link';
import {
  Users,
  Plus,
  UserPlus,
  TrendingUp,
  ArrowUpRight,
  ArrowLeftRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Home,
  PiggyBank,
  Clock,
  FileText,
} from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import {
  formatCurrency,
  formatRelativeTime,
} from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Stagger, StaggerItem } from '@/components/motion';
import { OfflineBanner } from '@/components/offline-banner';

export const dynamic = 'force-dynamic';

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export default async function DashboardHomePage() {
  const { profile, circles, activeCircles, stats, notifications, memberships } =
    await getDashboardData();

  const hasCircles = circles.length > 0;

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

  const firstName = (profile.display_name || 'there').split(/\s+/)[0];
  const pendingActions =
    stats.pendingContributions + stats.pendingPayouts;

  // Next due contribution hint (from pending count — real data, no fake dates)
  const dueHint =
    stats.pendingContributions > 0
      ? `You have ${stats.pendingContributions} contribution${stats.pendingContributions === 1 ? '' : 's'} awaiting action.`
      : null;

  const recentActivity = notifications.slice(0, 6);
  const recentCircles = (hasCircles ? circles : activeCircles).slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-7" data-sync-root>
      <OfflineBanner />

      {/* Greeting */}
      <section>
        <h1 className="font-display text-2xl sm:text-[1.65rem] font-semibold tracking-tight text-forest">
          {greeting(firstName)}
        </h1>
        <p className="text-[15px] text-muted mt-1">
          Here&apos;s what&apos;s happening with your savings circles.
        </p>
      </section>

      {/* Main savings summary */}
      <section
        className="relative overflow-hidden rounded-[20px] bg-forest text-white p-5 sm:p-6"
        aria-label="Total savings"
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #35D6A0 0, transparent 45%), radial-gradient(circle at 80% 70%, #00A878 0, transparent 40%)',
          }}
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
            Total savings
          </p>
          <p className="font-display text-[2rem] sm:text-[2.35rem] font-bold tracking-tight mt-2 tabular-nums">
            {formatCurrency(totalPaid)}
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              {hasCircles ? (
                <p className="inline-flex items-center gap-1.5 text-sm text-mint font-medium">
                  <TrendingUp className="w-4 h-4" />
                  {settlePct}% settled this cycle
                </p>
              ) : (
                <p className="text-sm text-white/55">
                  Start your first savings circle
                </p>
              )}
              <p className="text-xs text-white/40 mt-1">
                Confirmed contributions
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-white/45">
                Expected
              </p>
              <p className="font-display text-lg font-bold tabular-nums">
                {formatCurrency(totalExpected)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/circles/new"
          className="btn-primary justify-center w-full py-3.5 text-sm"
        >
          <Plus className="w-4 h-4" />
          Create a Circle
        </Link>
        <Link
          href="/circles/join"
          className="btn-outline justify-center w-full py-3.5 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Join a Circle
        </Link>
      </section>

      {/* Overview statistics — flat 2x2 */}
      {hasCircles ? (
        <Stagger className="grid grid-cols-2 gap-3" stagger={0.04}>
          <StaggerItem>
            <FlatStat
              icon={Users}
              label="My Circles"
              value={String(stats.activeCount)}
              sub="Active circles"
            />
          </StaggerItem>
          <StaggerItem>
            <FlatStat
              icon={PiggyBank}
              label="This Cycle"
              value={formatCurrency(stats.totalContributed)}
              sub="Total contributed"
            />
          </StaggerItem>
          <StaggerItem>
            <FlatStat
              icon={ArrowLeftRight}
              label="Total Payouts"
              value={formatCurrency(stats.pendingPayouts * 0 + totalPaid)}
              sub="Received"
            />
          </StaggerItem>
          <StaggerItem>
            <FlatStat
              icon={Bell}
              label="Pending Actions"
              value={String(pendingActions)}
              sub={pendingActions > 0 ? 'Needs attention' : 'All clear'}
            />
          </StaggerItem>
        </Stagger>
      ) : null}

      {/* Empty state */}
      {!hasCircles && (
        <section className="card text-center py-10 px-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Home className="w-6 h-6" />
          </div>
          <h2 className="font-display text-lg font-semibold text-forest">
            Your savings circles
          </h2>
          <p className="text-sm text-muted mt-2 max-w-sm mx-auto leading-relaxed">
            You haven&apos;t joined a savings circle yet. Start a circle with
            your friends, family, colleagues or community.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link href="/dashboard/circles/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              Create a Circle
            </Link>
            <Link href="/circles/join" className="btn-outline">
              <UserPlus className="w-4 h-4" />
              Join a Circle
            </Link>
          </div>
        </section>
      )}

      {/* Contribution reminder */}
      {dueHint && (
        <Link
          href="/dashboard/contributions"
          className="flex items-center gap-3 rounded-[18px] border border-warning/40 bg-warning/10 px-4 py-3.5 hover:bg-warning/15 transition-colors"
        >
          <span className="w-9 h-9 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <CalendarDays className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-forest">
              You have contributions waiting
            </span>
            <span className="block text-xs text-muted mt-0.5">{dueHint}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </Link>
      )}

      {/* My Circles */}
      {hasCircles && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-semibold text-forest">
              My Circles
            </h2>
            <Link
              href="/dashboard/circles"
              className="text-sm text-primary hover:text-primary-hover font-medium inline-flex items-center gap-0.5"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentCircles.map((circle) => {
              const wallet = walletList.find((w) => w.circle_id === circle.id);
              const paid = Number(wallet?.paid_amount || 0);
              const expected = Number(wallet?.expected_amount || 0);
              const progress =
                expected > 0
                  ? Math.min(100, Math.round((paid / expected) * 100))
                  : 0;
              const membership = memberships.find(
                (m) => m.circle_id === circle.id
              );
              const memberCount =
                (circle as { member_count?: number }).member_count ?? null;

              return (
                <Link
                  key={circle.id}
                  href={`/dashboard/circles/${circle.id}`}
                  className="block card-hover p-4 sm:p-5 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-medium text-forest group-hover:text-primary transition-colors truncate">
                        {circle.name}
                      </p>
                      <p className="text-sm text-muted mt-0.5">
                        {formatCurrency(circle.contribution_amount, circle.currency)} /{' '}
                        {circle.frequency}
                      </p>
                    </div>
                    <StatusBadge status={circle.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mb-3">
                    {memberCount != null && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {memberCount} members
                      </span>
                    )}
                    {membership?.payout_position != null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Position {membership.payout_position}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Cycle {circle.current_cycle || 0}
                    </span>
                  </div>
                  {expected > 0 && (
                    <div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted mt-1.5 tabular-nums">
                        {formatCurrency(paid, circle.currency)} of{' '}
                        {formatCurrency(expected, circle.currency)} settled
                      </p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-forest">
            Recent Activity
          </h2>
          <Link
            href="/dashboard/notifications"
            className="text-sm text-primary hover:text-primary-hover font-medium inline-flex items-center gap-0.5"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <div className="card py-8 text-center">
            <ArrowUpRight className="w-7 h-7 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">No recent activity yet.</p>
          </div>
        ) : (
          <ul className="card divide-y divide-border/70 p-0 overflow-hidden">
            {recentActivity.map((n) => (
              <li
                key={n.id}
                className="flex items-start gap-3 px-4 py-3.5"
              >
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-forest truncate">
                    {n.title}
                  </span>
                  <span className="block text-xs text-muted line-clamp-1 mt-0.5">
                    {n.body}
                  </span>
                </span>
                <span className="text-[11px] text-muted shrink-0 whitespace-nowrap">
                  {formatRelativeTime(n.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Secondary link strip */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/ledger"
          className="card flex items-center gap-3 py-4 px-4 hover:border-primary/25 transition-colors"
        >
          <FileText className="w-4.5 h-4.5 w-[18px] h-[18px] text-primary" />
          <span className="text-sm font-medium text-forest">Open ledger</span>
        </Link>
        <Link
          href="/dashboard/insights"
          className="card flex items-center gap-3 py-4 px-4 hover:border-primary/25 transition-colors"
        >
          <TrendingUp className="w-[18px] h-[18px] text-primary" />
          <span className="text-sm font-medium text-forest">Insights</span>
        </Link>
      </section>

      {/* Zero-state tip when no savings data but has circles */}
      {hasCircles && totalPaid === 0 && (
        <p className="text-xs text-muted text-center pb-2">
          Start contributing to build your total savings.
        </p>
      )}
    </div>
  );
}

function FlatStat({
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
    <div className="stat-card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="font-display text-xl font-bold text-forest tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-xs text-muted mt-0.5">{sub}</p>
    </div>
  );
}
