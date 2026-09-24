import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';

export const dynamic = 'force-dynamic';

/**
 * Payments history — every Paystack payment for circles you belong to
 * (own rows via RLS + circle-owner rows for circles you own).
 */
export default async function PaymentsPage() {
  const { circles, user } = await getDashboardData();
  const circleIds = circles.map((c) => c.id);
  const nameById = new Map(circles.map((c) => [c.id, c.name]));
  const currencyById = new Map(circles.map((c) => [c.id, c.currency]));

  const supabase = createServerSupabaseClient();

  // RLS already scopes to own payments + owned-circle payments.
  // Also pull member payments on circles you own explicitly for completeness.
  let rows: {
    id: string;
    reference: string;
    kind: string;
    amount: number;
    total: number;
    status: string;
    createdAt: string;
    circleId: string | null;
    circleName: string;
    currency: string;
    mine: boolean;
  }[] = [];

  const { data } = await supabase
    .from('payments')
    .select('id, reference, kind, amount, total_amount, status, created_at, circle_id, user_id, currency')
    .order('created_at', { ascending: false })
    .limit(100);

  rows = ((data ?? []) as unknown as {
    id: string;
    reference: string;
    kind: string;
    amount: number;
    total_amount: number;
    status: string;
    created_at: string;
    circle_id: string | null;
    user_id: string;
    currency: string;
  }[]).map((p) => ({
    id: p.id,
    reference: p.reference,
    kind: p.kind,
    amount: p.amount,
    total: p.total_amount,
    status: p.status,
    createdAt: p.created_at,
    circleId: p.circle_id,
    circleName: p.circle_id ? nameById.get(p.circle_id) ?? 'Circle' : '—',
    currency: p.currency || (p.circle_id ? currencyById.get(p.circle_id) ?? 'NGN' : 'NGN'),
    mine: p.user_id === user.id,
  }));

  // Owner view: payments on owned circles where user is not the payer
  if (circleIds.length > 0) {
    const { data: owned } = await supabase
      .from('payments')
      .select('id, reference, kind, amount, total_amount, status, created_at, circle_id, user_id, currency')
      .in('circle_id', circleIds)
      .order('created_at', { ascending: false })
      .limit(100);

    const seen = new Set(rows.map((r) => r.id));
    for (const p of (owned ?? []) as unknown as {
      id: string;
      reference: string;
      kind: string;
      amount: number;
      total_amount: number;
      status: string;
      created_at: string;
      circle_id: string | null;
      user_id: string;
      currency: string;
    }[]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      rows.push({
        id: p.id,
        reference: p.reference,
        kind: p.kind,
        amount: p.amount,
        total: p.total_amount,
        status: p.status,
        createdAt: p.created_at,
        circleId: p.circle_id,
        circleName: p.circle_id ? nameById.get(p.circle_id) ?? 'Circle' : '—',
        currency: p.currency || 'NGN',
        mine: p.user_id === user.id,
      });
    }
  }

  const totalIn = rows
    .filter((r) => r.status === 'success' && r.kind === 'contribution')
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
          Payments
        </h1>
        <p className="text-muted mt-1">
          Paystack transactions for your circles — contributions and payouts.
        </p>
      </div>

      <div className="card">
        <p className="text-sm text-muted">Confirmed contributions (all time)</p>
        <p className="font-display text-2xl font-bold text-forest mt-1">
          {formatCurrency(totalIn)}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-14">
          <CreditCard className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-muted">No payments yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 pr-3 font-medium">Circle</th>
                <th className="py-2 pr-3 font-medium">Kind</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Fees</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-3">
                    <Link
                      href={`/receipt/${row.reference}`}
                      className="font-mono text-xs text-forest hover:text-primary"
                    >
                      {row.reference}
                    </Link>
                    {!row.mine && (
                      <span className="ml-1.5 text-[10px] uppercase text-muted">
                        member
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    {row.circleId ? (
                      <Link
                        href={`/dashboard/circles/${row.circleId}`}
                        className="text-forest hover:text-primary font-medium"
                      >
                        {row.circleName}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-muted capitalize">{row.kind}</td>
                  <td className="py-3 pr-3 text-muted">{formatDate(row.createdAt)}</td>
                  <td className="py-3 pr-3 text-forest">
                    {formatCurrency(row.amount, row.currency)}
                  </td>
                  <td className="py-3 pr-3 text-muted">
                    {row.total > row.amount
                      ? formatCurrency(row.total - row.amount, row.currency)
                      : '—'}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
