'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { inviteMember, type InviteActionState } from '@/lib/auth-actions';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/components/toast';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-primary px-4 py-2.5 text-sm shrink-0"
      disabled={pending}
    >
      {pending ? <Spinner /> : 'Invite'}
    </button>
  );
}

export function InviteForm({
  circleId,
  nextPosition,
}: {
  circleId: string;
  nextPosition: number;
}) {
  const [state, formAction] = useFormState(
    inviteMember,
    null as InviteActionState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
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
      formRef.current?.reset();
      toast.success(state.success);
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast]);

  const emailError = state?.error?.invitee_email?.[0];
  const formError = state?.error?.form?.[0];

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex flex-col sm:flex-row gap-2">
        <input type="hidden" name="circle_id" value={circleId} />
        <input type="hidden" name="payout_position" value={nextPosition} />
        <input
          name="invitee_email"
          type="email"
          required
          placeholder="friend@example.com"
          className={`input flex-1${emailError ? ' input-error' : ''}`}
          aria-label="Invitee email"
        />
        <SubmitButton />
      </form>
      {emailError && <p className="text-sm text-error mt-1.5">{emailError}</p>}
      {formError && (
        <p className="text-sm text-error mt-1.5" role="alert">
          {formError}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-primary mt-2" role="status">
          {state.success}
        </p>
      )}
    </div>
  );
}
