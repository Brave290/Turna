'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Centers a toast/feedback card dead-center of the viewport (always).
 * Portals to document.body so layout transforms cannot push it off-screen.
 */
export function CenterToast({
  open,
  children,
  onDone,
  duration = 4200,
}: {
  open: boolean;
  children: ReactNode;
  onDone?: () => void;
  duration?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !onDone) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [open, onDone, duration]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-primary/40 bg-white px-5 py-4 shadow-card">
        {children}
      </div>
    </div>,
    document.body
  );
}
