'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { Plus, Trash2, NotebookPen } from 'lucide-react';
import { createSoloLedger, deleteSoloLedger, type SoloActionState } from '@/lib/solo-actions';
import { useToast } from '@/components/toast';
import { BrandSelect } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

type Ledger = {
  id: string;
  name: string;
  currency: string;
  default_amount: number;
  description: string | null;
  updated_at: string;
};

export function SoloLedgersClient({ ledgers }: { ledgers: Ledger[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(ledgers.length === 0);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [amount, setAmount] = useState('5000');
  const [description, setDescription] = useState('');
  const [state, formAction] = useFormState(createSoloLedger, null as SoloActionState);
  const [busy, setBusy] = useState(false);
  const [errShown, setErrShown] = useState(false);

  useEffect(() => {
    const msg = state?.error?.form?.[0];
    if (msg && !errShown) {
      toast.error(msg);
      setErrShown(true);
    }
    if (!msg) setErrShown(false);
  }, [state, errShown, toast]);

  async function remove(id: string, ledgerName: string) {
    if (!confirm(`Delete "${ledgerName}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('id', id);
      const res = await deleteSoloLedger(null, fd);
      if (res?.success) {
        toast.success(res.success);
        router.refresh();
      } else {
        toast.error(res?.error?.form?.[0] ?? 'Delete failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
            Solo Ledger
          </h1>
          <p className="text-muted mt-1 max-w-2xl">
            Personal ajo tracker — no circle required. Works offline; syncs when you&apos;re
            back online.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setOpen((v) => !v)}>
          <Plus className="w-4 h-4" /> New ledger
        </button>
      </div>

      {open && (
        <form action={formAction} className="card space-y-4 border-primary/30">
          <div>
            <label className="text-xs font-medium text-muted" htmlFor="solo-name">
              Ledger name *
            </label>
            <input
              id="solo-name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
              placeholder="Shop ajo / Family savings"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted" htmlFor="solo-cur">
                Currency
              </label>
              <BrandSelect
                id="solo-cur"
                name="currency"
                className="mt-1 w-full"
                value={currency}
                onChange={setCurrency}
                options={[
                  { value: 'NGN', label: 'NGN (₦)' },
                  { value: 'GHS', label: 'GHS (₵)' },
                  { value: 'KES', label: 'KES' },
                  { value: 'USD', label: 'USD ($)' },
                ]}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted" htmlFor="solo-amt">
                Default monthly amount
              </label>
              <input
                id="solo-amt"
                name="default_amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted" htmlFor="solo-desc">
              Note (optional)
            </label>
            <input
              id="solo-desc"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
              placeholder="Collects every month on the 5th"
            />
          </div>
          {state?.error?.form?.[0] && (
            <p className="text-sm text-error">{state.error.form[0]}</p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary btn-sm">
              Create ledger
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {ledgers.length === 0 && !open ? (
        <div className="card text-center py-14">
          <NotebookPen className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-muted mb-4">
            No solo ledgers yet. Track contributors and monthly payments without creating a
            circle.
          </p>
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Create your first ledger
          </button>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {ledgers.map((l) => (
            <li key={l.id} className="card flex flex-col justify-between gap-3">
              <div>
                <button
                  type="button"
                  className="text-left w-full"
                  onClick={() => router.push(`/dashboard/solo-ledger/${l.id}`)}
                >
                  <p className="font-semibold text-forest hover:text-primary transition-colors">
                    {l.name}
                  </p>
                  {l.description && (
                    <p className="text-xs text-muted mt-1 line-clamp-2">{l.description}</p>
                  )}
                  <p className="text-xs text-muted mt-2">
                    Default {formatCurrency(l.default_amount, l.currency)} · updated{' '}
                    {new Date(l.updated_at).toLocaleDateString('en-NG')}
                  </p>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-outline btn-sm"
                  onClick={() => router.push(`/dashboard/solo-ledger/${l.id}`)}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm text-error"
                  disabled={busy}
                  onClick={() => remove(l.id, l.name)}
                  aria-label={`Delete ${l.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
