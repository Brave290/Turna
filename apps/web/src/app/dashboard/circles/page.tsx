import Link from 'next/link';
import { Plus, Users, ArrowRight } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import { formatCurrency } from '@/lib/utils';
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
      memberCount: (circle as { member_count?: number }).member_count ?? null,
      payoutPosition: membership?.payout_position ?? null,
    };
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
            Circles
          </h1>
          <p className="text-muted mt-1 text-[15px]">
            {enriched.length === 0
              ? 'Start your first savings circle.'
              : `${enriched.length} circle${enriched.length === 1 ? '' : 's'} you belong to.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/circles/join" className="btn-outline">
            <Users className="w-4 h-4" />
            Join
          </Link>
          <Link href="/dashboard/circles/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Circle
          </Link>
        </div>
      </div>

      {enriched.length === 0 ? (
        <div className="card text-center py-14 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="font-display text-xl font-semibold text-forest mb-2">
            No circles yet
          </h2>
          <p className="text-muted mb-6 max-w-md mx-auto leading-relaxed">
            Create a circle, set contribution amount and schedule, then invite
            members by email — or join with a code.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard/circles/new" className="btn-primary inline-flex justify-center">
              <Plus className="w-4 h-4" />
              Create a circle
            </Link>
            <Link href="/circles/join" className="btn-outline inline-flex justify-center">
              Join with code
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {enriched.map((circle) => (
            <Link
              key={circle.id}
              href={`/dashboard/circles/${circle.id}`}
              className="card-hover group rounded-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-forest group-hover:text-primary transition-colors truncate text-[15px]">
                    {circle.name}
                  </h2>
                  <p className="text-sm text-primary font-medium mt-0.5 tabular-nums">
                    {formatCurrency(circle.contribution_amount, circle.currency)}
                    <span className="text-muted font-normal"> / {circle.frequency}</span>
                  </p>
                </div>
                <StatusBadge status={circle.status} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="badge bg-cream text-muted text-[11px] capitalize">
                  {circle.role}
                </span>
                {circle.memberCount != null && (
                  <span className="badge bg-cream text-muted text-[11px]">
                    {circle.memberCount} members
                  </span>
                )}
                <span className="badge bg-cream text-muted text-[11px]">
                  Cycle {circle.current_cycle || 0}
                </span>
                {circle.payoutPosition != null && (
                  <span className="badge bg-primary/10 text-primary text-[11px]">
                    Pos {circle.payoutPosition}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto pt-1">
                {circle.description ? (
                  <p className="text-xs text-muted line-clamp-1 flex-1 pr-2">
                    {circle.description}
                  </p>
                ) : (
                  <span />
                )}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary shrink-0">
                  Open
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
