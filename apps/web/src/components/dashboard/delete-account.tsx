'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';
import { deleteAccount, type DeleteAccountState } from '@/lib/auth-actions';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn bg-error text-white hover:bg-error/90 rounded-xl px-6 py-3"
      disabled={pending}
    >
      {pending ? (
        <>
          <Spinner />
          Deleting...
        </>
      ) : (
        'Permanently delete account'
      )}
    </button>
  );
}

export function DeleteAccountPanel() {
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [state, formAction] = useFormState(
    deleteAccount,
    null as DeleteAccountState
  );
  const toast = useToast();
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
      c: state.error?.confirm_email?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.error?.form?.[0]) toast.error(state.error.form[0]);
    if (state.error?.confirm_email?.[0]) toast.error(state.error.confirm_email[0]);
  }, [state, toast]);

  const emailErr = state?.error?.confirm_email?.[0];
  const formErr = state?.error?.form?.[0];

  return (
    <section className="card border-error/30">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5 text-error" />
        </div>
        <div>
          <h2 className="font-semibold text-forest">Delete account</h2>
          <p className="text-sm text-muted mt-0.5 leading-relaxed">
            Permanently removes your profile, notifications, and pending
            invitations. This cannot be undone.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-outline border-error/40 text-error hover:bg-error/10"
      >
        <Trash2 className="w-4 h-4" />
        Delete my account
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-forest/55 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
              className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-card"
              role="dialog"
              aria-modal="true"
              aria-label="Confirm account deletion"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-error" />
                <h3 className="font-display text-lg font-bold text-forest">
                  Delete your account?
                </h3>
              </div>
              <p className="text-sm text-muted leading-relaxed mb-5">
                This permanently deletes your account and personal data. You
                must not own any active circles. This action cannot be reversed.
              </p>

              <form action={formAction} className="space-y-4">
                <div>
                  <label htmlFor="confirm_email" className="label">
                    Type your email to confirm
                  </label>
                  <input
                    id="confirm_email"
                    name="confirm_email"
                    type="email"
                    autoComplete="off"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`input${emailErr ? ' input-error' : ''}`}
                    required
                  />
                  {emailErr && (
                    <p className="text-sm text-error mt-1.5">{emailErr}</p>
                  )}
                </div>

                {formErr && (
                  <div
                    className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
                    role="alert"
                  >
                    {formErr}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <ConfirmDeleteButton />
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
