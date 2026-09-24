'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowLeftRight, Check, X, UserRound } from 'lucide-react';
import {
  requestPayoutSwap,
  decidePayoutSwap,
  type ActionState,
} from '@/lib/circle-actions';
import { useFormState } from 'react-dom';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { BrandSelect } from '@/components/ui';
import { maskNameFor } from '@/lib/mask';

type MemberOpt = {
  id: string;
  user_id: string;
  payout_position: number;
  display_name?: string | null;
  isSelf?: boolean;
};

type SwapRow = {
  id: string;
  requester_member_id: string;
  target_member_id: string;
  status: string;
  reason?: string | null;
  requester_name?: string;
  target_name?: string;
  canDecide?: boolean;
  canCancel?: boolean;
};

/**
 * Payout position swap — request + owner/target approve.
 */
export function SwapPanel({
  circleId,
  members,
  swaps,
  isOwner,
  myMemberId,
}: {
  circleId: string;
  members: MemberOpt[];
  swaps: SwapRow[];
  isOwner: boolean;
  myMemberId: string | null;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useFormState(requestPayoutSwap, null as ActionState);
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.success) {
      toast.success(state.success);
      setOpen(false);
      setTargetId('');
      setReason('');
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast]);

  function decide(swapId: string, decision: string) {
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set('swap_id', swapId);
        fd.set('decision', decision);
        const res = await decidePayoutSwap(null, fd);
        if (res?.success) toast.success(res.success);
        else toast.error(res?.error?.form?.[0] ?? 'Failed');
      })();
    });
  }

  const options = members.filter((m) => !m.isSelf && m.user_id);

  return (
    <section className="card" data-no-swipe>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-forest">Payout swaps</h2>
        </div>
        {myMemberId && (
          <button
            type="button"
            className="btn-outline btn-sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Close' : 'Request swap'}
          </button>
        )}
      </div>

      {open && myMemberId && (
        <form action={formAction} className="mb-4 space-y-3 border border-border rounded-xl p-4">
          <input type="hidden" name="circle_id" value={circleId} />
          <div>
            <label className="label" htmlFor="swap-target">
              Swap payout month with
            </label>
            <BrandSelect
              id="swap-target"
              name="target_member_id"
              value={targetId}
              onChange={setTargetId}
              options={[
                { value: '', label: 'Choose a member…' },
                ...options.map((m) => ({
                  value: m.id,
                  label: `#${m.payout_position} · ${maskNameFor(m.display_name)}`,
                })),
              ]}
              aria-label="Swap with member"
            />
            {!targetId && (
              <input type="hidden" name="target_member_id" value="" required />
            )}
          </div>
          <div>
            <label className="label" htmlFor="swap-reason">
              Reason (optional)
            </label>
            <input
              id="swap-reason"
              name="reason"
              className="input"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. I'll be away that month"
            />
          </div>
          <button type="submit" className="btn-primary btn-sm" disabled={pending || !targetId}>
            {pending ? <Spinner /> : 'Send request'}
          </button>
        </form>
      )}

      {swaps.length === 0 ? (
        <p className="text-sm text-muted">
          No swap requests. Members can request to trade payout positions — the
          other member (or admin) approves.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {swaps.map((s) => (
            <li key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-forest">
                  {s.requester_name ?? 'Member'} → {s.target_name ?? 'Member'}
                </p>
                <p className="text-xs text-muted capitalize">
                  {s.status}
                  {s.reason ? ` · ${s.reason}` : ''}
                </p>
              </div>
              {s.status === 'pending' && (s.canDecide || s.canCancel) && (
                <div className="flex items-center gap-2 shrink-0">
                  {s.canDecide && (
                    <>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={pending}
                        onClick={() => decide(s.id, 'approved')}
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        disabled={pending}
                        onClick={() => decide(s.id, 'rejected')}
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                  {s.canCancel && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={pending}
                      onClick={() => decide(s.id, 'cancelled')}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
          <UserRound className="w-3.5 h-3.5" />
          As admin you can approve or reject any pending swap.
        </p>
      )}
    </section>
  );
}
