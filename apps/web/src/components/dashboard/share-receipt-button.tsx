'use client';

import { useState } from 'react';
import { Share2, Copy, Check, QrCode, ExternalLink, Mail } from 'lucide-react';
import { useToast } from '@/components/toast';

export function ShareReceiptButton({
  code,
  reference,
  label = 'Share receipt',
  amountLabel,
  circleName,
}: {
  code: string;
  reference?: string;
  label?: string;
  amountLabel?: string;
  circleName?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app'
  ).replace(/\/$/, '');
  const verifyUrl = `${appUrl}/verify/${encodeURIComponent(code)}`;
  const receiptUrl = reference
    ? `${appUrl}/receipt/${encodeURIComponent(reference)}`
    : verifyUrl;
  const text = [
    `Turna receipt ${code}`,
    circleName ? `Circle: ${circleName}` : null,
    amountLabel ? `Amount: ${amountLabel}` : null,
    `Verify: ${verifyUrl}`,
    `Open receipt: ${receiptUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  async function copy(value = text) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Receipt link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  }

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Turna receipt ${code}`,
          text,
          url: verifyUrl,
        });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copy();
  }

  function shareEmail() {
    const subject = encodeURIComponent(`Turna receipt ${code}`);
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(receiptUrl)}`;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap gap-2 justify-center">
        <button type="button" className="btn-primary btn-sm" onClick={share}>
          <Share2 className="w-4 h-4" /> {label}
        </button>
        <button type="button" className="btn-outline btn-sm" onClick={() => copy()}>
          {copied ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          Copy verify link
        </button>
        <button
          type="button"
          className="btn-outline btn-sm"
          onClick={() => setShowQr((v) => !v)}
          aria-expanded={showQr}
        >
          <QrCode className="w-4 h-4" /> QR
        </button>
        <button type="button" className="btn-outline btn-sm" onClick={shareEmail}>
          <Mail className="w-4 h-4" /> Email
        </button>
        {reference && (
          <a
            href={receiptUrl}
            className="btn-outline btn-sm"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="w-4 h-4" /> Open receipt
          </a>
        )}
      </div>
      {showQr && (
        <div className="flex justify-center pt-1">
          <div className="rounded-xl border border-border bg-white p-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt={`QR code for receipt ${code}`}
              width={140}
              height={140}
              className="rounded-lg"
            />
            <p className="text-[11px] text-muted mt-2 font-mono break-all max-w-[180px]">
              {code}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
