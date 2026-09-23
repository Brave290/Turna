"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { signUp } from "@/lib/auth-actions";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/spinner";
import { useToast } from "@/components/toast";

type AuthState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
  needsVerify?: boolean;
  redirectTo?: string;
} | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Creating account...
        </>
      ) : (
        "Create Account"
      )}
    </button>
  );
}

export default function SignUpPage() {
  const [state, formAction] = useFormState(
    (_: AuthState, formData: FormData) => {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");
      if (email) sessionStorage.setItem("turna_pending_email", email);
      if (password) sessionStorage.setItem("turna_pending_password", password);
      return signUp(formData);
    },
    null as AuthState
  );
  const [showPassword, setShowPassword] = useState(false);
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
  const nameError = state?.error?.display_name?.[0];
  const emailError = state?.error?.email?.[0];
  const passwordError = state?.error?.password?.[0];

  if (state?.success && !state.error) {
    return (
      <div className="animate-blur-in text-center">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
          Code sent
        </h1>
        <p className="text-white/55 mb-8">{state.success}</p>
        <Link
          href={state.redirectTo || "/auth/verify"}
          className="btn-primary w-full inline-flex"
        >
          Enter 6-digit code
        </Link>
        <p className="text-sm text-white/50 mt-6">
          Wrong address?{" "}
          <Link
            href="/auth/signup"
            className="text-primary hover:text-primary-light font-medium"
          >
            Try again
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
          Create your account
        </h1>
        <p className="text-white/55">Start saving with your circle today.</p>
      </div>

      <form action={formAction} className="space-y-5" noValidate>
        <div>
          <label htmlFor="display_name" className="label text-white/80">
            Full name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="name"
            placeholder="Ada Obi"
            className={`input${nameError ? " input-error" : ""}`}
            required
          />
          {nameError && (
            <p className="text-sm text-error mt-1.5" role="alert">
              {nameError}
            </p>
          )}
        </div>

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

        <div>
          <label htmlFor="password" className="label text-white/80">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className={`input pr-11${passwordError ? " input-error" : ""}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-forest transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-white/40 mt-1.5">
            Must be at least 8 characters.
          </p>
          {passwordError && (
            <p className="text-sm text-error mt-1.5" role="alert">
              {passwordError}
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

      <p className="text-sm text-white/50 text-center mt-8">
        Already have an account?{" "}
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
