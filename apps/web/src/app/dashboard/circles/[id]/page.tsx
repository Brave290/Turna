import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  PiggyBank,
  BookOpen,
  MailPlus,
  CalendarDays,
  Percent,
  EyeOff,
  Send,
  UserCog,
} from 'lucide-react';
import { getCircleDetail } from '@/lib/dashboard-data';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { InviteForm } from '@/components/dashboard/invite-form';
import { DeleteCircleButton } from '@/components/dashboard/delete-circle';
import { CircleFeeForm } from '@/components/dashboard/circle-fee-form';
import { PayContributionButton } from '@/components/dashboard/pay-contribution';
import { SendPayoutButton } from '@/components/dashboard/send-payout';
import { SwapPanel } from '@/components/dashboard/swap-panel';
import { LifecycleControls, LeaveCircleButton } from '@/components/dashboard/lifecycle-controls';
import { RemoveMemberButton } from '@/components/dashboard/remove-member';
import { ContributionActions } from '@/components/dashboard/contribution-actions';
import { InviteShareButton } from '@/components/dashboard/invite-share-button';
import { CircleAnnouncements } from '@/components/dashboard/circle-announcements';
import { CirclePolls } from '@/components/dashboard/circle-polls';
import { CircleCalendar } from '@/components/dashboard/circle-calendar';
import { CircleAnalytics } from '@/components/dashboard/circle-analytics';
import { CircleRulesCard } from '@/components/dashboard/circle-rules';
import { RoleManager } from '@/components/dashboard/role-manager';
import { ApprovalPanel } from '@/components/dashboard/approval-panel';

export const dynamic = 'force-dynamic';

/** Mask a full name for non-admin viewers: "Jane Okafor" → "J••• O•••" */
function maskName(name?: string | null): string {
  if (!name) return 'Member';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part.length <= 1
        ? part.toUpperCase()
        : `${part[0].toUpperCase()}${'•'.repeat(Math.min(part.length - 1, 4))}`
    )
    .join(' ');
}

