'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import {
  BadgeCheck,
  CircleSlash,
  Crown,
  Undo2,
  UserMinus,
} from 'lucide-react';
import {
  decideContribution,
  removeMember,
  type ActionState,
} from '@/lib/circle-actions';
import {
  setMemberRole,
  type FeatureActionState,
} from '@/lib/circle-features-actions';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/ui';
import { Spinner } from '@/components/spinner';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { formatCurrency } from '@/lib/utils';

export type MemberLedgerRow = {
  memberId: string;
  userId: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  payoutPosition: number;
  initials: string;
  contributionId: string | null;
  contributionStatus: string;
  reportedAmount: number;
  expectedAmount: number;
};

/**
 * Owner member control — mark paid, refund, role, remove.
 * One row per member with live status for the collecting cycle.
 */
export function MembersControl({
  circleId,
  currency,
  collectingCycleId,
  rows,
}: {
  circleId: string;
  currency: string;
  collectingCycleId: string | null;
  rows: MemberLedgerRow[];
}) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'refunded'>('all');
  const [state, formAction] = useFormState(decideContribution, null as ActionState);
  const [removeState, removeAction] = useFormState(removeMember, null as ActionState);
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.success) toast.success(state.success);
    else if (state.error?.form?.[0]) toast.error(state.error.form[0]);
  }, [state, toast]);

  const lastRemoveRef = useRef('');
  useEffect(() => {
    if (!removeState) return;
    const key = JSON.stringify({
      s: removeState.success ?? null,
      e: removeState.error?.form?.[0] ?? null,
    });
    if (key === lastRemoveRef.current) return;
    lastRemoveRef.current = key;
    if (removeState.success) toast.success(removeState.success);
    else if (removeState.error?.form?.[0]) toast.error(removeState.error.form[0]);
  }, [removeState, toast]);

  function decide(contributionId: string, decision: string) {
    const fd = new FormData();
    fd.set('contribution_id', contributionId);
    fd.set('decision', decision);
    startTransition(() => {
      void formAction(fd);
    });
  }

  function changeRole(memberId: string, role: string) {
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('member_id', memberId);
    fd.set('role', role);
    startTransition(() => {
      void setMemberRole(null, fd).then((res: FeatureActionState) => {
        if (res?.success) toast.success(res.success);
        else toast.error(res?.error?.form?.[0] ?? 'Could not update role');
      });
    });
  }

  async function remove(memberId: string, name: string) {
    const ok = await confirm(
      `Remove ${name} from this circle? They lose access immediately.`,
      { title: 'Remove member?', confirmLabel: 'Remove', danger: true }
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('member_id', memberId);
    startTransition(() => {
      void removeAction(fd);
    });
  }

  const filtered = rows.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'pending')
      return (
        r.contributionStatus === 'none' ||
        r.contributionStatus === 'pending' ||
        r.contributionStatus === 'reported'
      );
    if (filter === 'confirmed') return r.contributionStatus === 'confirmed';
    if (filter === 'refunded') return r.contributionStatus === 'refunded';
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Awaiting' },
    { id: 'confirmed', label: 'Paid' },
    { id: 'refunded', label: 'Refunded' },
  ] as const;

  return (
    <div data-no-swipe>
      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`btn-sm rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === t.id
                ? 'bg-primary text-white'
                : 'bg-cream text-muted hover:text-forest border border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
        {!collectingCycleId && (
          <span className="text-xs text-muted ml-auto">
            Open a cycle to mark paid / refund
          </span>
        )}
      </div>

      <ul className="divide-y divide-border">
        {filtered.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">
            No members match this filter.
          </li>
        )}
        {filtered.map((r) => {
          const actionable =
            collectingCycleId &&
            r.contributionId &&
            (r.contributionStatus === 'reported' ||
              r.contributionStatus === 'confirmed' ||
              r.contributionStatus === 'disputed');
          const canMarkPaid =
            actionable &&
            (r.contributionStatus === 'reported' ||
              r.contributionStatus === 'disputed');
          const canRefund = actionable && r.contributionStatus === 'confirmed';
          const showStatus =
            r.contributionStatus !== 'none' && r.contributionStatus !== 'pending';

          return (
            <li
              key={r.memberId}
              className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-primary/15">
                  {r.initials}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-forest truncate flex items-center gap-1.5">
                    {r.displayName}
                    {r.role === 'owner' && (
                      <Crown className="w-3.5 h-3.5 text-warning shrink-0" aria-label="Owner" />
                    )}
                    <span className="badge bg-forest/10 text-forest capitalize text-[10px] font-medium">
                      #{r.payoutPosition}
                    </span>
                  </p>
                  <p className="text-xs text-muted truncate">{r.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {showStatus ? (
                  <StatusBadge status={r.contributionStatus} />
                ) : collectingCycleId ? (
                  <span className="badge bg-warning/15 text-warning text-[11px]">
                    Awaiting
                  </span>
                ) : (
                  <span className="badge bg-border text-muted text-[11px]">—</span>
                )}

                {showStatus && r.reportedAmount > 0 && (
                  <span className="text-xs text-muted tabular-nums">
                    {formatCurrency(r.reportedAmount, currency)}
                  </span>
                )}

                {canMarkPaid && r.contributionId && (
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={pending}
                    onClick={() => decide(r.contributionId!, 'confirmed')}
                    title="Mark as paid"
                  >
                    {pending ? (
                      <Spinner className="w-3.5 h-3.5" />
                    ) : (
                      <BadgeCheck className="w-3.5 h-3.5" />
                    )}
                    Mark paid
                  </button>
                )}

                {canRefund && r.contributionId && (
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    disabled={pending}
                    onClick={() => decide(r.contributionId!, 'refunded')}
                    title="Refund this contribution"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Refund
                  </button>
                )}

                {r.role !== 'owner' && (
                  <RolePicker
                    value={r.role}
                    disabled={pending}
                    name={r.displayName}
                    onChange={(v) => changeRole(r.memberId, v)}
                  />
                )}

                {r.role !== 'owner' && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm px-2 text-error"
                    disabled={pending}
                    aria-label={`Remove ${r.displayName}`}
                    onClick={() => void remove(r.memberId, r.displayName)}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="px-5 py-3 border-t border-border text-[11px] text-muted flex items-center gap-1.5">
        <CircleSlash className="w-3.5 h-3.5 shrink-0" />
        Refund reverses the wallet balance and logs a ledger event. Mark paid
        issues a receipt code when missing.
      </div>

      {dialog}
      <form action={removeAction} className="hidden">
        <input type="hidden" name="circle_id" value={circleId} />
      </form>
    </div>
  );
}

function RolePicker({
  value,
  disabled,
  name,
  onChange,
}: {
  value: string;
  disabled: boolean;
  name: string;
  onChange: (v: string) => void;
}) {
  if (value === 'owner') return null;
  return (
    <select
      className="input w-auto text-xs py-1.5 px-2 rounded-lg"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Role for ${name}`}
    >
      <option value="treasurer">Treasurer</option>
      <option value="member">Member</option>
      <option value="observer">Observer</option>
    </select>
  );
}
