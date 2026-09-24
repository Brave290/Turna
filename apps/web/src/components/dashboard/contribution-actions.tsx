'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { CheckCircle2, Flag, Send } from 'lucide-react';
import {
  reportContribution,
  decideContribution,
  type ActionState,
} from '@/lib/circle-actions';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { formatCurrency } from '@/lib/utils';

/**
 * Member contribution actions: report (manual/proof), dispute, and
 * owner confirm/reject when reviewing reported rows.
 */
export function ContributionActions({
  cycleId,
  myContribution,
  expectedAmount,
  currency,
  canReport,
  ownerRows,
}: {
  circleId?: string;
  cycleId: string | null;
  myContribution: { id: string; status: string; amount: number } | null;
  expectedAmount: number;
  currency: string;
  canReport: boolean;
  /** Owner review rows (contribution id + label) — optional */
  ownerRows?: {
    id: string;
    label: string;
    status: string;
    amount: number;
  }[];
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useFormState(reportContribution, null as ActionState);
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
      setAmount('');
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast]);

  function decide(contributionId: string, decision: string) {
    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set('contribution_id', contributionId);
        fd.set('decision', decision);
        const res = await decideContribution(null, fd);
        if (res?.success) toast.success(res.success);
        else toast.error(res?.error?.form?.[0] ?? 'Failed');
      })();
    });
  }

  const settled =
    myContribution?.status === 'confirmed' ||
    myContribution?.status === 'disputed';

  return (
    <div className="space-y-4" data-no-swipe>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Expected</p>
          <p className="font-display text-2xl font-bold text-forest">
            {formatCurrency(expectedAmount, currency)}
          </p>
          {myContribution && (
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={myContribution.status} />
              <span className="text-xs text-muted">
                You reported {formatCurrency(myContribution.amount, currency)}
              </span>
            </div>
          )}
        </div>
        {canReport && !settled && (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => setOpen((v) => !v)}
          >
            <Send className="w-4 h-4" />
            {open ? 'Hide' : 'Report paid'}
          </button>
        )}
      </div>

      {open && canReport && cycleId && (
        <form
          action={formAction}
          className="space-y-3 border border-border rounded-xl p-4"
        >
          <input type="hidden" name="cycle_id" value={cycleId} />
          <div>
            <label className="label" htmlFor="report-amount">
              Amount paid (kobo)
            </label>
            <input
              id="report-amount"
              name="amount_kobo"
              type="number"
              min={1}
              className="input"
              placeholder={String(expectedAmount)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted mt-1">
              Base amount in kobo (1 NGN = 100). Owner confirms or you can
              dispute if something looks wrong.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary btn-sm" disabled={pending}>
              {pending ? <Spinner /> : 'Submit report'}
            </button>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={pending || !myContribution}
              onClick={() => myContribution && decide(myContribution.id, 'disputed')}
            >
              <Flag className="w-4 h-4" /> Dispute
            </button>
          </div>
        </form>
      )}

      {myContribution?.status === 'reported' && (
        <p className="text-xs text-muted">
          Waiting for the circle admin to confirm. You can dispute if this is
          wrong.
        </p>
      )}

      {ownerRows && ownerRows.length > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium text-forest mb-3">Review reports</p>
          <ul className="space-y-3">
            {ownerRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-border rounded-xl px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-forest truncate">
                    {row.label}
                  </p>
                  <p className="text-xs text-muted">
                    {formatCurrency(row.amount, currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={row.status} />
                  {row.status === 'reported' && (
                    <>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={pending}
                        onClick={() => decide(row.id, 'confirmed')}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Confirm
                      </button>
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        disabled={pending}
                        onClick={() => decide(row.id, 'rejected')}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
