'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Eye, EyeOff, MailCheck, KeyRound, ArrowLeft } from 'lucide-react';
import {
  requestPasswordChangeOtp,
  verifyAndSetPassword,
  type PasswordChangeState,
} from '@/lib/auth-actions';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/components/toast';

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Updating...
        </>
      ) : (
        <>
          <KeyRound className="w-4 h-4 mr-1.5" />
          Verify & update password
        </>
      )}
    </button>
  );
}

/**
 * Change password — always requires a one-time code emailed to the account first.
 * No reset-link path from inside the app.
 */
export function ChangePasswordPanel() {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [sending, setSending] = useState(false);
  const [verifyState, formAction] = useFormState(
    verifyAndSetPassword,
    null as PasswordChangeState
  );
  const toast = useToast();
  const lastKeyRef = useRef('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!verifyState) return;
    const key = JSON.stringify({
      s: verifyState.success ?? null,
      e: verifyState.error?.form?.[0] ?? null,
      p: verifyState.step ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (verifyState.success) {
      toast.success(verifyState.success);
      setStep('request');
    } else if (verifyState.error?.form?.[0]) {
      toast.error(verifyState.error.form[0]);
    }
  }, [verifyState, toast]);

  async function onSendCode() {
    setSending(true);
    try {
      const res = await requestPasswordChangeOtp();
      if (res?.success) {
        toast.success(res.success);
        setStep('verify');
      } else if (res?.error?.form?.[0]) {
        toast.error(res.error.form[0]);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card">
      <div className="flex items-center gap-2 mb-2">
        <KeyRound className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-forest">Change password</h2>
      </div>
      <p className="text-sm text-muted mb-5">
        We email a 6-digit code to your account first — then you set a new password. Password
        changes always require OTP verification.
      </p>

      {step === 'request' && (
        <div className="space-y-3">
          <button type="button" className="btn-primary" onClick={onSendCode} disabled={sending}>
            {sending ? (
              <>
                <Spinner />
                Sending code...
              </>
            ) : (
              <>
                <MailCheck className="w-4 h-4 mr-1.5" />
                Email me a code
              </>
            )}
          </button>
        </div>
      )}

      {step === 'verify' && (
        <form action={formAction} className="space-y-4" noValidate>
          <div>
            <label htmlFor="otp" className="label">
              6-digit code
            </label>
            <input
              id="otp"
              name="otp"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="123456"
              className="input font-mono tracking-[0.3em] text-center"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className="input pr-11"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-forest transition-colors"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat password"
              className="input"
              required
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <VerifyButton />
            <button
              type="button"
              className="btn-outline"
              onClick={() => setStep('request')}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Use a new code
            </button>
            <button
              type="button"
              className="text-sm text-muted hover:text-forest"
              onClick={onSendCode}
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Resend code'}
            </button>
          </div>

          {verifyState?.error?.form?.[0] && (
            <div
              className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
              role="alert"
            >
              {verifyState.error.form[0]}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
