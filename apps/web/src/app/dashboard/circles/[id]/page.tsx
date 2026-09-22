import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  PiggyBank,
  BookOpen,
  MailPlus,
  CalendarDays,
} from 'lucide-react';
import { getCircleDetail } from '@/lib/dashboard-data';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { InviteForm } from '@/components/dashboard/invite-form';

export const dynamic = 'force-dynamic';

export default async function CircleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getCircleDetail(params.id).catch(() => null);
  if (!data) notFound();

  const { circle, members, cycles, invitations, ledger, contributions, payouts, isOwner, user } = data;

  const myMembership = members.find((m) => m.user_id === user.id);
  const pendingInvites = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Link
          href="/dashboard/circles"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          All circles
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
                {circle.name}
              </h1>
              <StatusBadge status={circle.status} />
            </div>
            {circle.description && (
              <p className="text-muted mt-2 max-w-2xl">{circle.description}</p>
            )}
          </div>
          <div className="text-sm sm:text-right">
            <p className="text-muted text-xs">Contribution</p>
            <p className="font-display text-2xl font-bold text-forest">
              {formatCurrency(circle.contribution_amount, circle.currency)}
            </p>
            <p className="text-muted capitalize">{circle.frequency}</p>
          </div>
        </div>
      </div>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-muted mb-1">Current cycle</p>
          <p className="font-display text-2xl font-bold text-forest">
            {circle.current_cycle || 'Not started'}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-muted mb-1">Members</p>
          <p className="font-display text-2xl font-bold text-forest">
            {members.filter((m) => m.status === 'active').length} /{' '}
            {circle.member_limit}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-muted mb-1">Your position</p>
          <p className="font-display text-2xl font-bold text-forest">
            {myMembership ? `#${myMembership.payout_position}` : isOwner ? 'Owner' : '—'}
          </p>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-forest">Members</h2>
          </div>
          <ul className="divide-y divide-border">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {getInitials(member.profiles?.display_name ?? 'M')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-forest truncate">
                    {member.profiles?.display_name ?? 'Member'}
                    {member.user_id === user.id && (
                      <span className="text-muted font-normal"> (you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {member.profiles?.email}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-forest">
                    #{member.payout_position}
                  </p>
                  <span className="badge bg-forest/10 text-forest capitalize">
                    {member.role}
                  </span>
                </div>
              </li>
            ))}
            {members.length === 0 && (
              <li className="py-4 text-sm text-muted">No members yet.</li>
            )}
          </ul>

          {isOwner && (
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <MailPlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-forest">
                  Invite by email
                </h3>
              </div>
              <InviteForm circleId={circle.id} nextPosition={members.length + 1} />
              {pendingInvites.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {pendingInvites.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between text-sm bg-cream rounded-lg px-3 py-2"
                    >
                      <span className="truncate text-forest">{inv.invitee_email}</span>
                      <span className="text-xs text-muted shrink-0 ml-2">
                        exp {formatDate(inv.expires_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-forest">Cycles</h2>
            </div>
            {cycles.length === 0 ? (
              <p className="text-sm text-muted">
                No cycles yet. Cycles start when the circle is activated.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {cycles.map((cycle) => (
                  <li key={cycle.id} className="flex items-center justify-between py-3 gap-3">
                    <div>
                      <p className="font-medium text-forest">
                        Cycle {cycle.cycle_number}
                      </p>
                      <p className="text-xs text-muted">
                        Due {formatDate(cycle.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-forest">
                        {formatCurrency(cycle.expected_amount, circle.currency)}
                      </p>
                      <StatusBadge status={cycle.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <PiggyBank className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-forest">Recent contributions</h2>
            </div>
            {contributions.length === 0 ? (
              <p className="text-sm text-muted">No contributions recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {contributions.slice(0, 8).map((c) => {
                  const member = members.find((m) => m.id === c.member_id);
                  const name =
                    (member?.profiles?.display_name as string | undefined) ??
                    'Member';
                  return (
                    <li key={c.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-forest truncate">{name}</p>
                        <p className="text-xs text-muted">
                          {formatDate(c.created_at)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-forest">
                          {formatCurrency(
                            c.reported_amount ?? c.expected_amount,
                            circle.currency
                          )}
                        </p>
                        <StatusBadge status={c.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="card">
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-forest">Payouts</h2>
        </div>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">No payouts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-2 pr-3 font-medium">Recipient</th>
                  <th className="py-2 pr-3 font-medium">Expected</th>
                  <th className="py-2 pr-3 font-medium">Actual</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map((p) => {
                  const member = members.find(
                    (m) => m.id === p.recipient_member_id
                  );
                  const name =
                    (member?.profiles?.display_name as string | undefined) ??
                    'Member';
                  return (
                    <tr key={p.id}>
                      <td className="py-3 pr-3 text-forest">{name}</td>
                      <td className="py-3 pr-3">
                        {formatCurrency(p.expected_amount, circle.currency)}
                      </td>
                      <td className="py-3 pr-3">
                        {p.actual_amount != null
                          ? formatCurrency(p.actual_amount, circle.currency)
                          : '—'}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-forest">Activity ledger</h2>
        </div>
        {ledger.length === 0 ? (
          <p className="text-sm text-muted">No ledger events yet.</p>
        ) : (
          <ol className="space-y-3">
            {ledger.map((event) => (
              <li key={event.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <div>
                  <p className="text-forest font-medium">
                    {event.event_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(event.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