function maskEmail(email?: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '•••';
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

const MEMBER_HIDDEN_EVENTS = new Set([
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

export default async function CircleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getCircleDetail(params.id).catch(() => null);
  if (!data) notFound();

  const {
    circle,
    members,
    cycles,
    invitations,
    ledger,
    contributions,
    payouts,
    isOwner,
    user,
    myContribution,
    collectingCycle,
    swaps,
    announcements,
    polls,
    myAgreementVersion,
    approvals,
  } = data;

  const myMembership = members.find((m) => m.user_id === user.id);
  const pendingInvites = invitations.filter(
    (i) => i.status === 'pending' && (!i.is_open || !!i.invitee_email)
  );

  // Privacy: only owner (room admin) sees full identities & money events
  const visibleLedger = isOwner
    ? ledger
    : ledger.filter((e) => !MEMBER_HIDDEN_EVENTS.has(e.event_type));

  // Contributions list: non-owners only see their own + status without amounts of others
  const visibleContributions = isOwner
    ? contributions
    : contributions.filter((c) => c.member_id === myMembership?.id);

  const visiblePayouts = isOwner
    ? payouts
    : payouts.filter(
        (p) =>
          p.recipient_member_id === myMembership?.id ||
          p.status === 'received'
      );

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
              {isOwner && (
                <span className="badge bg-primary/10 text-primary">Admin</span>
              )}
            </div>
            {circle.description && (
              <p className="text-muted mt-2 max-w-2xl">{circle.description}</p>
            )}
            {!isOwner && (
              <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5" />
                Member names and payment history are hidden for privacy. Only
                the circle admin sees full details.
              </p>
            )}
          </div>
          <div className="text-sm sm:text-right">
            <div className="flex flex-col items-start sm:items-end gap-2">
              <div>
                <p className="text-muted text-xs">Contribution</p>
                <p className="font-display text-2xl font-bold text-forest">
                  {formatCurrency(circle.contribution_amount, circle.currency)}
                </p>
                <p className="text-muted capitalize">{circle.frequency}</p>
                {(circle.start_date || circle.end_date) && (
                  <p className="text-xs text-muted mt-1">
                    {circle.start_date
                      ? new Date(circle.start_date + 'T00:00:00').toLocaleDateString('en-NG', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : ''}
                    {circle.start_date && circle.end_date ? ' → ' : ''}
                    {circle.end_date
                      ? new Date(circle.end_date + 'T00:00:00').toLocaleDateString('en-NG', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : ''}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2 justify-start sm:justify-end">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                    {(circle as { payout_mode?: string }).payout_mode === 'end_of_term'
                      ? 'Collects at end'
                      : 'Collects on turn'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-forest/10 text-forest capitalize">
                    {(circle as { payment_mode?: string }).payment_mode === 'autopay'
                      ? 'Autopay'
                      : 'Manual pay'}
                  </span>
                </div>
              </div>
              {isOwner && (
                <div className="flex flex-wrap gap-2 justify-start sm:justify-end mt-2">
                  <Link
                    href={`/dashboard/circles/${circle.id}/members`}
                    className="btn-outline btn-sm"
                  >
                    <UserCog className="w-4 h-4" />
                    Member control
                  </Link>
                  <InviteShareButton
                    circleId={circle.id}
                    circleName={circle.name}
                    contributionAmount={Number(circle.contribution_amount)}
                    currency={circle.currency}
                    frequency={circle.frequency}
                    memberCount={members.filter((m) => m.status === 'active').length}
                    memberLimit={circle.member_limit}
                  />
                  <DeleteCircleButton
                    circleId={circle.id}
                    circleName={circle.name}
                    status={circle.status}
                  />
                </div>
              )}
              {!isOwner && myMembership && (
                <LeaveCircleButton circleId={circle.id} circleName={circle.name} />
              )}
            </div>
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

      {/* Pay contribution — members with collecting cycle */}
      {!isOwner && collectingCycle && myMembership && (
        <section className="card border-primary/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Cycle {collectingCycle.cycle_number} contribution</p>
              <p className="font-display text-2xl font-bold text-forest">
                {formatCurrency(
                  collectingCycle.expected_amount +
                    Math.floor(
                      (collectingCycle.expected_amount *
                        (Number(circle.fee_bps ?? 0) +
                          Number(circle.network_charge_bps ?? 0))) /
                        10000
                    ),
                  circle.currency
                )}
                <span className="text-sm font-normal text-muted ml-2">
                  (incl. fees)
                </span>
              </p>
              {(circle as { payment_mode?: string }).payment_mode === 'autopay' && (
                <p className="text-xs text-primary mt-1">
                  Autopay on — we charge your saved channel if a due date is missed
                  (after your first successful payment).
                </p>
              )}
              <p className="text-xs text-muted">
                Due {formatDate(collectingCycle.due_date)}
                {myContribution
                  ? ` · status: ${myContribution.status}`
                  : ' · not paid yet'}
              </p>
            </div>
            {(!myContribution || myContribution.status !== 'confirmed') && (
              <PayContributionButton
                circleId={circle.id}
                cycleId={collectingCycle.id}
                baseAmountKobo={Number(collectingCycle.expected_amount)}
                currency={circle.currency}
                feeBps={Number(circle.fee_bps ?? 0)}
                networkBps={Number(circle.network_charge_bps ?? 0)}
                feePayer={circle.fee_payer ?? 'member'}
              />
            )}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <RoleManager
          circleId={circle.id}
          isOwner={isOwner}
          members={members
            .filter((m) => m.status === 'active')
            .map((m) => ({
              id: m.id,
              user_id: m.user_id,
              role: m.role,
              display_name: m.profiles?.display_name ?? null,
              isSelf: m.user_id === user.id,
            }))}
        />
        <ApprovalPanel
          circleId={circle.id}
          myUserId={user.id}
          canRequest={isOwner || myMembership?.role === 'treasurer'}
          requests={approvals}
        />
        <CircleRulesCard
          circleId={circle.id}
          canEdit={isOwner}
          frequency={circle.frequency}
          contributionAmount={Number(circle.contribution_amount)}
          currency={circle.currency}
          latePolicy={(circle as { late_policy?: string }).late_policy ?? 'admin_review'}
          payoutMode={(circle as { payout_mode?: string }).payout_mode ?? 'rotating'}
          rules={(circle as { rules?: Record<string, unknown> | null }).rules ?? null}
          rulesVersion={(circle as { rules_version?: number }).rules_version ?? 1}
          myAcceptedVersion={myAgreementVersion ?? null}
        />
        <CircleAnnouncements
          circleId={circle.id}
          canPost={isOwner || myMembership?.role === 'treasurer'}
          announcements={announcements}
        />
        <CirclePolls
          circleId={circle.id}
          canCreate={isOwner || myMembership?.role === 'treasurer'}
          polls={polls}
        />
        <CircleCalendar
          cycles={cycles.map((c) => ({
            id: c.id,
            cycle_number: c.cycle_number,
            due_date: c.due_date,
            status: c.status,
            expected_amount: c.expected_amount,
          }))}
          currency={circle.currency}
        />
        <CircleAnalytics
          isOwner={isOwner}
          contributionAmount={Number(circle.contribution_amount)}
          currency={circle.currency}
          memberCount={members.filter((m) => m.status === 'active').length}
          memberLimit={circle.member_limit}
          cycles={cycles.map((c) => ({
            id: c.id,
            cycle_number: c.cycle_number,
            status: c.status,
            expected_amount: c.expected_amount,
          }))}
          contributions={contributions.map((c) => ({
            id: c.id,
            status: c.status,
            amount: c.reported_amount ?? c.expected_amount,
            cycle_id: c.cycle_id,
          }))}
        />
        <SwapPanel
          circleId={circle.id}
          isOwner={isOwner}
          myMemberId={myMembership?.id ?? null}
          members={members
            .filter((m) => m.status === 'active')
            .map((m) => ({
              id: m.id,
              user_id: m.user_id,
              payout_position: m.payout_position,
              display_name: m.profiles?.display_name,
              isSelf: m.user_id === user.id,
            }))}
          swaps={swaps.map((s) => {
            const req = members.find((m) => m.id === s.requester_member_id);
            const tgt = members.find((m) => m.id === s.target_member_id);
            return {
              id: s.id,
              requester_member_id: s.requester_member_id,
              target_member_id: s.target_member_id,
              status: s.status,
              reason: s.reason,
              requester_name: isOwner
                ? (req?.profiles?.display_name as string | undefined)
                : req?.user_id === user.id
                  ? 'You'
                  : maskName(req?.profiles?.display_name),
              target_name: isOwner
                ? (tgt?.profiles?.display_name as string | undefined)
                : tgt?.user_id === user.id
                  ? 'You'
                  : maskName(tgt?.profiles?.display_name),
              canDecide:
                isOwner ||
                tgt?.user_id === user.id ||
                req?.user_id === user.id,
              canCancel: req?.user_id === user.id,
            };
          })}
        />

        <section className="card">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-forest">Your contributions</h2>
            </div>
          </div>
          <ContributionActions
            circleId={circle.id}
            cycleId={collectingCycle?.id ?? null}
            myContribution={
              myContribution
                ? {
                    id: myContribution.id,
                    status: myContribution.status,
                    amount: myContribution.reported_amount ?? myContribution.expected_amount,
                  }
                : null
            }
            expectedAmount={collectingCycle?.expected_amount ?? 0}
            currency={circle.currency}
            canReport={Boolean(collectingCycle && collectingCycle.status === 'collecting')}
          />
        </section>
      </div>

      {isOwner && (
        <LifecycleControls circleId={circle.id} status={circle.status} />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-forest">
                {isOwner ? 'Members (full details)' : 'Members (private)'}
              </h2>
            </div>
            {!isOwner && (
              <span className="text-xs text-muted flex items-center gap-1">
                <EyeOff className="w-3.5 h-3.5" /> anonymous
              </span>
            )}
          </div>
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const isSelf = member.user_id === user.id;
              const displayName = isOwner || isSelf
                ? member.profiles?.display_name ?? 'Member'
                : maskName(member.profiles?.display_name);
              const email = isOwner || isSelf
                ? member.profiles?.email
                : maskEmail(member.profiles?.email);

              return (
                <li key={member.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {isOwner || isSelf
                      ? getInitials(member.profiles?.display_name ?? 'M')
                      : (member.profiles?.display_name?.[0] ?? 'M').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-forest truncate">
                      {displayName}
                      {isSelf && <span className="text-muted font-normal"> (you)</span>}
                      {member.role === 'owner' && !isSelf && (
                        <span className="badge bg-primary/10 text-primary ml-2 text-[10px]">
                          admin
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted truncate">{email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-forest">
                      #{member.payout_position}
                    </p>
                    <span className="badge bg-forest/10 text-forest capitalize">
                      {member.role}
                    </span>
                    {isOwner && member.role !== 'owner' && (
                      <div className="mt-1">
                        <RemoveMemberButton
                          circleId={circle.id}
                          memberId={member.id}
                          memberLabel={
                            member.profiles?.display_name ?? 'member'
                          }
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            {members.length === 0 && (
              <li className="py-4 text-sm text-muted">No members yet.</li>
            )}
          </ul>

          {isOwner && (
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <MailPlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-forest">
                  Invite members
                </h3>
              </div>
              <InviteForm circleId={circle.id} nextPosition={members.length + 1} />
              <div className="mt-3">
                <InviteShareButton
                  circleId={circle.id}
                  circleName={circle.name}
                  contributionAmount={Number(circle.contribution_amount)}
                  currency={circle.currency}
                  frequency={circle.frequency}
                  memberCount={members.filter((m) => m.status === 'active').length}
                  memberLimit={circle.member_limit}
                />
              </div>
              {pendingInvites.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {pendingInvites.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between text-sm bg-cream rounded-lg px-3 py-2"
                    >
                      <span className="truncate text-forest">
                        {inv.is_open ? 'Open share link' : inv.invitee_email}
                      </span>
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
              <h2 className="font-semibold text-forest">
                {isOwner ? 'Recent contributions' : 'Your contributions'}
              </h2>
            </div>
            {visibleContributions.length === 0 ? (
              <p className="text-sm text-muted">
                {isOwner
                  ? 'No contributions recorded yet.'
                  : 'You have no contributions recorded yet.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {visibleContributions.slice(0, 8).map((c) => {
                  const member = members.find((m) => m.id === c.member_id);
                  const name = isOwner
                    ? (member?.profiles?.display_name as string | undefined) ?? 'Member'
                    : member?.user_id === user.id
                      ? 'You'
                      : maskName(member?.profiles?.display_name);
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

          {isOwner && (
            <section className="card border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-forest">Fees & network charge</h2>
              </div>
              <p className="text-xs text-muted mb-4">
                Admin-only. Platform fee and network/VAT charged to members on
                each contribution.
              </p>
              <CircleFeeForm
                circleId={circle.id}
                contributionAmount={Number(circle.contribution_amount)}
                initialFeeBps={Number(circle.fee_bps ?? 0)}
                initialNetworkBps={Number(circle.network_charge_bps ?? 0)}
                initialFeePayer={circle.fee_payer ?? 'member'}
                currency={circle.currency}
              />
            </section>
          )}
        </div>
      </div>

      <section className="card">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-forest">Payouts</h2>
          </div>
          {!isOwner && (
            <span className="text-xs text-muted flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5" /> only your payouts shown
            </span>
          )}
        </div>
        {visiblePayouts.length === 0 && isOwner && cycles.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Ready cycles can pay out to the recipient&apos;s saved bank account.
            </p>
            {cycles
              .filter(
                (c) =>
                  c.status === 'payout_pending' ||
                  c.status === 'payout_initiated'
              )
              .map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-forest">
                      Cycle {c.cycle_number} payout
                    </p>
                    <p className="text-xs text-muted">
                      Pot: {formatCurrency(c.expected_amount, circle.currency)} ·{' '}
                      <StatusBadge status={c.status} />
                    </p>
                  </div>
                  <SendPayoutButton cycleId={c.id} />
                </div>
              ))}
            {cycles.every(
              (c) =>
                c.status !== 'payout_pending' && c.status !== 'payout_initiated'
            ) && (
              <p className="text-sm text-muted">No payouts yet.</p>
            )}
          </div>
        ) : visiblePayouts.length === 0 ? (
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
                  {isOwner && <th className="py-2 font-medium">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visiblePayouts.map((p) => {
                  const member = members.find(
                    (m) => m.id === p.recipient_member_id
                  );
                  const isSelf = member?.user_id === user.id;
                  const name = isOwner
                    ? (member?.profiles?.display_name as string | undefined) ?? 'Member'
                    : isSelf
                      ? 'You'
                      : maskName(member?.profiles?.display_name);
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
                      {isOwner && (
                        <td className="py-3">
                          {p.status !== 'received' && (
                            <SendPayoutButton
                              cycleId={p.cycle_id}
                              compact
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-forest">
              {isOwner ? 'Activity ledger (full)' : 'Activity ledger (limited)'}
            </h2>
          </div>
          {!isOwner && (
            <span className="text-xs text-muted flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5" /> payment events hidden
            </span>
          )}
        </div>
        {visibleLedger.length === 0 ? (
          <p className="text-sm text-muted">No ledger events yet.</p>
        ) : (
          <ol className="space-y-3">
            {visibleLedger.map((event) => (
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
        {!isOwner && (
          <p className="text-xs text-muted mt-4 pt-4 border-t border-border flex items-start gap-1.5">
            <Send className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Contribution and payout details are only visible to the circle
            admin so member payments stay private.
          </p>
        )}
      </section>
    </div>
  );
}
