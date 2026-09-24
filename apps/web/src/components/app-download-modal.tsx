'use client';

import { useState } from 'react';
import { Download, Smartphone, Play, ExternalLink, Package } from 'lucide-react';
import { ModalShell } from '@/components/modal-shell';

/**
 * Get the app popup.
 * - Google Play: coming soon
 * - Direct APK: latest release from the public downloads-only repo
 *   (main code repo stays private; CI mirrors APK artifacts only).
 */
export function AppDownloadModal({
  triggerClassName = '',
  triggerLabel = 'Get our app',
}: {
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  // First-party silent download — user never sees GitHub in the flow
  const APK_URL =
    process.env.NEXT_PUBLIC_APK_URL ?? '/api/download/apk';

  return (
    <>
      <button
        type="button"
        className={
          triggerClassName ||
          'border border-white/15 hover:bg-white/5 text-white rounded-xl px-8 py-4 text-base font-semibold transition-colors inline-flex items-center justify-center gap-2 backdrop-blur-sm'
        }
        onClick={() => setOpen(true)}
      >
        <Download className="w-4 h-4" />
        {triggerLabel}
      </button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        label="Download the Turna app"
        maxWidth="max-w-sm"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-forest">
                  Get the Turna app
                </h3>
                <p className="text-xs text-muted">
                  Save on the go — same circles, same ledger.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="btn-ghost btn-sm px-2 shrink-0"
            >
              ×
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {/* Direct APK — first-party proxy (streams from our release channel) */}
            <a
              href={APK_URL}
              className="group flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 hover:bg-primary/10 transition-colors"
              download
              onClick={() => setOpen(false)}
            >
              <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-forest">
                  Download APK
                </span>
                <span className="block text-xs text-muted">
                  Instant install · latest build
                </span>
              </span>
              <Download className="w-4 h-4 text-primary shrink-0 group-hover:translate-y-0.5 transition-transform" />
            </a>

            {/* Google Play — coming soon */}
            <div
              className="flex items-center gap-3 rounded-xl border border-border bg-cream/60 px-4 py-4 opacity-90"
              aria-disabled="true"
            >
              <span className="w-10 h-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
                <Play className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-forest">
                  Google Play
                </span>
                <span className="block text-xs text-muted">Coming soon</span>
              </span>
              <span className="badge bg-warning/15 text-warning shrink-0">
                Soon
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted mt-4 leading-relaxed">
            APK is signed and served from our public downloads channel. On
            Android, allow installs from this browser if prompted. Source code
            stays private.
          </p>

          <a
            href="https://github.com/Brave290/Turna-Downloads/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover mt-3"
            onClick={() => setOpen(false)}
          >
            All releases
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </ModalShell>
    </>
  );
}
