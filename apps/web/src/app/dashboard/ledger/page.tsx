import { getLedgerFeed } from '@/lib/dashboard-data';
import { formatDate } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const events = await getLedgerFeed();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
          Ledger
        </h1>
        <p className="text-muted mt-1 max-w-2xl">
          Append-only history across your circles. Entries cannot be edited or
          deleted by users — transparency is the product.
        </p>
      </div>

      {events.length === 0 ? (
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
              {events.map((event) => (
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
    </div>
  );
}
