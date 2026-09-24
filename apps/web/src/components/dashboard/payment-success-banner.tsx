'use client';

import Link from 'next/link';
import { CheckCircle2, ReceiptText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Payment success banner after Paystack callback (?paid=1&ref=...).
 * Offers an instant branded receipt link and can be dismissed
 * (which strips the query so refresh doesn't re-show it).
 */
export function PaymentSuccessBanner({ reference }: { reference: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [reference]);

  if (!open || !reference) return null;

  function dismiss() {
    setOpen(false);
    router.replace(pathname);
  }

  return (
    <div
      role="status"
      className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-forest">Payment received</p>
          <p className="text-sm text-muted break-all">
            Reference{' '}
            <span className="font-mono text-xs">{reference}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/receipt/${encodeURIComponent(reference)}`}
          className="btn-primary btn-sm inline-flex"
        >
          <ReceiptText className="w-4 h-4" />
          View receipt
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="btn-ghost btn-sm px-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
