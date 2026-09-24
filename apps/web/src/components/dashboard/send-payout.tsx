'use client';

import { useState } from 'react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { Send } from 'lucide-react';

/** Owner-only: send cycle pot to recipient via Paystack transfer. */
export function SendPayoutButton({
  cycleId,
  compact = false,
}: {
  cycleId: string;
  compact?: boolean;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_id: cycleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not send payout');
        return;
      }
      toast.success('Payout transfer initiated');
      window.location.reload();
    } catch {
      toast.error('Network error sending payout');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={loading}
      className={compact ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
    >
      {loading ? (
        <>
          <Spinner />
          Sending…
        </>
      ) : (
        <>
          <Send className="w-4 h-4" />
          Send payout
        </>
      )}
    </button>
  );
}
