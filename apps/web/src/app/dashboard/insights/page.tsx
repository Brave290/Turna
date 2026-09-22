import { getDashboardData } from '@/lib/dashboard-data';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, Users, PiggyBank } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const { stats, circles, memberships, activeCircles, ownedCircles } =
    await getDashboardData();

  const byStatus = circles.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const avgContribution =
    circles.length > 0
      ? circles.reduce((sum, c) => sum + c.contribution_amount, 0) /
        circles.length
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
          Insights
        </h1>
        <p className="text-muted mt-1">
          Real numbers from your circles — not demo stats.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          icon={Users}
          label="Active circles"
          value={String(activeCircles.length)}
          sub={`${stats.circleCount} total`}
        />
        <Metric
          icon={TrendingUp}
          label="Owned by you"
          value={String(ownedCircles.length)}
          sub={`${memberships.length} memberships`}
        />
        <Metric
          icon={PiggyBank}
          label="Confirmed contributed"
          value={formatCurrency(stats.totalContributed)}
          sub="Across confirmed contributions"
        />
        <Metric
          icon={BarChart3}
          label="Avg contribution"
          value={formatCurrency(Math.round(avgContribution))}
          sub="Mean circle amount"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card">
          <h2 className="font-semibold text-forest mb-4">Circles by status</h2>
          {circles.length === 0 ? (
            <p className="text-sm text-muted">
              Create a circle to start seeing breakdowns.
            </p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(byStatus).map(([status, count]) => (
                <li key={status} className="flex items-center gap-3">
                  <span className="text-sm text-forest capitalize w-28">
                    {status.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round((count / circles.length) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-forest w-6 text-right">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold text-forest mb-4">Your circles</h2>
          {circles.length === 0 ? (
            <p className="text-sm text-muted">Nothing to chart yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {circles.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-forest truncate">{c.name}</p>
                    <p className="text-xs text-muted capitalize">
                      {c.frequency} · cycle {c.current_cycle || 0}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-forest shrink-0">
                    {formatCurrency(c.contribution_amount, c.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
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
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  );
}
