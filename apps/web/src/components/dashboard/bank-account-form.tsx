'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Landmark, CheckCircle2, Loader2, Search, Lock, Pencil, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { BrandSelect } from '@/components/ui';

type Bank = { code: string; name: string };

type SavedAccount = {
  id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
};

/**
 * Bank account form — locked after save.
 * Edit requires email OTP (sensitive payout destination).
 */
export function BankAccountForm({
  initialAccount,
}: {
  initialAccount: SavedAccount | null;
}) {
  const toast = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState(initialAccount?.bank_code ?? '');
  const [accountNumber, setAccountNumber] = useState(
    initialAccount?.account_number ?? ''
  );
  const [resolvedName, setResolvedName] = useState(
    initialAccount?.account_name ?? ''
  );
  const [manualName, setManualName] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [locked, setLocked] = useState(Boolean(initialAccount));
  const [otpStep, setOtpStep] = useState<'idle' | 'request' | 'verify'>('idle');
  const [otp, setOtp] = useState('');
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/banks');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.banks)) {
          setBanks(data.banks as Bank[]);
          if (!bankCode && data.banks.length > 0) {
            const gtb = (data.banks as Bank[]).find((b) =>
              /guaranty|gtb/i.test(b.name)
            );
            setBankCode(gtb?.code ?? data.banks[0].code);
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canResolve = useMemo(
    () => /^\d{10}$/.test(accountNumber) && bankCode.length > 0,
    [accountNumber, bankCode]
  );

  async function requestUnlockOtp() {
    setOtpBusy(true);
    setOtpMsg(null);
    try {
      const res = await fetch('/api/auth/sensitive-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'bank_change' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not send code');
        return;
      }
      setOtpStep('verify');
      setOtpMsg(data.message || 'We emailed a 6-digit code. Enter it to unlock.');
      toast.info('Verification code sent to your email');
    } catch {
      toast.error('Network error sending code');
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyUnlockOtp() {
    if (!/^\d{6}$/.test(otp)) {
      toast.error('Enter the full 6-digit code');
      return;
    }
    setOtpBusy(true);
    try {
      const res = await fetch('/api/auth/sensitive-otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'bank_change', code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Invalid or expired code');
        return;
      }
      setLocked(false);
      setResolvedName('');
      setOtpStep('idle');
      setOtp('');
      setOtpMsg(null);
      toast.success('Bank details unlocked — you can edit now');
    } catch {
      toast.error('Network error verifying code');
    } finally {
      setOtpBusy(false);
    }
  }

  async function handleResolve() {
    if (!canResolve) return;
    setResolving(true);
    setResolvedName('');
    setManualName(false);
    try {
      const res = await fetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.manual) {
          setManualName(true);
          toast.info('Type the account name exactly as it appears on your statement');
          return;
        }
        toast.error(data.error || 'Could not verify account');
        return;
      }
      setResolvedName(data.account.account_name as string);
      toast.success('Account name verified');
    } catch {
      toast.error('Network error resolving account');
    } finally {
      setResolving(false);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (!resolvedName) {
      toast.error('Verify the account name first');
      return;
    }
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch('/api/bank-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bank_code: bankCode,
              bank_name: banks.find((b) => b.code === bankCode)?.name ?? '',
              account_number: accountNumber,
              account_name: resolvedName,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || 'Could not save account');
            return;
          }
          setLocked(true);
          toast.success('Payout account saved and locked — future payouts go here');
        } catch {
          toast.error('Network error saving account');
        }
      })();
    });
  }

  const bankLabel = banks.find((b) => b.code === bankCode)?.name ?? '';

  if (locked && initialAccount) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-forest flex items-center gap-2">
              Bank account locked
              <ShieldCheck className="w-4 h-4 text-primary" />
            </p>
            <p className="text-sm text-muted mt-1">
              Saved details are protected. Unlock with an email code to edit.
            </p>
            <div className="mt-3 rounded-xl border border-border bg-white px-3 py-2.5 text-sm">
              <p className="font-medium text-forest">{initialAccount.account_name}</p>
              <p className="text-muted text-xs mt-0.5">
                {initialAccount.bank_name} · {initialAccount.account_number}
              </p>
            </div>
          </div>
        </div>

        {otpStep === 'idle' && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => void requestUnlockOtp()}
            disabled={otpBusy}
          >
            {otpBusy ? <Spinner /> : <Pencil className="w-4 h-4" />}
            Edit bank details
          </button>
        )}

        {otpStep === 'verify' && (
          <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
            <p className="text-sm text-forest font-medium">
              Enter the 6-digit code we emailed you
            </p>
            {otpMsg && <p className="text-xs text-muted">{otpMsg}</p>}
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input flex-1 tracking-[0.3em] text-center font-mono"
                placeholder="000000"
                autoFocus
                aria-label="Verification code"
              />
              <button
                type="button"
                className="btn-primary shrink-0"
                onClick={() => void verifyUnlockOtp()}
                disabled={otpBusy || otp.length !== 6}
              >
                {otpBusy ? <Spinner /> : 'Unlock'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-xs text-muted hover:text-forest"
                onClick={() => void requestUnlockOtp()}
                disabled={otpBusy}
              >
                Resend code
              </button>
              <button
                type="button"
                className="text-xs text-muted hover:text-forest"
                onClick={() => {
                  setOtpStep('idle');
                  setOtp('');
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

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bank_code" className="label">
            Bank
          </label>
          <BrandSelect
            id="bank_code"
            name="bank_code"
            value={bankCode}
            onChange={(v) => {
              setBankCode(v);
              setResolvedName('');
              setManualName(false);
            }}
            options={[
              {
                value: '',
                label: banks.length === 0 ? 'Loading banks…' : 'Select bank',
              },
              ...banks.map((b) => ({ value: b.code, label: b.name })),
            ]}
            aria-label="Select bank"
          />
          {!bankCode && banks.length > 0 && (
            <input type="hidden" name="bank_code" value="" required />
          )}
        </div>
        <div>
          <label htmlFor="account_number" className="label">
            Account number
          </label>
          <div className="flex gap-2">
            <input
              id="account_number"
              name="account_number"
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                setResolvedName('');
                setManualName(false);
              }}
              className="input flex-1"
              placeholder="0123456789"
              required
            />
            <button
              type="button"
              onClick={handleResolve}
              disabled={!canResolve || resolving}
              className="btn-outline btn-sm shrink-0 px-3"
              title="Verify account name"
            >
              {resolving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Verify</span>
            </button>
          </div>
        </div>
      </div>

      {manualName && (
        <div>
          <label htmlFor="account_name" className="label">
            Account name{' '}
            <span className="text-muted font-normal">(as on your statement)</span>
          </label>
          <input
            id="account_name"
            name="account_name"
            value={resolvedName}
            onChange={(e) => setResolvedName(e.target.value.slice(0, 120))}
            className="input"
            placeholder="e.g. Adaeze Nwosu"
            maxLength={120}
            required
          />
          <p className="text-xs text-muted mt-1">
            Automatic name checks are unavailable right now — type the name
            exactly as the bank shows it. The circle admin still reviews every
            payout.
          </p>
        </div>
      )}

      {(resolvedName || resolving) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
            resolvedName
              ? 'border-primary/40 bg-primary/10 text-forest'
              : 'border-border bg-cream text-muted'
          }`}
          role="status"
        >
          {resolvedName ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{resolvedName}</p>
                <p className="text-xs text-muted mt-0.5">
                  {bankLabel} · {accountNumber}
                  {manualName ? ' — confirmed by you' : ' — verified name'}
                </p>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin mt-0.5 shrink-0" />
              <span>Checking account name…</span>
            </>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!resolvedName || isPending}
        className="btn-primary"
      >
        {isPending ? (
          <>
            <Spinner />
            Saving…
          </>
        ) : (
          <>
            <Landmark className="w-4 h-4" />
            Save payout account
          </>
        )}
      </button>
      <p className="text-xs text-muted">
        After saving, this account locks. You&apos;ll need an email code to change it later.
        We only store bank code, number, and the verified name.
      </p>
    </form>
  );
}
