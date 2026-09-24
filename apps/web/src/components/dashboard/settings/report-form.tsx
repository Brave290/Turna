'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/components/toast';
import { BrandSelect } from '@/components/ui';

const CATEGORIES = [
  'Account',
  'Circle',
  'Contribution',
  'Payout',
  'Notification',
  'Security',
  'Technical issue',
  'Other',
];

export function ReportProblemForm() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical issue');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('You are offline — report not sent.');
      return;
    }
    if (description.trim().length < 10) {
      toast.error('Please describe the problem (at least 10 characters).');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/support/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, category }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Could not send report');
        return;
      }
      toast.success('Report sent — thank you');
      setDescription('');
    } catch {
      toast.error('Network error — report not sent');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-no-swipe>
      <div>
        <label htmlFor="what-happened" className="label">
          What happened?
        </label>
        <textarea
          id="what-happened"
          className="input min-h-[120px] resize-y"
          placeholder="Describe the problem..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          required
        />
      </div>
      <div>
        <label htmlFor="category" className="label">
          Category
        </label>
        <BrandSelect
          id="category"
          value={category}
          onChange={setCategory}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          aria-label="Report category"
        />
      </div>
      <button
        type="submit"
        className="btn-primary"
        disabled={busy}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Submit report
      </button>
    </form>
  );
}
