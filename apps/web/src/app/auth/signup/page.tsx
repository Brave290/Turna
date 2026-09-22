"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { signUp } from "@/lib/auth-actions";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/spinner";

type AuthState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

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
    (_: AuthState, formData: FormData) => signUp(formData),
    null as AuthState
  );
  const [showPassword, setShowPassword] = useState(false);

  const formError = state?.error?.form?.[0];
  const nameError = state?.error?.display_name?.[0];
  const emailError = state?.error?.email?.[0];
  const passwordError = state?.error?.password?.[0];

  if (state?.success && !state.error) {
    return (
      <div className="animate-fade-in text-center">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
          Check your email
        </h1>
        <p className="text-white/55 mb-8">{state.success}</p>
        <Link href="/auth/verify" className="btn-primary w-full inline-flex">
          Enter verification code
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
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
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

      <div className="flex items-center gap-4 my-6">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-wider text-white/40">
          or continue with
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        disabled
        className="btn w-full border border-white/15 bg-white/5 text-white/60 rounded-xl px-6 py-3"
      >
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
        <span className="badge bg-primary/15 text-primary-light ml-auto">
          Coming soon
        </span>
      </button>

      <p className="text-sm text-white/50 text-center mt-8">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-primary hover:text-primary-light font-medium transition-colors"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
