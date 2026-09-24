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

const REMEMBER_KEY = "turna_remember_email";

type AuthState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
  needsVerify?: boolean;
  redirectTo?: string;
} | null;

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending || disabled}>
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

  useEffect(() => {
    if (redirectTarget.includes("/circles/join")) {
      try {
        const u = new URL(redirectTarget, window.location.origin);
        const t = u.searchParams.get("token");
        if (t) sessionStorage.setItem("turna_pending_invite", t);
      } catch {
        /* ignore */
      }
    }
  }, [redirectTarget]);

  const [agreed, setAgreed] = useState(false);
  const [remember, setRemember] = useState(false);
  const [emailValue, setEmailValue] = useState("");

  // Prefill remembered email (remember checkbox reflects saved state)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmailValue(saved);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [state, formAction] = useFormState(
    (_: AuthState, formData: FormData) => {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      if (email) sessionStorage.setItem("turna_pending_email", email);
      try {
        if (formData.get("remember") === "on" && email) {
          localStorage.setItem(REMEMBER_KEY, email);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        /* ignore */
      }
      if (redirectTarget && !formData.get("redirect")) {
        formData.set("redirect", redirectTarget);
      }
      if (!formData.get("terms")) {
        return {
          error: {
            form: ["You must agree to the Terms and Privacy Policy to continue."],
          },
        } as AuthState;
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

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!agreed) {
      e.preventDefault();
      toast.error("Please agree to the Terms and Privacy Policy.");
    }
  }

  return (
    <div className="animate-blur-in">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
          Welcome back
        </h1>
        <p className="text-white/75">Sign in to pick up where you left off.</p>
      </div>

      <form action={formAction} onSubmit={onSubmit} className="space-y-5" noValidate>
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
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
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

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40"
          />
          <span className="text-sm text-white/70">Remember my email</span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="terms"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/40"
            aria-required="true"
          />
          <span className="text-sm text-white/70 leading-snug">
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-primary hover:text-primary-light underline underline-offset-2"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-primary hover:text-primary-light underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {formError && (
          <div
            className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {formError}
          </div>
        )}

        <SubmitButton disabled={!agreed} />
      </form>

      <p className="text-sm text-white/70 text-center mt-8">
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
