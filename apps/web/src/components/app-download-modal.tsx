'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Download,
  Smartphone,
  Play,
  ExternalLink,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { ModalShell } from '@/components/modal-shell';

/**
 * Get the app popup with an animated in-page download:
 *   idle → downloading (REAL byte progress streamed from GitHub) →
 *   ready (confetti falls from the top + Install now).
 * Falls back to the plain browser download when streaming is blocked —
 * then the browser's own download bar shows the progress.
 */
type Phase = 'idle' | 'downloading' | 'fallback' | 'ready';

const APK_URL = process.env.NEXT_PUBLIC_APK_URL ?? '/api/download/apk';

const CONFETTI_COLORS = ['#007A65', '#7CE8D7', '#8A5A00', '#B4233B', '#0A1628'];
const PIECES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: (i * 37 + 7) % 100,
  dx: ((i % 7) - 3) * 22,
  spin: (i % 2 ? 560 : -680) + ((i * 13) % 180),
  dur: 1.5 + (i % 5) * 0.3,
  delay: (i % 7) * 0.11,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  wide: i % 3 === 0,
}));

function fmtMB(bytes: number): string {
  if (bytes <= 0) return '—';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AppDownloadModal({
  triggerClassName = '',
  triggerLabel = 'Get our app',
}: {
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pct, setPct] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastUi = useRef(0);

  // Tear down any in-flight stream when the modal closes.
  useEffect(() => {
    if (!open && phase === 'downloading') abortRef.current?.abort();
  }, [open, phase]);

  useEffect(() => {
    if (!confetti) return;
    const t = setTimeout(() => setConfetti(false), 3200);
    return () => clearTimeout(t);
  }, [confetti]);

  function celebrate() {
    setPct(100);
    setPhase('ready');
    setConfetti(true);
  }

  function saveBlob(blob: Blob, filename: string): string {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return url;
  }

  async function startDownload() {
    setPct(0);
    setLoaded(0);
    setTotal(0);
    setPhase('downloading');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const infoRes = await fetch('/api/download/info');
      if (!infoRes.ok) throw new Error('resolve failed');
      const info = (await infoRes.json()) as {
        assetApiUrl?: string;
        browserDownloadUrl?: string;
        name?: string;
        size?: number;
      };
      if (!info.assetApiUrl) throw new Error('no asset');

      const res = await fetch(info.assetApiUrl, {
        headers: { Accept: 'application/octet-stream' },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error('stream blocked');

      const len = Number(res.headers.get('content-length')) || info.size || 0;
      setTotal(len);

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          const now = Date.now();
          if (now - lastUi.current > 120) {
            lastUi.current = now;
            setLoaded(received);
            if (len > 0) setPct(Math.min(99, Math.round((received / len) * 100)));
          }
        }
      }

      const blob = new Blob(chunks as BlobPart[], {
        type: 'application/vnd.android.package-archive',
      });
      setLoaded(received);
      const url = saveBlob(blob, info.name || 'turna.apk');
      setBlobUrl(url);
      celebrate();
    } catch {
      if (controller.signal.aborted || abortRef.current !== controller) {
        // User cancelled — reset silently.
        setPhase('idle');
        setPct(0);
        return;
      }
      // Streaming blocked (CORS/offline): hand it to the browser download
      // engine — the browser shows its own real progress bar.
      const a = document.createElement('a');
      a.href = APK_URL;
      a.download = 'turna.apk';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setPhase('fallback');
    }
  }

  function installNow() {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'turna.apk';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      window.location.href = APK_URL;
    }
  }

  function reset() {
    setOpen(false);
    setTimeout(() => {
      setPhase('idle');
      setPct(0);
      setLoaded(0);
      setTotal(0);
      setConfetti(false);
    }, 250);
  }

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
        onClose={phase === 'downloading' ? () => {} : reset}
        label="Download the Turna app"
        maxWidth="max-w-sm"
      >
        <div className="p-6 relative overflow-hidden">
          {confetti && (
            <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
              {PIECES.map((p) => (
                <span
                  key={p.id}
                  className="turna-confetti-piece absolute top-0 block"
                  style={
                    {
                      left: `${p.left}%`,
                      width: p.wide ? 10 : 7,
                      height: p.wide ? 14 : 7,
                      backgroundColor: p.color,
                      borderRadius: p.wide ? 2 : 9999,
                      animationDelay: `${p.delay}s`,
                      '--dx': `${p.dx}px`,
                      '--spin': `${p.spin}deg`,
                      '--dur': `${p.dur}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-forest">
                  {phase === 'ready' ? 'Turna is ready!' : 'Get the Turna app'}
                </h3>
                <p className="text-xs text-muted">
                  {phase === 'ready'
                    ? 'Open the file to finish installing.'
                    : 'Save on the go — same circles, same ledger.'}
                </p>
              </div>
            </div>
            {phase !== 'downloading' && (
              <button
                type="button"
                onClick={reset}
                aria-label="Close"
                className="btn-ghost btn-sm px-2 shrink-0"
              >
                ×
              </button>
            )}
          </div>

          {/* ── Idle ── */}
          {phase === 'idle' && (
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => void startDownload()}
                className="group w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 hover:bg-primary/10 transition-colors text-left"
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
              </button>

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
          )}

          {/* ── Downloading — real byte progress ── */}
          {phase === 'downloading' && (
            <div className="mt-6">
              <div className="flex items-end justify-between mb-2">
                <span className="font-display text-4xl font-extrabold text-forest tabular-nums">
                  {total > 0 ? `${pct}%` : '…'}
                </span>
                <span className="text-xs text-muted tabular-nums">
                  {fmtMB(loaded)}
                  {total > 0 ? ` / ${fmtMB(total)}` : ''}
                </span>
              </div>
              <div className="h-3 rounded-full bg-cream border border-border overflow-hidden">
                {total > 0 ? (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-[width] duration-150 ease-out"
                    style={{ width: `${Math.max(3, pct)}%` }}
                  />
                ) : (
                  <div className="relative h-full w-full overflow-hidden">
                    <span className="turna-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted mt-3">
                Fetching <span className="font-medium text-forest">turna.apk</span>{' '}
                — keep this tab open.
              </p>
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                }}
                className="btn-ghost btn-sm mt-4 w-full"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Fallback — browser engine downloads it ── */}
          {phase === 'fallback' && (
            <div className="mt-6">
              <div className="relative h-3 rounded-full bg-cream border border-border overflow-hidden">
                <span className="turna-shimmer absolute inset-y-0 left-0 w-1/3 block bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              </div>
              <p className="text-xs text-muted mt-3">
                Your browser is downloading it — watch the progress in its
                download bar.
              </p>
              <button
                type="button"
                onClick={celebrate}
                className="btn-primary w-full mt-4"
              >
                I&apos;ve got it — continue
              </button>
            </div>
          )}

          {/* ── Ready — celebration + install ── */}
          {phase === 'ready' && (
            <div className="mt-5">
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-forest text-sm">
                    Download complete
                  </p>
                  <p className="text-xs text-muted">
                    {total > 0 ? `${fmtMB(total)} · ` : ''}signed Turna APK
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={installNow}
                className="btn-primary w-full mt-4"
              >
                Install now
              </button>

              <ol className="mt-4 space-y-1.5 text-xs text-muted list-decimal list-inside">
                <li>Open the downloaded <span className="text-forest font-medium">turna.apk</span> file.</li>
                <li>Allow installs from this browser if Android asks.</li>
                <li>Follow the prompts to finish.</li>
              </ol>

              <button
                type="button"
                onClick={reset}
                className="btn-ghost btn-sm w-full mt-4"
              >
                Done
              </button>
            </div>
          )}

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
            onClick={reset}
          >
            All releases
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </ModalShell>
    </>
  );
}
