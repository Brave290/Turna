"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "@/lib/auth-actions";
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
          Signing in...
        </>
      ) : (
        "Sign In"
      )}
    </button>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "";
  const [state, formAction] = useFormState(
    (_: AuthState, formData: FormData) => {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      if (email) sessionStorage.setItem("turna_pending_email", email);
      if (redirectTarget && !formData.get("redirect")) {
        formData.set("redirect", redirectTarget);
      }
      return signIn(formData);
    },
    null as AuthState
  );
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      e: state.error?.form?.[0] ?? null,
      s: state.success ?? null,
      v: state.needsVerify ?? false,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.needsVerify && state.success) {
      toast.warning(state.success);
      const target = state.redirectTo || "/auth/verify";
      setTimeout(() => router.push(target), 600);
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    } else if (state.success) {
      toast.info(state.success);
    }
  }, [state, toast, router]);

  const formError = state?.error?.form?.[0];
  const emailError = state?.error?.email?.[0];
  const passwordError = state?.error?.password?.[0];

  return (
    <div className="animate-blur-in">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
          Welcome back
        </h1>
        <p className="text-white/55">Sign in to pick up where you left off.</p>
      </div>

      <form action={formAction} className="space-y-5" noValidate>
        {redirectTarget && (
          <input type="hidden" name="redirect" value={redirectTarget} />
        )}
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
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="label text-white/80 mb-0">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-primary hover:text-primary-light transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
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
        No account yet?{" "}
        <Link
          href="/auth/signup"
          className="text-primary hover:text-primary-light font-medium transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
