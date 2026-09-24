'use client';

import { useTransition } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/toast';

/**
 * KYC approve / reject buttons for admin queue.
 * Calls POST /api/admin/kyc-review.
 */
export function KycReviewActions({ id, status }: { id: string; status: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function act(decision: 'approved' | 'rejected') {
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch('/api/admin/kyc-review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, decision }),
          });
          const data = (await res.json()) as { error?: string; ok?: boolean };
          if (!res.ok || !data.ok) {
            toast.error(data.error || 'KYC update failed');
            return;
          }
          toast.success(
            decision === 'approved' ? 'KYC approved' : 'KYC rejected'
          );
          window.location.reload();
        } catch {
          toast.error('Network error');
        }
      })();
    });
  }

  if (status !== 'pending') {
    return <span className="text-xs text-muted capitalize">{status}</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="btn-primary btn-sm inline-flex items-center gap-1"
        disabled={pending}
        onClick={() => act('approved')}
        aria-label="Approve KYC"
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
        Approve
      </button>
      <button
        type="button"
        className="btn-outline btn-sm inline-flex items-center gap-1 text-error border-error/30 hover:bg-error/10"
        disabled={pending}
        onClick={() => act('rejected')}
        aria-label="Reject KYC"
      >
        <X className="w-3.5 h-3.5" />
        Reject
      </button>
    </div>
  );
}
