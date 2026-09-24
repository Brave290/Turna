'use client';

import { useFormState } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import {
  markAllNotificationsRead,
  type MarkReadState,
} from '@/lib/auth-actions';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';

/**
 * "Mark all as read" — works in the notification modal or full page.
 * Refreshes the route so badge + list stay in sync.
 */
export function MarkAllReadButton({
  className = '',
  onDone,
  variant = 'outline',
}: {
  className?: string;
  onDone?: () => void;
  variant?: 'outline' | 'ghost' | 'primary';
}) {
  const [state, formAction] = useFormState(
    markAllNotificationsRead,
    null as MarkReadState
  );
  const toast = useToast();
  const lastKeyRef = useRef('');
  const [pendingLocal, setPendingLocal] = useState(false);

  useEffect(() => {
    if (!state) return;
    setPendingLocal(false);
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    } else if (state.success) {
      toast.success(state.success);
      onDone?.();
      // Soft-refresh so nav badge + lists update without a hard reload
      if (typeof window !== 'undefined') {
        const { pathname, search } = window.location;
        window.history.replaceState(null, '', pathname + search);
        // next/router not required — server components revalidate via revalidatePath
        void import('next/navigation').then(({ useRouter }) => {
          // no-op if router unavailable outside RSC
          void useRouter;
        });
        // Force a lightweight client refresh of current route data
        window.dispatchEvent(new Event('turna:notifications-read'));
      }
    }
  }, [state, toast, onDone]);

  const btnClass =
    variant === 'primary'
      ? 'btn-primary btn-sm'
      : variant === 'ghost'
        ? 'btn-ghost btn-sm'
        : 'btn-outline btn-sm';

  return (
    <form action={formAction} className="inline-block">
      <button
        type="submit"
        disabled={pendingLocal}
        className={`${btnClass} ${className}`}
        onClick={() => setPendingLocal(true)}
      >
        {pendingLocal ? (
          <>
            <Spinner />
            Marking…
          </>
        ) : (
          <>
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </>
        )}
      </button>
    </form>
  );
}
