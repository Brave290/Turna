import { getDashboardData } from '@/lib/dashboard-data';
import { formatRelativeTime } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const { notifications } = await getDashboardData();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
          Notifications
        </h1>
        <p className="text-muted mt-1">
          Invites, contribution reminders, and payout updates.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-14">
          <Bell className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-muted">No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li key={n.id} className="card flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-forest">{n.title}</p>
                  <StatusBadge status={n.status} />
                </div>
                <p className="text-sm text-muted mt-1">{n.body}</p>
                <p className="text-xs text-muted mt-2">
                  {formatRelativeTime(n.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
