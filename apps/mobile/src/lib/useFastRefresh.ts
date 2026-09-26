import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';

/**
 * Fast refresh — keep the visible screen's data fresh without user action.
 *
 * The app uses hand-rolled navigation (no React Navigation), so screen focus
 * is announced by `notifyScreenFocus()` from App.tsx instead of a focus event.
 * Triggers: (a) AppState → active, (b) screen focus, (c) every 30s while signed
 * in. Refetches are skipped while `busy` (pull-to-refresh / mid-edit) so a
 * background refresh can never clobber an in-flight change.
 */

const focusListeners = new Set<() => void>();

export function notifyScreenFocus(): void {
  focusListeners.forEach((l) => {
    try {
      l();
    } catch {
      /* a broken listener must not break the others */
    }
  });
}

const FOCUS_GRACE_MS = 1500;
const INTERVAL_MS = 30_000;

export function useFastRefresh(
  refetch: () => void | Promise<void>,
  opts?: { busy?: boolean; enabled?: boolean }
): { refreshNow: () => void } {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  const busyRef = useRef(false);
  busyRef.current = opts?.busy ?? false;
  const enabledRef = useRef(opts?.enabled ?? true);
  enabledRef.current = opts?.enabled ?? true;
  const cbRef = useRef(refetch);
  cbRef.current = refetch;
  const mountedAt = useRef(Date.now());

  const run = useCallback(() => {
    if (!enabledRef.current) return;
    if (busyRef.current) return;
    try {
      void cbRef.current();
    } catch {
      /* a failed background refresh is retried on the next trigger */
    }
  }, []);

  const refreshNow = useCallback(() => {
    try {
      void cbRef.current();
    } catch {
      /* caller shows the error state */
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    mountedAt.current = Date.now();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    const onFocus = () => {
      if (Date.now() - mountedAt.current < FOCUS_GRACE_MS) return;
      run();
    };
    focusListeners.add(onFocus);

    const id = setInterval(run, INTERVAL_MS);
    return () => {
      sub.remove();
      focusListeners.delete(onFocus);
      clearInterval(id);
    };
  }, [signedIn, run]);

  return { refreshNow };
}
