import { getLedgerFeed, requireUser, getDashboardData } from '@/lib/dashboard-data';
import { formatDate } from '@/lib/utils';
import { BookOpen, EyeOff, ShieldCheck } from 'lucide-react';
import { ExportCsvButton } from '@/components/dashboard/export-csv-button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const MEMBER_HIDDEN = new Set([
  'CONTRIBUTION_REPORTED',
  'CONTRIBUTION_CONFIRMED',
  'CONTRIBUTION_REJECTED',
  'CONTRIBUTION_DISPUTED',
  'CONTRIBUTION_CORRECTION_REQUESTED',
  'CONTRIBUTION_CORRECTION_APPROVED',
  'CONTRIBUTION_CORRECTION_REJECTED',
  'PAYOUT_INITIATED',
  'PAYOUT_MARKED_SENT',
  'PAYOUT_RECEIPT_CONFIRMED',
  'PAYOUT_DISPUTED',
  'PAYOUT_ORDER_SET',
  'PAYOUT_ORDER_CHANGED',
]);

export default async function LedgerPage() {
  const events = await getLedgerFeed();
  const { user } = await requireUser();
  const { ownedCircles } = await getDashboardData().catch(() => ({
    ownedCircles: [] as { id: string }[],
  }));

  const ownedIds = new Set(ownedCircles.map((c) => c.id));
  const isAdminSomewhere = ownedIds.size > 0;

  // Non-admins: strip money events (privacy — no other members' payments)
  const visible = isAdminSomewhere
    ? events
    : events.filter((e) => !MEMBER_HIDDEN.has(e.event_type));

  void user;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
            Ledger
          </h1>
          <p className="text-muted mt-1 max-w-2xl">
            {isAdminSomewhere
              ? 'Append-only history for circles you own (admin view).'
              : 'General activity only. Contribution and payout events for other members are hidden to protect privacy.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span
            className={`badge ${isAdminSomewhere ? 'bg-primary/10 text-primary' : 'bg-forest/10 text-forest'}`}
          >
            {isAdminSomewhere ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" /> Admin view
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Privacy mode
              </>
            )}
          </span>
          {visible.length > 0 && (
            <ExportCsvButton
              filename={`turna-ledger-${new Date().toISOString().slice(0, 10)}.csv`}
              headers={['timestamp', 'circle', 'event', 'entity', 'event_id']}
              rows={visible.map((e) => [
                e.created_at,
                e.circles?.name ?? '',
                e.event_type,
                e.entity_type,
                e.id,
              ])}
            />
          )}
          <Link href="/dashboard/audit-log" className="btn-ghost btn-sm">
            Audit log
          </Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card text-center py-14">
          <BookOpen className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-muted">No ledger events yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Circle</th>
                <th className="py-2 pr-3 font-medium">Event</th>
                <th className="py-2 font-medium">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((event) => (
                <tr key={event.id}>
                  <td className="py-3 pr-3 text-muted whitespace-nowrap">
                    {formatDate(event.created_at)}
                  </td>
                  <td className="py-3 pr-3 text-forest">
                    {event.circles?.name ?? '—'}
                  </td>
                  <td className="py-3 pr-3 text-forest font-medium">
                    {event.event_type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 text-muted">{event.entity_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isAdminSomewhere && (
        <p className="text-xs text-muted flex items-start gap-1.5">
          <EyeOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Payment and payout ledger entries only appear for the circle admin
          (owner). Your own events still show on the circle page.
        </p>
      )}
    </div>
  );
}
