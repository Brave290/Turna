'use client';

import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { ModalShell } from '@/components/modal-shell';

type VersionInfo = {
  versionCode: number;
  versionName: string;
  minSupportedCode: number;
  downloadUrl: string;
  notes: string;
};

const DISMISS_KEY = 'turna.update.dismissals';
const REMIND_AFTER_MS = 1000 * 60 * 60 * 12;

function getDismissals(): { count: number; last: number } {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return { count: 0, last: 0 };
    const p = JSON.parse(raw) as { count: number; last: number };
    return { count: p.count || 0, last: p.last || 0 };
  } catch {
    return { count: 0, last: 0 };
  }
}

function setDismissals(count: number) {
  localStorage.setItem(
    DISMISS_KEY,
    JSON.stringify({ count, last: Date.now() })
  );
}

/**
 * In-app update prompt (web PWA / any browser).
 * Policy: optional "Later" on first two prompts; force (no dismiss) on the third.
 */
export function UpdatePrompt({
  currentVersionCode = 1,
  autoCheck = true,
}: {
  currentVersionCode?: number;
  autoCheck?: boolean;
}) {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);

  useEffect(() => {
    if (!autoCheck) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/app/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as VersionInfo;
        if (cancelled) return;
        if (data.versionCode > currentVersionCode) {
          const d = getDismissals();
          setDismissCount(d.count);
          // Remind after 12h if previously dismissed, or show immediately if never
          const show =
            d.count === 0 ||
            d.count >= 2 ||
            Date.now() - d.last > REMIND_AFTER_MS;
          if (show) {
            setInfo(data);
            setOpen(true);
          }
        }
      } catch {
        /* offline / ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoCheck, currentVersionCode]);

  const forced = dismissCount >= 2;

  function later() {
    if (forced) return;
    const next = dismissCount + 1;
    setDismissals(next);
    setDismissCount(next);
    setOpen(false);
  }

  async function download() {
    if (!info) return;
    setDownloading(true);
    try {
      // First-party silent download (no GitHub in the address bar path for long)
      const a = document.createElement('a');
      a.href = info.downloadUrl;
      a.download = 'turna.apk';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloading(false);
    }
  }

  if (!open || !info) return null;

  return (
    <ModalShell
      open={open}
      onClose={forced ? () => undefined : () => setOpen(false)}
      label="Update available"
      maxWidth="max-w-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-forest">
                {forced ? 'Update required' : 'Update ready'}
              </h3>
              <p className="text-xs text-muted">
                v{info.versionName} · build {info.versionCode}
              </p>
            </div>
          </div>
          {!forced && (
            <button
              type="button"
              onClick={later}
              aria-label="Close"
              className="btn-ghost btn-sm px-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-sm text-muted mb-5">
          {info.notes ||
            'We shipped fixes and improvements. Download the latest Turna app.'}
          {forced && ' This version is required to continue.'}
        </p>

        <button
          type="button"
          className="btn-primary w-full justify-center"
          onClick={download}
          disabled={downloading}
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Starting download…' : 'Download update'}
        </button>
        {!forced && (
          <button
            type="button"
            className="btn-ghost w-full justify-center mt-2 text-muted"
            onClick={later}
          >
            Later
          </button>
        )}
        <p className="text-[11px] text-muted mt-3 text-center">
          Installs over your current app — your data stays.
        </p>
      </div>
    </ModalShell>
  );
}
