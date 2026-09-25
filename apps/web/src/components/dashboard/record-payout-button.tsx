'use client';

import { useTransition } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { recordPayout, type ActionState } from '@/lib/circle-actions';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';

/**
 * Manual payout record — no gateway.
 * The circle settles the pot directly, then records the outcome here.
 * - step "sent": admin marks the pot as handed over
 * - step "received": recipient (or admin) confirms it landed
 */
export function RecordPayoutButton({
  payoutId,
  step,
  compact = false,
}: {
  payoutId: string;
  step: 'sent' | 'received';
  compact?: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function run() {
    const message =
      step === 'sent'
        ? 'Mark this payout as sent to the recipient?'
        : 'Confirm that this payout landed?';
    if (!window.confirm(message)) return;

    startTransition(() => {
      void (async () => {
        const fd = new FormData();
        fd.set('payout_id', payoutId);
        fd.set('step', step);
        const res: ActionState = await recordPayout(null, fd);
        if (res?.success) toast.success(res.success);
        else toast.error(res?.error?.form?.[0] ?? 'Could not update payout');
      })();
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={compact ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
    >
      {pending ? (
        <Spinner />
      ) : step === 'sent' ? (
        <Send className="w-4 h-4" />
      ) : (
        <CheckCircle2 className="w-4 h-4" />
      )}
      {step === 'sent' ? 'Mark sent' : 'Confirm received'}
    </button>
  );
}
