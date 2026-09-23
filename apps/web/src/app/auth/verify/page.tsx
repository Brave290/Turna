"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Logo } from "@/components/logo";
import { OtpInput, CODE_LENGTH } from "@/components/otp-input";
import { verifyEmailOtp, resendEmailOtp } from "@/lib/auth-actions";
import { useToast } from "@/components/toast";

const RESEND_SECONDS = 30;

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isPending, setPending] = useState(false);
  const submittingRef = useRef(false);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [resending, setResending] = useState(false);

  // Pick up pending email from signup query
  useEffect(() => {
    const q = searchParams.get("email");
    if (q) setEmail(q);
    else {
      // try sessionStorage from signup
      const stored = sessionStorage.getItem("turna_pending_email");
      if (stored) setEmail(stored);
    }
  }, [searchParams]);

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < CODE_LENGTH) {
      setError("Enter the full 6-digit code.");
      setShakeKey((k) => k + 1);
      return;
    }
    setError(null);
    void submitCode(code);
  }

  async function submitCode(token: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    // startTransition expects void; wrap async work manually
    setError(null);
    const formData = new FormData();
    formData.set("email", email);
    formData.set("token", token);
    formData.set("purpose", "signup");
    setPending(true);
    try {
      const res = await verifyEmailOtp(null, formData);
      if (res?.error?.form?.[0]) {
        setError(res.error.form[0]);
        toast.error(res.error.form[0]);
        setShakeKey((k) => k + 1);
        setCode("");
      } else if (res?.success) {
        setSuccess(res.success);
        toast.success(res.success);
        const target = res?.redirectTo || "/dashboard";
        setTimeout(() => router.push(target), 800);
      } else {
        setError("Verification failed. Try again.");
        toast.error("Verification failed. Try again.");
        setShakeKey((k) => k + 1);
      }
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  async function handleResend() {
    if (secondsLeft > 0 || resending || !email) return;
    setResending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await resendEmailOtp(email);
      if (res?.error?.form?.[0]) {
        setError(res.error.form[0]);
        toast.error(res.error.form[0]);
      } else {
        const msg = res?.success ?? "New code sent.";
        setSuccess(msg);
        toast.success(msg);
        setSecondsLeft(RESEND_SECONDS);
        setCode("");
      }
    } finally {
      setResending(false);
    }
  }

  // If no email yet, show email entry first (real flow, no fake hard-coded address)
  if (!email) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
          What&apos;s your email?
        </h1>
        <p className="text-white/55 text-sm mb-8">
          We&apos;ll send a 6-digit code to finish verifying your account.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.currentTarget.elements.namedItem("email") as HTMLInputElement)?.value;
            if (input && /^\S+@\S+\.\S+$/.test(input)) {
              setEmail(input.trim().toLowerCase());
              sessionStorage.setItem("turna_pending_email", input.trim().toLowerCase());
              setSecondsLeft(RESEND_SECONDS);
            } else {
              setError("Enter a valid email address.");
            }
          }}
          className="space-y-4"
        >
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="input"
            required
          />
          <button type="submit" className="btn-primary w-full">
            Send code
          </button>
        </form>
        <p className="text-sm text-white/50 mt-6">
          <Link
            href="/auth/login"
            className="text-primary hover:text-primary-light font-medium"
          >
            Back to sign in
          </Link>
        </p>
      </motion.div>
    );
  }

  return (
    <div className="animate-blur-in">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Logo variant="on-dark" size={48} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
          Check your inbox
        </h1>
        <p className="text-white/55 text-sm leading-relaxed">
          We sent a 6-digit code to
          <br />
          <span className="text-primary-light font-medium break-all">{email}</span>
        </p>
      </div>

      {/* OTP cards with motion effects */}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            setError(null);
          }}
          onComplete={(v) => {
            void submitCode(v);
          }}
          disabled={isPending}
          error={Boolean(error)}
          shakeKey={shakeKey}
        />

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key={error}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-error text-center"
              role="alert"
            >
              {error}
            </motion.p>
          )}
          {success && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 text-primary-light text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isPending || code.length < CODE_LENGTH}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify email"
          )}
        </button>
      </form>

      <div className="text-center mt-6 space-y-3">
        <p className="text-sm text-white/50">
          Didn&apos;t get it?{" "}
          {secondsLeft > 0 ? (
            <span className="text-white/40">Resend in {secondsLeft}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-primary hover:text-primary-light font-medium transition-colors inline-flex items-center gap-1"
            >
              {resending && <Loader2 className="w-3 h-3 animate-spin" />}
              Resend code
            </button>
          )}
        </p>
        <p className="text-sm text-white/50">
          <button
            type="button"
            onClick={() => {
              setEmail("");
              setCode("");
              setError(null);
              sessionStorage.removeItem("turna_pending_email");
            }}
            className="text-primary hover:text-primary-light font-medium transition-colors"
          >
            Change email
          </button>
        </p>
        <p className="text-xs text-white/35 flex items-center justify-center gap-1">
          <Mail className="w-3 h-3" />
          This code expires in 5 minutes.
        </p>
      </div>
    </div>
  );
}
