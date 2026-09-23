'use client';

import { useFormState } from 'react-dom';
import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteCircle, type DeleteCircleState } from '@/lib/auth-actions';
import { useConfirm } from '@/components/ui';
import { useToast } from '@/components/toast';

function DeleteButtonInner({
  circleId,
  circleName,
  status,
}: {
  circleId: string;
  circleName: string;
  status: string;
}) {
  const [state, formAction] = useFormState(deleteCircle, null as DeleteCircleState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const toast = useToast();
  const lastKeyRef = useRef('');
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast]);

  return (
    <>
      {dialog}
      <form
        ref={formRef}
        action={formAction}
        onSubmit={async (e) => {
          if (confirmedRef.current) return;
          e.preventDefault();
          const ok = await confirm(
            `Delete "${circleName}" permanently? Members, invites, cycles, and ledger history for this circle will be removed. This cannot be undone.`,
            {
              title: 'Delete circle',
              confirmLabel: 'Delete',
              danger: true,
            }
          );
          if (ok) {
            confirmedRef.current = true;
            formRef.current?.requestSubmit();
          }
        }}
        className="inline-block"
      >
        <input type="hidden" name="circle_id" value={circleId} />
        <button
          type="submit"
          className="btn btn-sm border border-error/40 text-error hover:bg-error/10 rounded-xl px-4 py-2"
          title={status === 'draft' ? 'Delete draft circle' : 'Delete circle'}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </form>
    </>
  );
}

export function DeleteCircleButton(props: {
  circleId: string;
  circleName: string;
  status: string;
}) {
  return <DeleteButtonInner {...props} />;
}
