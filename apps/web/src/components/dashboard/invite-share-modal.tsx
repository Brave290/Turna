'use client';

import { useEffect, useState, useTransition } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  QrCode,
  Share2,
  Link as LinkIcon,
  Users,
  X,
} from 'lucide-react';
import { ModalShell } from '@/components/modal-shell';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/components/toast';
import { createShareInvite, type ShareInviteState } from '@/lib/share-invite-actions';

export function InviteShareModal({
  open,
  onClose,
  circleId,
  circleName,
  contributionLabel,
  memberCount,
  memberLimit,
}: {
  open: boolean;
  onClose: () => void;
  circleId: string;
  circleName: string;
  contributionLabel: string;
  memberCount: number;
  memberLimit: number;
}) {
  const toast = useToast();
  const [state, setState] = useState<ShareInviteState>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setState(null);
    setCopied(false);
    const fd = new FormData();
    fd.set('circle_id', circleId);
    startTransition(() => {
      void createShareInvite(null, fd).then(setState);
    });
  }, [open, circleId]);

  const url = state?.url;
  const shareText = `You've been invited to\n\n${circleName}\n${contributionLabel}\n${memberCount}/${memberLimit} members\n\nJoin with Turna: ${url ?? ''}`;

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Invite link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select and copy manually');
    }
  }

  async function shareInvite() {
    if (!url) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${circleName} on Turna`,
          text: shareText,
          url,
        });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    await copyLink();
  }

  return (
    <ModalShell open={open} onClose={onClose} label="Invite members" maxWidth="max-w-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-forest">Invite members</h2>
            <p className="text-xs text-muted">Scan, copy, or share — no long codes</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-muted hover:bg-cream hover:text-forest"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto">
        <div className="rounded-2xl border border-border bg-cream p-5 text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted mb-1">
            You&apos;ve been invited to
          </p>
          <p className="font-display text-xl font-bold text-forest">{circleName}</p>
          <p className="text-sm text-primary font-medium mt-1">{contributionLabel}</p>
          <p className="text-xs text-muted mt-0.5">
            {memberCount} / {memberLimit} members
          </p>

          <div className="mt-4 inline-flex p-3 bg-white rounded-2xl border border-border shadow-card">
            {state?.error?.form?.[0] ? (
              <p className="text-sm text-error py-8 px-4">{state.error.form[0]}</p>
            ) : pending || (!url && !state?.error) ? (
              <div className="w-44 h-44 flex items-center justify-center text-muted">
                <Spinner className="w-6 h-6" />
              </div>
            ) : url ? (
              <QRCodeSVG
                value={url}
                size={176}
                bgColor="#ffffff"
                fgColor="#03251B"
                level="M"
                includeMargin={false}
                title={`QR invite for ${circleName}`}
              />
            ) : null}
          </div>

          {url && (
            <p className="mt-3 text-[11px] text-muted break-all font-mono">{url}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <button
            type="button"
            className="btn-outline btn-sm justify-center"
            disabled={!url || pending}
            onClick={copyLink}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-primary" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy link
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-primary btn-sm justify-center"
            disabled={!url || pending}
            onClick={shareInvite}
          >
            <Share2 className="w-4 h-4" /> Share invite
          </button>
          <a
            href={url || '#'}
            target="_blank"
            rel="noreferrer"
            className={`btn-outline btn-sm justify-center ${!url ? 'pointer-events-none opacity-50' : ''}`}
          >
            <LinkIcon className="w-4 h-4" /> Open
          </a>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted bg-primary/5 border border-primary/15 rounded-xl p-3">
          <QrCode className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p>
            Anyone with this QR or link can join while spots remain. Works in
            person — they scan and see your circle before signing in.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
