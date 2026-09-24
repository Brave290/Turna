'use client';

import { useFormState } from 'react-dom';
import { useEffect, useRef } from 'react';
import { Spinner } from '@/components/spinner';
import { updateProfile, type ProfileActionState } from '@/lib/auth-actions';
import { useToast } from '@/components/toast';

function SaveButton() {
  const { pending } = useFormStatusSafe();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Saving...
        </>
      ) : (
        'Save profile'
      )}
    </button>
  );
}

// Local wrapper so we don't fight useFormStatus import naming
import { useFormStatus } from 'react-dom';
function useFormStatusSafe() {
  return useFormStatus();
}

export type ProfileFormValues = {
  display_name: string;
  email: string;
  date_of_birth?: string | null;
  phone?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
};

/**
 * Profile editor — name, DOB, phone, bio, city/country (fintech profile page).
 */
export function ProfileForm({ initial }: { initial: ProfileFormValues }) {
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
    if (state.success) toast.success(state.success);
    else if (state.error?.form?.[0]) toast.error(state.error.form[0]);
  }, [state, toast]);

  const nameError = state?.error?.display_name?.[0];
  const formError = state?.error?.form?.[0];

  return (
    <form action={formAction} className="space-y-4" noValidate data-no-swipe>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="display_name" className="label">
            Full name
          </label>
          <input
            id="display_name"
            name="display_name"
            defaultValue={initial.display_name}
            className={`input${nameError ? ' input-error' : ''}`}
            required
            maxLength={100}
            autoComplete="name"
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
            value={initial.email}
            className="input opacity-70"
            readOnly
            disabled
          />
          <p className="text-xs text-muted mt-1.5">
            Sign-in identity — cannot change here.
          </p>
        </div>

        <div>
          <label htmlFor="date_of_birth" className="label">
            Date of birth
          </label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={initial.date_of_birth ?? ''}
            className="input"
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initial.phone ?? ''}
            className="input"
            placeholder="+234 800 000 0000"
            autoComplete="tel"
          />
        </div>

        <div>
          <label htmlFor="city" className="label">
            City
          </label>
          <input
            id="city"
            name="city"
            defaultValue={initial.city ?? ''}
            className="input"
            placeholder="Lagos"
            autoComplete="address-level2"
          />
        </div>

        <div>
          <label htmlFor="country" className="label">
            Country
          </label>
          <input
            id="country"
            name="country"
            defaultValue={initial.country ?? 'NG'}
            className="input"
            maxLength={56}
            autoComplete="country-name"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="bio" className="label">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={initial.bio ?? ''}
            className="input min-h-[96px] resize-y"
            maxLength={500}
            placeholder="A short line about you (optional)"
          />
        </div>
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
