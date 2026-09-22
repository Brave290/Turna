import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PayoutsPage() {
  const { circles } = await getDashboardData();
  const circleIds = circles.map((c) => c.id);
  const currencyById = new Map(circles.map((c) => [c.id, c.currency]));
  const nameById = new Map(circles.map((c) => [c.id, c.name]));

  let rows: {
    id: string;
    status: string;
    amount: number;
    actual: number | null;
    createdAt: string;
    circleId: string;
    circleName: string;
    currency: string;
  }[] = [];

  if (circleIds.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('payouts')
      .select(
        'id, status, expected_amount, actual_amount, created_at, contribution_cycles!inner(circle_id)'
      )
      .in('contribution_cycles.circle_id', circleIds)
      .order('created_at', { ascending: false })
      .limit(100);

    rows = ((data ?? []) as unknown as {
      id: string;
      status: string;
      expected_amount: number;
      actual_amount: number | null;
      created_at: string;
      contribution_cycles: { circle_id: string } | null;
    }[]).map((p) => {
      const circleId = p.contribution_cycles?.circle_id ?? '';
      return {
        id: p.id,
        status: p.status,
        amount: p.expected_amount,
        actual: p.actual_amount,
        createdAt: p.created_at,
        circleId,
        circleName: nameById.get(circleId) ?? 'Circle',
        currency: currencyById.get(circleId) ?? 'NGN',
      };
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
          Payouts
        </h1>
        <p className="text-muted mt-1">
          Rotating pot handoffs — initiate, mark sent, confirm receipt.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-14">
          <ArrowLeftRight className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-muted">No payouts yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3 font-medium">Circle</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Expected</th>
                <th className="py-2 pr-3 font-medium">Actual</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-3">
                    <Link
                      href={`/dashboard/circles/${row.circleId}`}
                      className="text-forest hover:text-primary font-medium"
                    >
                      {row.circleName}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-muted">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="py-3 pr-3 text-forest">
                    {formatCurrency(row.amount, row.currency)}
                  </td>
                  <td className="py-3 pr-3 text-forest">
                    {row.actual != null
                      ? formatCurrency(row.actual, row.currency)
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
