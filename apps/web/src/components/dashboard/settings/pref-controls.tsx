'use client';

import { useEffect, useTransition } from 'react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { saveUserPreferences, type SettingsActionState } from '@/lib/settings-actions';

/**
 * Preference toggle — persists via server action to user_preferences.
 */
export function PrefToggle({
  name,
  label,
  description,
  defaultChecked,
  disabled,
  mandatoryNote,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked: boolean;
  disabled?: boolean;
  mandatoryNote?: string;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // silence unused import when tree-shaken differently
    void saveUserPreferences;
    void (null as SettingsActionState);
  }, []);

  function onChange(checked: boolean) {
    const fd = new FormData();
    fd.set(name, checked ? 'true' : 'false');
    startTransition(() => {
      void (async () => {
        const res = await saveUserPreferences(null, fd);
        if (res?.success) toast.success(res.success);
        else if (res?.error?.form?.[0]) toast.error(res.error.form[0]);
      })();
    });
  }

  return (
    <div className="w-full flex items-center gap-3 px-1 py-3 min-h-[56px]">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-forest">{label}</span>
        {description && (
          <span className="block text-xs text-muted mt-0.5">{description}</span>
        )}
        {mandatoryNote && (
          <span className="block text-[11px] text-warning mt-1">{mandatoryNote}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={defaultChecked}
        aria-label={label}
        disabled={disabled || pending}
        onClick={() => onChange(!defaultChecked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 disabled:opacity-60 ${
          defaultChecked ? 'bg-primary' : 'bg-border'
        }`}
      >
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner className="w-3.5 h-3.5 text-white" />
          </span>
        )}
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            defaultChecked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

/** Radio row for single-choice settings (theme, language, currency…). */
export function PrefRadio({
  name,
  value,
  label,
  description,
  checked,
  disabled,
}: {
  name: string;
  value: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function pick() {
    if (checked || disabled) return;
    const fd = new FormData();
    fd.set(name, value);
    startTransition(() => {
      void (async () => {
        const res = await saveUserPreferences(null, fd);
        if (res?.success) toast.success(res.success);
        else if (res?.error?.form?.[0]) toast.error(res.error.form[0]);
      })();
    });
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled || pending}
      onClick={pick}
      className="w-full flex items-center gap-3 px-1 py-3 min-h-[56px] text-left rounded-xl -mx-1 hover:bg-white transition-colors disabled:opacity-60"
    >
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          checked ? 'border-primary' : 'border-border'
        }`}
        aria-hidden
      >
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-forest">{label}</span>
        {description && (
          <span className="block text-xs text-muted mt-0.5">{description}</span>
        )}
      </span>
      {pending && <Spinner className="w-4 h-4 text-muted" />}
      <input type="radio" name={name} value={value} checked={checked} readOnly className="sr-only" />
    </button>
  );
}
