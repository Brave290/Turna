import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  CircleDollarSign,
  Clock3,
  Undo2,
  UserCog,
} from 'lucide-react';
import { getMemberLedger } from '@/lib/dashboard-data';
import { formatCurrency, getInitials } from '@/lib/utils';
import { MembersControl } from '@/components/dashboard/members-control';

export const dynamic = 'force-dynamic';

export default async function MemberLedgerPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getMemberLedger(params.id).catch(() => null);
  if (!data) notFound();

  const { circle, rows, collectingCycle, summary } = data;

  return (
    <div className="space-y-6 animate-fade-in" data-sync-root>
      <div>
        <Link
          href={`/dashboard/circles/${circle.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {circle.name}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <UserCog className="w-6 h-6 text-primary" />
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-forest">
                Member control
              </h1>
            </div>
            <p className="text-sm text-muted mt-1">
              Owner ledger for {circle.name} — mark paid, refund, change roles.
            </p>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={Users}
          label="Active members"
          value={String(summary.total)}
        />
        <SummaryCard
          icon={CircleDollarSign}
          label="Collected this cycle"
          value={formatCurrency(summary.collected, summary.currency)}
        />
        <SummaryCard
          icon={Clock3}
          label="Awaiting action"
          value={String(summary.pending)}
        />
        <SummaryCard
          icon={Undo2}
          label="Refunded"
          value={String(summary.refunded)}
        />
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-forest">Roster</h2>
            <p className="text-xs text-muted mt-0.5">
              {collectingCycle
                ? `Cycle #${collectingCycle.cycle_number} · due ${collectingCycle.due_date}`
                : 'No collecting cycle yet — statuses update when a cycle opens'}
            </p>
          </div>
          <span className="badge bg-primary/10 text-primary text-[11px]">
            Owner only
          </span>
        </div>

        <MembersControl
          circleId={circle.id}
          currency={circle.currency}
          collectingCycleId={collectingCycle?.id ?? null}
          rows={rows.map((r) => ({
            memberId: r.member.id,
            userId: r.member.user_id,
            displayName: r.member.profiles?.display_name ?? 'Member',
            email: r.member.profiles?.email ?? '',
            role: r.member.role,
            status: r.member.status,
            payoutPosition: r.member.payout_position,
            initials: getInitials(
              r.member.profiles?.display_name ?? r.member.profiles?.email ?? 'M'
            ),
            contributionId: r.contribution?.id ?? null,
            contributionStatus: r.contribution?.status ?? 'none',
            reportedAmount: r.contribution
              ? Number(
                  r.contribution.reported_amount ?? r.contribution.expected_amount
                )
              : 0,
            expectedAmount: Number(
              r.contribution?.expected_amount ?? summary.contributionAmount
            ),
          }))}
        />
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="font-display text-lg font-bold text-forest tracking-tight tabular-nums truncate">
        {value}
      </p>
    </div>
  );
}
