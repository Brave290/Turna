import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSoloLedgerDetail, formatPeriodLabel, periodKey } from '@/lib/solo-data';
import { SoloLedgerBoard } from '@/components/dashboard/solo/solo-ledger-board';

export const dynamic = 'force-dynamic';

export default async function SoloLedgerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getSoloLedgerDetail(params.id).catch((e: unknown) => {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return null;
  });
  if (!data) notFound();

  const { ledger, contributors, entries } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/dashboard/solo-ledger"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          All solo ledgers
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
                {ledger.name}
              </h1>
              <span className="badge bg-primary/10 text-primary">Solo</span>
            </div>
            {ledger.description && (
              <p className="text-sm text-muted mt-1">{ledger.description}</p>
            )}
            <p className="text-xs text-muted mt-1">
              Current view: {formatPeriodLabel(periodKey())}
            </p>
          </div>
        </div>
      </div>

      <SoloLedgerBoard
        ledgerId={ledger.id}
        name={ledger.name}
        currency={ledger.currency}
        defaultAmount={ledger.default_amount}
        description={ledger.description}
        contributors={contributors.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          note: c.note,
          expected_amount: c.expected_amount,
          sort_order: c.sort_order,
          archived: c.archived,
        }))}
        entries={entries.map((e) => ({
          contributor_id: e.contributor_id,
          period: e.period,
          status: e.status,
          amount_paid: e.amount_paid,
          paid_on: e.paid_on,
          note: e.note,
          local_updated_at: e.local_updated_at,
        }))}
      />
    </div>
  );
}
