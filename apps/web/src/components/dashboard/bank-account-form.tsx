'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Landmark, CheckCircle2, Loader2, Search } from 'lucide-react';
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
 * Bank account form — lists banks, resolves name via Paystack Resolve,
 * saves verified account for automatic circle payouts.
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
  const [resolving, setResolving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(Boolean(initialAccount));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/banks');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.banks)) {
          setBanks(data.banks as Bank[]);
          if (!bankCode && data.banks.length > 0) {
            // Prefer a common bank if none selected
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

  async function handleResolve() {
    if (!canResolve) return;
    setResolving(true);
    setResolvedName('');
    try {
      const res = await fetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not verify account');
        return;
      }
      setResolvedName(data.account.account_name as string);
      setSaved(false);
    } catch {
      toast.error('Network error resolving account');
    } finally {
      setResolving(false);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
          setSaved(true);
          toast.success('Payout account saved — future payouts go here');
        } catch {
          toast.error('Network error saving account');
        }
      })();
    });
  }

  const bankLabel = banks.find((b) => b.code === bankCode)?.name ?? '';

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
              setSaved(false);
            }}
            options={[
              {
                value: '',
                label:
                  banks.length === 0 ? 'Loading banks…' : 'Select bank',
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
                setSaved(false);
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
                  {bankLabel} · {accountNumber} — verified via Paystack Resolve
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

      {saved && initialAccount && (
        <div className="rounded-xl border border-border bg-cream px-4 py-3 text-sm text-muted flex items-center gap-2">
          <Landmark className="w-4 h-4 shrink-0" />
          <span>
            Saved: <strong className="text-forest">{initialAccount.account_name}</strong>{' '}
            · {initialAccount.bank_name} · {initialAccount.account_number}
          </span>
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
          'Save payout account'
        )}
      </button>
      <p className="text-xs text-muted">
        Payouts from circles you join are sent to this account automatically.
        We only store bank code, number, and the verified name.
      </p>
    </form>
  );
}
