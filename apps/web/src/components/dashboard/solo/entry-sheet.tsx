'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type EntryLike = {
  status: string;
  amount_paid: number;
  paid_on: string | null;
  note: string | null;
} | null;

export function EntrySheet({
  contributorName,
  expected,
  currency,
  period,
  initial,
  onClose,
  onSave,
}: {
  contributorName: string;
  expected: number;
  currency: string;
  period: string;
  initial: EntryLike;
  onClose: () => void;
  onSave: (p: {
    status: 'paid' | 'unpaid' | 'partial';
    amount_paid: number;
    paid_on?: string | null;
    note?: string | null;
  }) => Promise<void>;
}) {
  const [status, setStatus] = useState<'paid' | 'unpaid' | 'partial'>(
    (initial?.status as 'paid' | 'unpaid' | 'partial') || 'paid'
  );
  const [amount, setAmount] = useState(
    String((initial?.amount_paid ?? expected) / 100 || expected / 100)
  );
  const [paidOn, setPaidOn] = useState(initial?.paid_on ?? new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(initial?.note ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await onSave({
        status,
        amount_paid:
          status === 'unpaid'
            ? 0
            : Math.round(Number(amount.replace(/[^\d.]/g, '') || '0') * 100),
        paid_on: status === 'unpaid' ? null : paidOn || null,
        note: note.trim() || null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-forest/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-forest">{contributorName}</h3>
            <p className="text-xs text-muted">{period} · due {formatCurrency(expected, currency)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-ghost btn-sm px-2">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['paid', 'partial', 'unpaid'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl border px-2 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  status === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted hover:border-primary/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {status !== 'unpaid' && (
            <>
              <label className="block">
                <span className="text-xs font-medium text-muted">Amount paid ({currency})</span>
                <input
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Paid on</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                />
              </label>
            </>
          )}
          <label className="block">
            <span className="text-xs font-medium text-muted">Note</span>
            <input
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bank transfer / cash"
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary btn-sm" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
