'use client';

import { useState, useTransition } from 'react';
import { MonitorSmartphone, Loader2 } from 'lucide-react';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/ui';

/**
 * Sign out other devices — invalidates all other Supabase sessions.
 * Requires online connection; never pretends success offline.
 */
export function SignOutOtherDevices() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function onClick() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('You are offline. Connect to sign out other devices.');
      return;
    }
    startTransition(() => {
      void (async () => {
        const ok = await confirm(
          'This will sign out every other browser and device. You stay signed in here.',
          {
            title: 'Sign out other devices?',
            confirmLabel: 'Sign out others',
            danger: true,
          }
        );
        if (!ok) return;
        setBusy(true);
        try {
          const res = await fetch('/api/auth/sign-out-others', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok || !data.ok) {
            toast.error(data.error || 'Could not sign out other devices');
            return;
          }
          toast.success('Other devices signed out');
        } catch {
          toast.error('Network error — other devices were not signed out');
        } finally {
          setBusy(false);
        }
      })();
    });
  }

  return (
    <>
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MonitorSmartphone className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-semibold text-forest">Active sessions</h2>
              <p className="text-sm text-muted mt-0.5">
                Sign out all other devices if you don&apos;t recognize a
                session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClick}
            disabled={pending || busy}
            className="btn-outline btn-sm shrink-0"
          >
            {busy || pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Sign out others
          </button>
        </div>
      </section>
      {dialog}
    </>
  );
}
