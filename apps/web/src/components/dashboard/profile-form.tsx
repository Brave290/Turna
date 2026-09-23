'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { Spinner } from '@/components/spinner';
import { updateProfile, type ProfileActionState } from '@/lib/auth-actions';
import { useToast } from '@/components/toast';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Saving...
        </>
      ) : (
        'Save changes'
      )}
    </button>
  );
}

export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const [state, formAction] = useFormState(
    updateProfile,
    null as ProfileActionState
  );
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
      toast.success(state.success);
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast]);

  const nameError = state?.error?.display_name?.[0];
  const formError = state?.error?.form?.[0];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="display_name" className="label">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={initialName}
          className={`input${nameError ? ' input-error' : ''}`}
          required
          maxLength={100}
        />
        {nameError && <p className="text-sm text-error mt-1.5">{nameError}</p>}
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          value={email}
          className="input opacity-70"
          readOnly
          disabled
        />
        <p className="text-xs text-muted mt-1.5">
          Email is tied to your sign-in identity and cannot be changed here.
        </p>
      </div>

      {formError && (
        <div
          className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {formError}
        </div>
      )}
      {state?.success && (
        <p className="text-sm text-primary" role="status">
          {state.success}
        </p>
      )}

      <SaveButton />
    </form>
  );
}
