import { getDashboardData } from '@/lib/dashboard-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  Users,
  PiggyBank,
  CalendarClock,
  Percent,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const { stats, circles, memberships, activeCircles, ownedCircles, user } =
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

  const supabase = createServerSupabaseClient();
  const myMemberIds = new Set(memberships.map((m) => m.id));
  const circleIds = circles.map((c) => c.id);

  // On-time %: confirmed/reported contributions with reported/confirmed on or before due_date
  let onTimePct: number | null = null;
  let onTimeCount = 0;
  let lateCount = 0;

  if (circleIds.length > 0) {
    const { data: contribs } = await supabase
      .from('contributions')
      .select(
        `id, member_id, status, reported_at, confirmed_at, created_at,
         contribution_cycles!inner(circle_id, due_date, cycle_number, payout_member_id)`
      )
      .in('contribution_cycles.circle_id', circleIds)
      .in('status', ['confirmed', 'reported'])
      .limit(300);

    for (const c of (contribs ?? []) as unknown as {
      member_id: string;
      reported_at?: string | null;
      confirmed_at?: string | null;
      created_at: string;
      contribution_cycles?: {
        circle_id: string;
        due_date?: string | null;
        payout_member_id?: string | null;
      } | null;
    }[]) {
      if (!myMemberIds.has(c.member_id)) continue;
      const due = c.contribution_cycles?.due_date;
      if (!due) continue;
      const paidAt = c.confirmed_at ?? c.reported_at ?? c.created_at;
      const paidDay = paidAt.slice(0, 10);
      if (paidDay <= due.slice(0, 10)) onTimeCount += 1;
      else lateCount += 1;
    }
    const total = onTimeCount + lateCount;
    onTimePct = total > 0 ? Math.round((onTimeCount / total) * 100) : null;
  }

  // Next payout: next collecting/payout cycle where I'm the recipient
  type NextPayout = {
    circleName: string;
    circleId: string;
    dueDate: string;
    cycleNumber: number;
    amount: number;
    currency: string;
  };
  let nextPayout: NextPayout | null = null;

  if (circleIds.length > 0) {
    const { data: cycles } = await supabase
      .from('contribution_cycles')
      .select(
        `id, cycle_number, due_date, status, expected_amount, payout_member_id,
         circle_id, circles!inner(id, name, currency, owner_id)`
      )
      .in('circle_id', circleIds)
      .in('status', ['collecting', 'payout_pending', 'pending'])
      .order('due_date', { ascending: true })
      .limit(50);

    for (const cy of (cycles ?? []) as unknown as {
      cycle_number: number;
      due_date?: string | null;
      status: string;
      expected_amount: number;
      payout_member_id?: string | null;
      circle_id: string;
      circles: {
        id: string;
        name: string;
        currency: string;
      } | {
        id: string;
        name: string;
        currency: string;
      }[] | null;
    }[]) {
      const circle = Array.isArray(cy.circles) ? cy.circles[0] : cy.circles;
      if (!circle) continue;
      // I'm recipient if payout_member_id matches one of my membership ids
      // or (simpler) check circle_members for this cycle
      if (!cy.payout_member_id) continue;
      const { data: meMember } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', cy.circle_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!meMember || meMember.id !== cy.payout_member_id) continue;

      // Confirm it's actually me as recipient (payout_member_id = circle_members.id)
      nextPayout = {
        circleName: circle.name,
        circleId: circle.id,
        dueDate: cy.due_date ?? '',
        cycleNumber: cy.cycle_number,
        amount: Number(cy.expected_amount),
        currency: circle.currency,
      };
      break;
    }
  }

  const memberCount = memberships.length + ownedCircles.length;

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

      <div className="grid sm:grid-cols-2 gap-4">
        <Metric
          icon={Percent}
          label="On-time rate"
          value={onTimePct != null ? `${onTimePct}%` : '—'}
          sub={
            onTimePct != null
              ? `${onTimeCount} on time · ${lateCount} late`
              : 'No confirmed contributions yet'
          }
        />
        <Metric
          icon={CalendarClock}
          label="Next payout to you"
          value={
            nextPayout
              ? nextPayout.dueDate
                ? formatDate(nextPayout.dueDate)
                : `Cycle ${nextPayout.cycleNumber}`
              : '—'
          }
          sub={
            nextPayout
              ? `${nextPayout.circleName} · ${formatCurrency(nextPayout.amount, nextPayout.currency)} pot share base`
              : 'You are not queued for the next pot'
          }
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
          <p className="text-xs text-muted mt-3">{memberCount} active memberships tracked</p>
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
