'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export function AddContributorForm({
  ledgerId,
  defaultAmount,
  currency,
  onClose,
  onAdd,
}: {
  ledgerId: string;
  defaultAmount: number;
  currency: string;
  onClose: () => void;
  onAdd: (p: {
    name: string;
    phone?: string;
    note?: string;
    expected_amount: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(String(defaultAmount / 100 || ''));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd({
        name: name.trim(),
        phone: phone.trim() || undefined,
        note: note.trim() || undefined,
        expected_amount: Math.round(Number(amount.replace(/[^\d.]/g, '') || '0') * 100),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-forest/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-forest">Add contributor</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-ghost btn-sm px-2">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <input type="hidden" name="ledger_id" value={ledgerId} />
          <label className="block">
            <span className="text-xs font-medium text-muted">Name *</span>
            <input
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Amina Yusuf"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Phone (for WhatsApp remind)</span>
            <input
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              inputMode="tel"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">
              Expected amount ({currency})
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="5000"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Note</span>
            <input
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-forest"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Market stall 2"
            />
          </label>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={busy || !name.trim()}>
              {busy ? 'Adding…' : 'Add contributor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
