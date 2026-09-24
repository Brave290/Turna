'use client';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/toast';

export function ShareReceiptButton({
  code,
  reference,
  label = 'Share receipt',
}: {
  code: string;
  reference?: string;
  label?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app'
  ).replace(/\/$/, '');
  const verifyUrl = `${appUrl}/verify/${encodeURIComponent(code)}`;
  const text = `Turna receipt ${code}\nVerify: ${verifyUrl}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
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
        await navigator.share({ title: `Turna receipt ${code}`, text, url: verifyUrl });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copy();
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 justify-center">
      <button type="button" className="btn-primary btn-sm" onClick={share}>
        <Share2 className="w-4 h-4" /> {label}
      </button>
      <button type="button" className="btn-outline btn-sm" onClick={copy}>
        {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
        Copy verify link
      </button>
      {reference && (
        <a
          href={`${appUrl}/receipt/${encodeURIComponent(reference)}`}
          className="btn-outline btn-sm"
          target="_blank"
          rel="noreferrer"
        >
          Open payment receipt
        </a>
      )}
    </div>
  );
}
