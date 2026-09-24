import { ShieldCheck, ScrollText } from 'lucide-react';
import { getLedgerFeed, requireUser, getDashboardData } from '@/lib/dashboard-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';
import { ExportCsvButton } from '@/components/dashboard/export-csv-button';

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

/**
 * Audit log — chronological financial/admin events across owned circles.
 * Owners see full history; members get privacy-filtered activity only.
 */
export default async function AuditLogPage() {
  const { user } = await requireUser();
  const events = await getLedgerFeed();
  const { ownedCircles } = await getDashboardData().catch(() => ({
    ownedCircles: [] as { id: string }[],
  }));
  const isAdminSomewhere = ownedCircles.length > 0;

  const supabase = createServerSupabaseClient();

  let approvalRows: {
    id: string;
    action: string;
    status: string;
    created_at: string;
    circle_id: string;
    requester_id: string;
    circle_name?: string | null;
  }[] = [];
  const { data: approvals } = await supabase
    .from('approval_requests')
    .select('id, action, status, created_at, circle_id, requester_id, circles(name)')
    .order('created_at', { ascending: false })
    .limit(50);
  approvalRows = ((approvals ?? []) as unknown as {
    id: string;
    action: string;
    status: string;
    created_at: string;
    circle_id: string;
    requester_id: string;
    circles?: { name: string } | null;
  }[]).map((a) => ({
    id: a.id,
    action: a.action,
    status: a.status,
    created_at: a.created_at,
    circle_id: a.circle_id,
    requester_id: a.requester_id,
    circle_name: a.circles?.name ?? null,
  }));

  const visibleEvents = isAdminSomewhere
    ? events
    : events.filter((e) => !MEMBER_HIDDEN.has(e.event_type));

  const csvRows = visibleEvents.map((e) => [
    e.created_at,
    e.circles?.name ?? '',
    e.event_type,
    e.entity_type,
    e.id,
  ]);

  void user;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" />
            <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
              Audit log
            </h1>
          </div>
          <p className="text-muted mt-1 max-w-2xl">
            Append-only trail of circle and payment events. Export for
            bookkeeping or dispute resolution.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge ${isAdminSomewhere ? 'bg-primary/10 text-primary' : 'bg-forest/10 text-forest'}`}>
            <ShieldCheck className="w-3.5 h-3.5" />{' '}
            {isAdminSomewhere ? 'Admin view' : 'Privacy mode'}
          </span>
          {csvRows.length > 0 && (
            <ExportCsvButton
              filename={`turna-audit-log-${new Date().toISOString().slice(0, 10)}.csv`}
              headers={['timestamp', 'circle', 'event', 'entity', 'event_id']}
              rows={csvRows}
              label="Export CSV"
            />
          )}
        </div>
      </div>

      <section className="card">
        <h2 className="font-semibold text-forest mb-4">Financial & admin events</h2>
        {visibleEvents.length === 0 ? (
          <p className="text-sm text-muted">No events yet.</p>
        ) : (
          <div className="overflow-x-auto">
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
                {visibleEvents.slice(0, 100).map((event) => (
                  <tr key={event.id}>
                    <td className="py-3 pr-3 text-muted whitespace-nowrap">
                      {formatDate(event.created_at)}
                    </td>
                    <td className="py-3 pr-3 text-forest">{event.circles?.name ?? '—'}</td>
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
      </section>

      <section className="card">
        <h2 className="font-semibold text-forest mb-1">Approval requests</h2>
        <p className="text-xs text-muted mb-4">
          Dual-control decisions (2-of-2) for sensitive actions.
        </p>
        {approvalRows.length === 0 ? (
          <p className="text-sm text-muted">No approval requests recorded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {approvalRows.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-forest capitalize">
                    {a.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {a.circle_name ?? 'Circle'} · {formatDate(a.created_at)}
                    {a.requester_id === user.id ? ' · you' : ''}
                  </p>
                </div>
                <span
                  className={`badge shrink-0 text-[11px] ${
                    a.status === 'approved'
                      ? 'bg-primary/10 text-primary'
                      : a.status === 'rejected'
                        ? 'bg-error/10 text-error'
                        : 'bg-warning/15 text-warning'
                  }`}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
