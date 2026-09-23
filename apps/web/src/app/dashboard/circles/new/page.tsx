'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/spinner';
import { BrandSelect } from '@/components/ui';
import { createCircle, type CircleActionState } from '@/lib/auth-actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Creating...
        </>
      ) : (
        'Create circle'
      )}
    </button>
  );
}

export default function NewCirclePage() {
  const [state, formAction] = useFormState(
    createCircle,
    null as CircleActionState
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.circleId) {
      router.push(`/dashboard/circles/${state.circleId}`);
    }
  }, [state?.circleId, router]);

  const err = (key: string) => state?.error?.[key]?.[0];
  const formError = state?.error?.form?.[0];

  return (
    <div className="max-w-xl animate-fade-in">
      <h1 className="font-display text-3xl font-bold tracking-tight text-forest mb-1">
        New circle
      </h1>
      <p className="text-muted mb-8">
        Money stays outside Turna — we coordinate, record, and keep everyone
        accountable.
      </p>

      <form action={formAction} className="space-y-5 card" noValidate>
        <div>
          <label htmlFor="name" className="label">
            Circle name
          </label>
          <input
            id="name"
            name="name"
            className={`input${err('name') ? ' input-error' : ''}`}
            placeholder="Saturday Ajo"
            required
            maxLength={100}
          />
          {err('name') && (
            <p className="text-sm text-error mt-1.5">{err('name')}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="label">
            Description <span className="text-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            className="input min-h-[80px]"
            placeholder="What is this circle for?"
            maxLength={500}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contribution_amount" className="label">
              Contribution amount (NGN)
            </label>
            <input
              id="contribution_amount"
              name="contribution_amount"
              type="number"
              min="100"
              step="50"
              className={`input${err('contribution_amount') ? ' input-error' : ''}`}
              placeholder="5000"
              required
            />
            {err('contribution_amount') && (
              <p className="text-sm text-error mt-1.5">
                {err('contribution_amount')}
              </p>
            )}
            <p className="text-xs text-muted mt-1.5">
              Stored as kobo in the ledger (amount × 100).
            </p>
          </div>

          <div>
            <label htmlFor="frequency" className="label">
              Frequency
            </label>
            <BrandSelect
              id="frequency"
              name="frequency"
              defaultValue="weekly"
              aria-label="Contribution frequency"
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Every 2 weeks' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </div>

          <div>
            <label htmlFor="member_limit" className="label">
              Member limit
            </label>
            <input
              id="member_limit"
              name="member_limit"
              type="number"
              min="2"
              max="100"
              className="input"
              defaultValue={10}
            />
            {err('member_limit') && (
              <p className="text-sm text-error mt-1.5">{err('member_limit')}</p>
            )}
          </div>

          <div>
            <label htmlFor="start_date" className="label">
              Start date <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              className="input"
            />
          </div>
        </div>

        <input type="hidden" name="currency" value="NGN" />

        {formError && (
          <div
            className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {formError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <SubmitButton />
          <a href="/dashboard/circles" className="btn-outline text-center">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
