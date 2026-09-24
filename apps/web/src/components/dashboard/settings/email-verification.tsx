'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { BadgeCheck, AlertTriangle, MailCheck, Send } from 'lucide-react';
import {
  changeEmail,
  resendVerification,
  type EmailActionState,
} from '@/lib/settings-actions-email';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/components/toast';

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary btn-sm" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Working…
        </>
      ) : (
        label
      )}
    </button>
  );
}

export function EmailVerificationCard({
  email,
  verified,
}: {
  email: string;
  verified: boolean;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<'view' | 'change'>('view');
  const [state, formAction] = useFormState(
    changeEmail,
    null as EmailActionState
  );
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
      setMode('view');
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast]);

  async function onResend() {
    try {
      const res = await resendVerification();
      toast.success(res.success || 'Verification email sent');
    } catch {
      toast.error('Could not send verification email');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-forest font-mono break-all">
            {email}
          </p>
          {verified ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-primary mt-1">
              <BadgeCheck className="w-4 h-4" />
              Verified
            </p>
          ) : (
            <div className="mt-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5">
              <p className="inline-flex items-center gap-1.5 text-sm text-warning font-medium">
                <AlertTriangle className="w-4 h-4" />
                Email not verified
              </p>
              <p className="text-xs text-muted mt-1">
                Verify your email to protect your account.
              </p>
              <button
                type="button"
                onClick={() => void onResend()}
                className="btn-outline btn-sm mt-2"
              >
                <MailCheck className="w-4 h-4" />
                Verify email
              </button>
            </div>
          )}
        </div>
      </div>

      {mode === 'view' ? (
        <button
          type="button"
          className="btn-outline btn-sm"
          onClick={() => setMode('change')}
        >
          Change email
        </button>
      ) : (
        <form action={formAction} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label htmlFor="new_email" className="label">
              New email address
            </label>
            <input
              id="new_email"
              name="new_email"
              type="email"
              required
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => setMode('view')}
            >
              Cancel
            </button>
            <SubmitBtn label="Send link" />
          </div>
          {state?.error?.form?.[0] && (
            <p className="text-sm text-error w-full">{state.error.form[0]}</p>
          )}
        </form>
      )}

      {!verified && mode === 'view' && (
        <button
          type="button"
          onClick={() => void onResend()}
          className="btn-ghost btn-sm text-primary inline-flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          Resend verification email
        </button>
      )}
    </div>
  );
}
