"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { resetPasswordWithToken } from "@/lib/auth-actions";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/spinner";
import { useToast } from "@/components/toast";

type AuthState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
  redirectTo?: string;
} | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Updating password...
        </>
      ) : (
        "Update password"
      )}
    </button>
  );
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const token = searchParams.get("token") || "";
  const [showPassword, setShowPassword] = useState(false);
  const lastKeyRef = useRef("");

  const [state, formAction] = useFormState(
    (prev: AuthState, formData: FormData) => {
      if (token) formData.set("token", token);
      return resetPasswordWithToken(prev, formData);
    },
    null as AuthState
  );

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
      setTimeout(() => router.push(state.redirectTo || "/auth/login"), 900);
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast, router]);

  if (!token) {
    return (
      <div className="animate-fade-in text-center">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
          Invalid link
        </h1>
        <p className="text-white/75 mb-8">
          This password reset link is missing or invalid. Request a new one.
        </p>
        <Link href="/auth/forgot-password" className="btn-primary w-full inline-flex">
          Request new link
        </Link>
      </div>
    );
  }

  const formError = state?.error?.form?.[0];

  if (state?.success && !state.error) {
    return (
      <div className="animate-fade-in text-center">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
          Password updated
        </h1>
        <p className="text-white/75 mb-8">{state.success}</p>
        <Link href="/auth/login" className="btn-primary w-full inline-flex">
          Sign in
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
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
          Set new password
        </h1>
        <p className="text-white/75">Choose a strong password for your account.</p>
      </div>

      <form action={formAction} className="space-y-5" noValidate>
        <div>
          <label htmlFor="password" className="label text-white/80">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className="input pr-11"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-forest transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label text-white/80">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat password"
            className="input"
            required
          />
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

      <p className="text-sm text-white/70 text-center mt-6">
        Remembered it?{" "}
        <Link href="/auth/login" className="text-primary hover:text-primary-light font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
