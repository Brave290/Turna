'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { ModalShell } from '@/components/modal-shell';

export interface SelectOption {
  value: string;
  label: string;
}

interface BrandSelectProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Branded dropdown — replaces native <select> with Turna-styled listbox.
 */
export function BrandSelect({
  name,
  value,
  defaultValue,
  options,
  onChange,
  id,
  className = '',
  'aria-label': ariaLabel,
}: BrandSelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(
    value ?? defaultValue ?? options[0]?.value ?? ''
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (value !== undefined) setSelected(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectedLabel =
    options.find((o) => o.value === selected)?.label ?? '';

  function pick(v: string) {
    setSelected(v);
    setOpen(false);
    onChange?.(v);
    btnRef.current?.focus();
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={selected} />}
      <button
        ref={btnRef}
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-white px-4 py-3 text-left text-forest transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/40"
      >
        <span className="truncate text-sm">{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.28 }}
            role="listbox"
            className="absolute z-50 mt-1.5 w-full min-w-[10rem] rounded-xl border border-border bg-white p-1.5 shadow-card overflow-hidden"
          >
            {options.map((opt) => {
              const active = opt.value === selected;
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => pick(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-forest hover:bg-border/50'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Branded confirm dialog (replaces window.confirm). Portal-centered. */
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    resolve?: (ok: boolean) => void;
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    danger: false,
  });

  function confirm(
    message: string,
    options?: { title?: string; confirmLabel?: string; danger?: boolean }
  ) {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: options?.title ?? 'Are you sure?',
        message,
        confirmLabel: options?.confirmLabel ?? 'Confirm',
        danger: options?.danger ?? false,
        resolve,
      });
    });
  }

  function close(ok: boolean) {
    state.resolve?.(ok);
    setState((s) => ({ ...s, open: false, resolve: undefined }));
  }

  const dialog = (
    <ModalShell
      open={state.open}
      onClose={() => close(false)}
      label={state.title || 'Confirm'}
      maxWidth="max-w-sm"
    >
      <div className="p-6">
        <h3 className="font-display text-lg font-bold text-forest mb-2">
          {state.title}
        </h3>
        <p className="text-sm text-muted leading-relaxed mb-6">
          {state.message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => close(false)}
            className="btn-outline btn-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`btn-sm ${
              state.danger
                ? 'btn bg-error text-white hover:bg-error/90 rounded-xl px-4 py-2'
                : 'btn-primary'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );

  return { confirm, dialog };
}

/** Shared empty-state helper (kept for parity with older imports). */
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="py-14 text-center px-6">
      {icon}
      <p className="text-sm font-medium text-forest mb-1">{title}</p>
      {description && <p className="text-xs text-muted">{description}</p>}
    </div>
  );
}
