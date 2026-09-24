'use client';

import { useState, type ReactNode } from 'react';
import { Lock, Pencil, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';

/**
 * Wraps profile fields: locked after first save; unlock via email OTP.
 * Avatar stays always editable (with its own feedback toasts).
 */
export function ProfileEditGate({
  children,
  initiallyLocked = false,
}: {
  children: ReactNode;
  initiallyLocked?: boolean;
}) {
  const toast = useToast();
  const [locked, setLocked] = useState(initiallyLocked);
  const [step, setStep] = useState<'idle' | 'verify'>('idle');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function requestUnlock() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/sensitive-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'profile_change' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not send code');
        return;
      }
      setStep('verify');
      setMsg(data.message || 'We emailed a 6-digit code.');
      toast.info('Verification code sent to your email');
    } catch {
      toast.error('Network error sending code');
    } finally {
      setBusy(false);
    }
  }

  async function verifyUnlock() {
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the full 6-digit code');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/sensitive-otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'profile_change', code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Invalid or expired code');
        return;
      }
      setLocked(false);
      setStep('idle');
      setCode('');
      toast.success('Profile unlocked — you can edit now');
    } catch {
      toast.error('Network error verifying code');
    } finally {
      setBusy(false);
    }
  }

  if (locked) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-forest flex items-center gap-2">
              Profile locked
              <ShieldCheck className="w-4 h-4 text-primary" />
            </p>
            <p className="text-sm text-muted mt-1">
              Fields are protected after save. Unlock with an email code to edit.
            </p>
          </div>
        </div>

        {step === 'idle' && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => void requestUnlock()}
            disabled={busy}
          >
            {busy ? <Spinner /> : <Pencil className="w-4 h-4" />}
            Edit profile
          </button>
        )}

        {step === 'verify' && (
          <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
            <p className="text-sm text-forest font-medium">
              Enter the 6-digit code we emailed you
            </p>
            {msg && <p className="text-xs text-muted">{msg}</p>}
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input flex-1 tracking-[0.3em] text-center font-mono"
                placeholder="000000"
                autoFocus
                aria-label="Verification code"
              />
              <button
                type="button"
                className="btn-primary shrink-0"
                onClick={() => void verifyUnlock()}
                disabled={busy || code.length !== 6}
              >
                {busy ? <Spinner /> : 'Unlock'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-xs text-muted hover:text-forest"
                onClick={() => void requestUnlock()}
                disabled={busy}
              >
                Resend code
              </button>
              <button
                type="button"
                className="text-xs text-muted hover:text-forest"
                onClick={() => {
                  setStep('idle');
                  setCode('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
