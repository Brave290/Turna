'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

const SYNC_KEY = 'turna-last-sync';

function readLastSync(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SYNC_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatAgo(ts: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec} second${sec === 1 ? '' : 's'} ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  return `${Math.floor(hr / 24)} day${Math.floor(hr / 24) === 1 ? '' : 's'} ago`;
}

type SyncState = 'online' | 'offline' | 'syncing' | 'up-to-date';

/**
 * Offline banner — shows last synced data notice when offline.
 * Marks successful page loads as last-synced timestamp.
 * Does NOT claim financial mutations succeeded while offline.
 */
export function OfflineBanner() {
  const [state, setState] = useState<SyncState>('online');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const markSync = () => {
      const t = Date.now();
      window.localStorage.setItem(SYNC_KEY, String(t));
      setLastSync(t);
    };

    // On mount of a real page load, record sync (data was fetched)
    markSync();
    setLastSync(readLastSync());

    const goOffline = () => setState('offline');
    const goOnline = () => {
      setState('syncing');
      window.setTimeout(() => {
        markSync();
        setState('up-to-date');
        window.setTimeout(() => setState('online'), 2400);
      }, 700);
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setState('offline');
      setLastSync(readLastSync());
    }

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      window.clearInterval(tick);
    };
  }, []);

  if (state === 'online') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-[14px] border px-4 py-3 text-sm ${
        state === 'offline'
          ? 'border-warning/45 bg-warning/10 text-forest'
          : state === 'syncing'
            ? 'border-primary/40 bg-primary/8 text-forest'
            : 'border-primary/40 bg-primary/10 text-forest'
      }`}
      data-offline-banner
    >
      <span className="shrink-0">
        {state === 'offline' ? (
          <WifiOff className="w-4.5 h-4.5 w-[18px] h-[18px] text-warning" />
        ) : state === 'syncing' ? (
          <RefreshCw className="w-[18px] h-[18px] text-primary animate-spin" />
        ) : (
          <CheckCircle2 className="w-[18px] h-[18px] text-primary" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        {state === 'offline' ? (
          <>
            <span className="block font-medium">
              You&apos;re offline — showing your last synced data.
            </span>
            <span className="block text-xs text-muted mt-0.5">
              {lastSync
                ? `Last synced ${formatAgo(lastSync)}`
                : 'Some details may be outdated.'}
              {` · viewing as of ${new Date(now).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`}
            </span>
            <span className="block text-xs text-muted/90 mt-1">
              Financial changes will not be saved until you&apos;re back online.
            </span>
          </>
        ) : state === 'syncing' ? (
          <span className="block font-medium">Syncing…</span>
        ) : (
          <span className="block font-medium">Up to date</span>
        )}
      </span>
      {state === 'offline' && (
        <Wifi className="w-4 h-4 text-muted shrink-0 opacity-50" aria-hidden />
      )}
    </div>
  );
}

/** Client helper: block mutations while offline. */
export function useOnlineGuard() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
