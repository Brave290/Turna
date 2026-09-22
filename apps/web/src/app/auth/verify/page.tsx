"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyEmailPage() {
  const router = useRouter();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function setDigit(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, value);
    setError(null);
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigit(index, "");
      } else if (index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
        setDigit(index - 1, "");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (!pasted) return;

    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    setError(null);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setSubmitting(true);
    router.push("/auth/welcome");
  }

  function handleResend() {
    if (secondsLeft > 0) return;
    setDigits(Array(CODE_LENGTH).fill(""));
    setError(null);
    setSecondsLeft(RESEND_SECONDS);
    inputRefs.current[0]?.focus();
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4"><Logo variant="on-dark" size={48} /></div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
          Verify your email
        </h1>
        <p className="text-white/55 text-sm leading-relaxed">
          We&apos;ve sent a 6-digit code to your@example.com
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div
          className="flex justify-between gap-2"
          onPaste={handlePaste}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              aria-label={`Digit ${i + 1}`}
              className="input text-center text-xl font-semibold py-3 px-0 w-12 h-14"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-error text-center" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting}
        >
          Verify
        </button>
      </form>

      <div className="text-center mt-6 space-y-3">
        <p className="text-sm text-white/50">
          Didn&apos;t get the code?{" "}
          {secondsLeft > 0 ? (
            <span className="text-white/40">
              Resend in {secondsLeft}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-primary hover:text-primary-light font-medium transition-colors"
            >
              Resend code
            </button>
          )}
        </p>
        <p className="text-sm text-white/50">
          <Link
            href="/auth/signup"
            className="text-primary hover:text-primary-light font-medium transition-colors"
          >
            Change email
          </Link>
        </p>
      </div>
    </div>
  );
}
