'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/components/toast';
import { BrandSelect } from '@/components/ui';
import { submitKyc, type ActionState } from '@/lib/circle-actions';

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || disabled}>
      {pending ? (
        <>
          <Spinner />
          Submitting...
        </>
      ) : (
        'Submit for review'
      )}
    </button>
  );
}

export type KycInitial = {
  status?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  full_legal_name?: string | null;
  rejection_reason?: string | null;
};

const DOC_LABELS: Record<string, string> = {
  nin: 'NIN',
  bvn: 'BVN',
  id_card: 'ID card',
};

/**
 * KYC form — NIN / BVN / ID number + full legal name.
 * Server action: submitKyc (circle-actions.ts).
 */
export function KycForm({ initial }: { initial: KycInitial | null }) {
  const [state, formAction] = useFormState(submitKyc, null as ActionState);
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

  const approved = initial?.status === 'approved';
  const formError = state?.error?.form?.[0];

  return (
    <form action={formAction} className="space-y-4" noValidate data-no-swipe>
      <div className="flex items-center gap-2 text-sm">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        <span className="text-forest font-medium">
          Status:{' '}
          <span className="capitalize">
            {initial?.status ?? 'not submitted'}
          </span>
        </span>
        {initial?.rejection_reason && (
          <span className="text-error truncate">{initial.rejection_reason}</span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="document_type" className="label">
            Document type
          </label>
          <BrandSelect
            id="document_type"
            name="document_type"
            defaultValue={initial?.document_type ?? 'nin'}
            options={[
              { value: 'nin', label: 'NIN' },
              { value: 'bvn', label: 'BVN' },
              { value: 'id_card', label: 'ID card number' },
            ]}
            aria-label="Document type"
          />
          {approved && <input type="hidden" name="document_type" value={initial?.document_type ?? 'nin'} />}
        </div>

        <div>
          <label htmlFor="document_number" className="label">
            Document number
          </label>
          <input
            id="document_number"
            name="document_number"
            defaultValue={initial?.document_number ?? ''}
            className="input"
            disabled={approved}
            required
            minLength={6}
            maxLength={30}
            autoComplete="off"
            placeholder="11-digit number"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="full_legal_name" className="label">
            Full legal name
          </label>
          <input
            id="full_legal_name"
            name="full_legal_name"
            defaultValue={initial?.full_legal_name ?? ''}
            className="input"
            disabled={approved}
            required
            minLength={3}
            maxLength={120}
            autoComplete="name"
            placeholder="As it appears on your document"
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
      {approved && (
        <p className="text-sm text-muted">
          Your identity is verified. No further action needed.
        </p>
      )}

      {!approved && <SubmitButton />}
    </form>
  );
}

/** Compact status chip for headers. */
export function KycStatusBadge({ status }: { status?: string | null }) {
  const s = status ?? 'none';
  const tone =
    s === 'approved'
      ? 'bg-primary/10 text-primary'
      : s === 'rejected'
        ? 'bg-error/10 text-error'
        : s === 'pending'
          ? 'bg-amber-500/10 text-amber-600'
          : 'bg-border text-muted';
  const label =
    s === 'none'
      ? 'KYC not submitted'
      : `KYC ${DOC_LABELS[s] ?? ''} ${s}`.trim();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}
