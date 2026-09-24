import Link from 'next/link';
import { NotebookPen } from 'lucide-react';
import { getSoloLedgers } from '@/lib/solo-data';
import { SoloLedgersClient } from '@/components/dashboard/solo/solo-ledgers-client';

export const dynamic = 'force-dynamic';

export default async function SoloLedgerPage() {
  const ledgers = await getSoloLedgers().catch((e: unknown) => {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return [];
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <SoloLedgersClient
        ledgers={ledgers.map((l) => ({
          id: l.id,
          name: l.name,
          currency: l.currency,
          default_amount: l.default_amount,
          description: l.description,
          updated_at: l.updated_at,
        }))}
      />
      <p className="text-xs text-muted flex items-start gap-1.5">
        <NotebookPen className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Different from circle Ledger — Solo Ledger is your private spreadsheet for people who
        contribute to you directly.{' '}
        <Link href="/dashboard/ledger" className="text-primary hover:underline">
          Circle ledger →
        </Link>
      </p>
    </div>
  );
}
