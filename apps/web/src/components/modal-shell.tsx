'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  maxWidth?: string;
  /** portal root — always document.body so parent transform/filter cannot break fixed centering */
}

/**
 * Viewport-centered dialog portal.
 * Renders into document.body so framer-motion ancestors (transform/filter)
 * cannot re-anchor position:fixed. Always dead-center on every viewport.
 */
export function ModalShell({
  open,
  onClose,
  children,
  label,
  maxWidth = 'max-w-md',
}: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('lock-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('lock-scroll');
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-forest/55 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            className={`relative w-full ${maxWidth} max-h-[min(85dvh,100svh)] flex flex-col rounded-2xl border border-border bg-white shadow-card overflow-hidden`}
            role="dialog"
            aria-modal="true"
            aria-label={label}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
