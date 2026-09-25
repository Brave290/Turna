import Link from 'next/link';
import { ReceiptText } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { ExportCsvButton } from '@/components/dashboard/export-csv-button';

export const dynamic = 'force-dynamic';

/**
 * Payments history — a read-only ledger of the contributions and payouts
 * recorded for circles you belong to. Nothing is charged here: members
 * settle directly with the circle and Turna keeps the record.
 */
export default async function PaymentsPage() {
  const { circles, memberships, user } = await getDashboardData();
  const circleIds = circles.map((c) => c.id);
  const myMemberIds = new Set(memberships.map((m) => m.id));

  type Row = {
    id: string;
    kind: 'contribution' | 'payout';
    reference: string | null;
    circleId: string;
    circleName: string;
    currency: string;
    amount: number;
    status: string;
    createdAt: string;
    mine: boolean;
  };

  let rows: Row[] = [];

  if (circleIds.length > 0) {
    const supabase = createServerSupabaseClient();

    const [contribRes, payoutRes] = await Promise.all([
      supabase
        .from('contributions')
        .select(
          `id, status, reported_amount, expected_amount, receipt_code, created_at, member_id,
           contribution_cycles!inner(circle_id, circles(name, currency))`
        )
        .in('contribution_cycles.circle_id', circleIds)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('payouts')
        .select(
          `id, status, expected_amount, actual_amount, created_at, recipient_member_id,
           contribution_cycles!inner(circle_id, circles(name, currency))`
        )
        .in('contribution_cycles.circle_id', circleIds)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    type ContribRow = {
      id: string;
      status: string;
      reported_amount: number | null;
      expected_amount: number;
      receipt_code: string | null;
      created_at: string;
      member_id: string;
      contribution_cycles: {
        circle_id: string;
        circles: { name: string; currency: string } | null;
      } | null;
    };

    type PayoutRow = {
      id: string;
      status: string;
      expected_amount: number;
      actual_amount: number | null;
      created_at: string;
      recipient_member_id: string;
      contribution_cycles: {
        circle_id: string;
        circles: { name: string; currency: string } | null;
      } | null;
    };

    const contributions = ((contribRes.data ?? []) as unknown as ContribRow[]).map(
      (c) => ({
        id: c.id,
        kind: 'contribution' as const,
        reference: c.receipt_code ?? null,
        circleId: c.contribution_cycles?.circle_id ?? '',
        circleName: c.contribution_cycles?.circles?.name ?? 'Circle',
        currency: c.contribution_cycles?.circles?.currency ?? 'NGN',
        amount: c.reported_amount ?? c.expected_amount,
        status: c.status,
        createdAt: c.created_at,
        mine: myMemberIds.has(c.member_id),
      })
    );

    const payouts = ((payoutRes.data ?? []) as unknown as PayoutRow[]).map((p) => ({
      id: p.id,
      kind: 'payout' as const,
      reference: null,
      circleId: p.contribution_cycles?.circle_id ?? '',
      circleName: p.contribution_cycles?.circles?.name ?? 'Circle',
      currency: p.contribution_cycles?.circles?.currency ?? 'NGN',
      amount: p.actual_amount ?? p.expected_amount,
      status: p.status,
      createdAt: p.created_at,
      mine: myMemberIds.has(p.recipient_member_id),
    }));

    rows = [...contributions, ...payouts]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 200);
  }

  const totalIn = rows
    .filter((r) => r.kind === 'contribution' && r.status === 'confirmed')
    .reduce((s, r) => s + r.amount, 0);
  const totalOut = rows
    .filter((r) => r.kind === 'payout' && r.status === 'received')
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
            Payments
          </h1>
          <p className="text-muted mt-1">
            Contributions and payouts recorded for your circles. Money moves
            directly between members — this page is the record of it.
          </p>
        </div>
        {rows.length > 0 && (
          <ExportCsvButton
            filename={`turna-payments-${new Date().toISOString().slice(0, 10)}.csv`}
            headers={[
              'reference',
              'circle',
              'type',
              'status',
              'amount',
              'currency',
              'date',
            ]}
            rows={rows.map((r) => [
              r.reference ?? '',
              r.circleName,
              r.kind,
              r.status,
              r.amount,
              r.currency,
              r.createdAt,
            ])}
          />
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm text-muted">Confirmed contributions (all time)</p>
          <p className="font-display text-2xl font-bold text-forest mt-1">
            {formatCurrency(totalIn)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Payouts received (all time)</p>
          <p className="font-display text-2xl font-bold text-forest mt-1">
            {formatCurrency(totalOut)}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-14">
          <ReceiptText className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-muted mb-1">No payments recorded yet.</p>
          <p className="text-sm text-muted">
            Records appear once your circles start collecting and paying out.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 pr-3 font-medium">Circle</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={`${row.kind}-${row.id}`}>
                  <td className="py-3 pr-3">
                    {row.reference ? (
                      <Link
                        href={`/receipt/${encodeURIComponent(row.reference)}`}
                        className="font-mono text-xs text-forest hover:text-primary"
                      >
                        {row.reference}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    {!row.mine && (
                      <span className="ml-1.5 text-[10px] uppercase text-muted">
                        {row.kind === 'contribution' ? 'member' : 'to member'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <Link
                      href={`/dashboard/circles/${row.circleId}`}
                      className="text-forest hover:text-primary font-medium"
                    >
                      {row.circleName}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-muted capitalize">{row.kind}</td>
                  <td className="py-3 pr-3 text-muted">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="py-3 pr-3 text-forest">
                    {formatCurrency(row.amount, row.currency)}
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

      <p className="text-xs text-muted">
        Signed in as {user.email}. Contributions are reported by members and
        confirmed by the circle admin; payouts are marked sent by the admin and
        confirmed by the recipient.
      </p>
    </div>
  );
}
