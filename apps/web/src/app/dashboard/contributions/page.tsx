import Link from 'next/link';
import { PiggyBank, Plus } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { PayContributionButton } from '@/components/dashboard/pay-contribution';
import { PaymentSuccessBanner } from '@/components/dashboard/payment-success-banner';

export const dynamic = 'force-dynamic';

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams?: { paid?: string; ref?: string };
}) {
  const { circles, memberships, user } = await getDashboardData();
  const circleIds = circles.map((c) => c.id);
  const myMemberIds = new Set(memberships.map((m) => m.id));
  const circleById = new Map(circles.map((c) => [c.id, c]));
  const paidRef = searchParams?.paid === '1' ? searchParams?.ref ?? '' : '';

  type Row = {
    id: string;
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
    circleName: string;
    circleId: string;
    cycleId: string | null;
    mine: boolean;
    feeBps: number;
    networkBps: number;
    feePayer: string;
  };

  let rows: Row[] = [];

  if (circleIds.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('contributions')
      .select(
        'id, status, reported_amount, expected_amount, created_at, member_id, cycle_id, contribution_cycles!inner(circle_id, circles(name, currency, fee_bps, network_charge_bps, fee_payer))'
      )
      .in('contribution_cycles.circle_id', circleIds)
      .order('created_at', { ascending: false })
      .limit(100);

    rows = ((data ?? []) as unknown as {
      id: string;
      status: string;
      reported_amount: number | null;
      expected_amount: number;
      created_at: string;
      member_id: string;
      cycle_id: string;
      contribution_cycles: {
        circle_id: string;
        circles: {
          name: string;
          currency: string;
          fee_bps?: number;
          network_charge_bps?: number;
          fee_payer?: string;
        } | null;
      } | null;
    }[]).map((c) => ({
      id: c.id,
      status: c.status,
      amount: c.reported_amount ?? c.expected_amount,
      currency: c.contribution_cycles?.circles?.currency ?? 'NGN',
      createdAt: c.created_at,
      circleName: c.contribution_cycles?.circles?.name ?? 'Circle',
      circleId: c.contribution_cycles?.circle_id ?? '',
      cycleId: c.cycle_id,
      mine: myMemberIds.has(c.member_id),
      feeBps: Number(c.contribution_cycles?.circles?.fee_bps ?? 0),
      networkBps: Number(c.contribution_cycles?.circles?.network_charge_bps ?? 0),
      feePayer: c.contribution_cycles?.circles?.fee_payer ?? 'member',
    }));
  }

  void circleById;

  return (
    <div className="space-y-6 animate-fade-in">
      {paidRef && <PaymentSuccessBanner reference={paidRef} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
            Contributions
          </h1>
          <p className="text-muted mt-1">
            Track what you owe. Pay online with card or transfer via Paystack.
          </p>
        </div>
        <Link href="/dashboard/circles/new" className="btn-outline">
          <Plus className="w-4 h-4" />
          New circle
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-14">
          <PiggyBank className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-muted mb-1">No contributions yet.</p>
          <p className="text-sm text-muted">
            Contributions appear once a circle starts collecting.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3 font-medium">Circle</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Action</th>
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
                      {row.mine && (
                        <span className="text-muted font-normal"> · yours</span>
                      )}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-muted">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="py-3 pr-3 text-forest">
                    {formatCurrency(row.amount, row.currency)}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-3">
                    {row.mine &&
                      (row.status === 'pending' || row.status === 'reported') && (
                        <PayContributionButton
                          circleId={row.circleId}
                          cycleId={row.cycleId}
                          baseAmountKobo={row.amount}
                          currency={row.currency}
                          feeBps={row.feeBps}
                          networkBps={row.networkBps}
                          feePayer={row.feePayer}
                          label="Pay now"
                        />
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted">
        Signed in as {user.email}. Payments are processed by Paystack; card and
        bank transfer supported.
      </p>
    </div>
  );
}
