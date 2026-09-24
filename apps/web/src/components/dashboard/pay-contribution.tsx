'use client';

import { useState } from 'react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { formatCurrency } from '@/lib/utils';
import { CreditCard } from 'lucide-react';

/**
 * Pay contribution via Paystack — calculates fees server-side and redirects
 * to checkout.
 */
export function PayContributionButton({
  circleId,
  cycleId,
  baseAmountKobo,
  currency = 'NGN',
  feeBps = 0,
  networkBps = 0,
  feePayer = 'member',
  label,
}: {
  circleId: string;
  cycleId?: string | null;
  baseAmountKobo: number;
  currency?: string;
  feeBps?: number;
  networkBps?: number;
  feePayer?: string;
  label?: string;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const fee = Math.floor((baseAmountKobo * feeBps) / 10000);
  const network = Math.floor((baseAmountKobo * networkBps) / 10000);
  const memberExtra =
    feePayer === 'member'
      ? fee + network
      : feePayer === 'shared'
        ? Math.floor((fee + network) / 2) * 2
        : network;
  const total = baseAmountKobo + memberExtra;

  async function pay() {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circle_id: circleId,
          cycle_id: cycleId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not start payment');
        return;
      }
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      toast.error('No checkout URL returned');
    } catch {
      toast.error('Network error starting payment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={pay}
      disabled={loading}
      className="btn-primary btn-sm"
      title={`Pay ${formatCurrency(total, currency)}`}
    >
      {loading ? (
        <>
          <Spinner />
          Opening…
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          {label ?? `Pay ${formatCurrency(total, currency)}`}
        </>
      )}
    </button>
  );
}
