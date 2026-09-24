'use client';

import { BarChart3, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function CircleAnalytics({
  isOwner,
  contributionAmount,
  currency,
  memberCount,
  memberLimit,
  cycles,
  contributions,
}: {
  isOwner: boolean;
  contributionAmount: number;
  currency: string;
  memberCount: number;
  memberLimit: number;
  cycles: { id: string; cycle_number: number; status: string; expected_amount: number }[];
  contributions: { id: string; status: string; amount: number; cycle_id: string }[];
}) {
  if (!isOwner) {
    return (
      <section className="card">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-forest">Analytics</h2>
        </div>
        <p className="text-sm text-muted">
          Circle analytics are available to the admin only.
        </p>
      </section>
    );
  }

  const collecting = cycles.find((c) => c.status === 'collecting');
  const activeCycleContribs = collecting
    ? contributions.filter((c) => c.cycle_id === collecting.id)
    : [];
  const confirmed = activeCycleContribs.filter((c) => c.status === 'confirmed');
  const pending = activeCycleContribs.filter(
    (c) => c.status === 'pending' || c.status === 'reported'
  );
  const expectedThisCycle = memberCount * contributionAmount;
  const confirmedSum = confirmed.reduce((s, c) => s + c.amount, 0);
  const outstanding = Math.max(0, expectedThisCycle - confirmedSum);
  const onTimePct =
    activeCycleContribs.length > 0
      ? Math.round((confirmed.length / Math.max(memberCount, 1)) * 100)
      : 0;
  const completedCycles = cycles.filter((c) => c.status === 'completed').length;
  const totalExpected = cycles.length * memberCount * contributionAmount;
  const totalConfirmed = contributions
    .filter((c) => c.status === 'confirmed')
    .reduce((s, c) => s + c.amount, 0);

  const stats = [
    { label: 'Total expected', value: formatCurrency(totalExpected, currency) },
    { label: 'Confirmed', value: formatCurrency(totalConfirmed, currency) },
    { label: 'Outstanding this cycle', value: formatCurrency(outstanding, currency) },
    {
      label: 'Participation',
      value: `${Math.min(100, onTimePct)}%`,
    },
    {
      label: 'Completed cycles',
      value: `${completedCycles} / ${cycles.length || 0}`,
    },
    {
      label: 'Member slots',
      value: `${memberCount} / ${memberLimit}`,
    },
  ];

  const participationPct = memberCount > 0 ? Math.round((confirmed.length / memberCount) * 100) : 0;

  return (
    <section className="card">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-forest">Circle analytics</h2>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border p-3 bg-cream/50">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="font-display text-lg font-bold text-forest mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-muted mb-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Confirmed this cycle
            </span>
            <span>
              {confirmed.length}/{memberCount || activeCycleContribs.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${participationPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted mb-1">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-warning" /> Outstanding
            </span>
            <span>{formatCurrency(outstanding, currency)}</span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-warning rounded-full transition-all"
              style={{
                width: `${
                  expectedThisCycle > 0
                    ? Math.min(100, Math.round((outstanding / expectedThisCycle) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-primary" /> Pending reports
          </span>
          <span>{pending.length}</span>
        </div>
      </div>
    </section>
  );
}
