import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';

export const dynamic = 'force-dynamic';

export default async function CirclesPage() {
  const { circles, user, memberships } = await getDashboardData();

  const enriched = circles.map((circle) => {
    const membership = memberships.find((m) => m.circle_id === circle.id);
    return {
      ...circle,
      role:
        circle.owner_id === user.id
          ? 'owner'
          : membership?.role ?? 'member',
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
            Circles
          </h1>
          <p className="text-muted mt-1">
            Savings circles you own or belong to.
          </p>
        </div>
        <Link href="/dashboard/circles/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Circle
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="card text-center py-14">
          <Users className="w-9 h-9 text-muted mx-auto mb-4" />
          <h2 className="font-semibold text-forest mb-2">No circles yet</h2>
          <p className="text-muted mb-6 max-w-md mx-auto">
            Create a circle, set contribution amount and schedule, then invite
            members by email.
          </p>
          <Link href="/dashboard/circles/new" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" />
            Create a circle
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {enriched.map((circle) => (
            <Link
              key={circle.id}
              href={`/dashboard/circles/${circle.id}`}
              className="card-hover group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="font-semibold text-forest group-hover:text-primary transition-colors">
                  {circle.name}
                </h2>
                <StatusBadge status={circle.status} />
              </div>
              {circle.description && (
                <p className="text-sm text-muted mb-3 line-clamp-2">
                  {circle.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted text-xs">Contribution</p>
                  <p className="font-medium text-forest">
                    {formatCurrency(circle.contribution_amount, circle.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">Schedule</p>
                  <p className="font-medium text-forest capitalize">
                    {circle.frequency}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">Cycle</p>
                  <p className="font-medium text-forest">
                    {circle.current_cycle || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">Your role</p>
                  <p className="font-medium text-forest capitalize">{circle.role}</p>
                </div>
              </div>
              <p className="text-xs text-muted mt-4">
                Created {formatDate(circle.created_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
