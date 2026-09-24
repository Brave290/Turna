'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { UserMinus } from 'lucide-react';
import { removeMember, type ActionState } from '@/lib/circle-actions';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/ui';
import { Spinner } from '@/components/spinner';

export function RemoveMemberButton({
  circleId,
  memberId,
  memberLabel,
}: {
  circleId: string;
  memberId: string;
  memberLabel: string;
}) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useFormState(removeMember, null as ActionState);
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

  async function onClick() {
    const ok = await confirm(
      `Remove ${memberLabel} from this circle? They will lose access immediately.`,
      { title: 'Remove member?', confirmLabel: 'Remove', danger: true }
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('member_id', memberId);
    startTransition(() => {
      void formAction(fd);
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn-ghost btn-sm px-2 text-error"
        aria-label={`Remove ${memberLabel}`}
        disabled={pending}
        onClick={onClick}
      >
        {pending ? <Spinner /> : <UserMinus className="w-3.5 h-3.5" />}
      </button>
      <form action={formAction} className="hidden">
        <input type="hidden" name="circle_id" value={circleId} />
        <input type="hidden" name="member_id" value={memberId} />
      </form>
      {dialog}
    </>
  );
}
