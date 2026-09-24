"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { resetPassword } from "@/lib/auth-actions";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/spinner";
import { useToast } from "@/components/toast";

type AuthState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Sending...
        </>
      ) : (
        "Send reset link"
      )}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(
    (_: AuthState, formData: FormData) => resetPassword(formData),
    null as AuthState
  );
  const toast = useToast();
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.success && !state.error) {
      toast.success(state.success);
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast]);

  const formError = state?.error?.form?.[0];
  const emailError = state?.error?.email?.[0];

  if (state?.success && !state.error) {
    return (
      <div className="animate-fade-in text-center">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
          Check your email
        </h1>
        <p className="text-white/75 mb-8">{state.success}</p>
        <Link href="/auth/login" className="btn-primary w-full inline-flex">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
          Reset password
        </h1>
        <p className="text-white/75">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      <form action={formAction} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="label text-white/80">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`input${emailError ? " input-error" : ""}`}
            required
          />
          {emailError && (
            <p className="text-sm text-error mt-1.5" role="alert">
              {emailError}
            </p>
          )}
        </div>

        {formError && (
          <div
            className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {formError}
          </div>
        )}

        <SubmitButton />
      </form>

      <p className="text-sm text-white/70 text-center mt-8">
        Remembered it?{" "}
        <Link
          href="/auth/login"
          className="text-primary hover:text-primary-light font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
