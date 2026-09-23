"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

const CODE_LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  shakeKey?: number;
  autoFocus?: boolean;
  className?: string;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  shakeKey = 0,
  autoFocus = true,
  className,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const reduce = useReducedMotion();
  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, [autoFocus]);

  function setAt(index: number, ch: string) {
    const next = value.padEnd(CODE_LENGTH, " ").split("");
    next[index] = ch;
    const joined = next.join("").replace(/\s+$/, "").trimEnd();
    onChange(joined);
    return joined;
  }

  function handleChange(index: number, raw: string) {
    const ch = raw.replace(/\D/g, "").slice(-1);
    if (!ch && raw !== "") return;
    const joined = setAt(index, ch);
    if (ch && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (joined.length === CODE_LENGTH && !joined.includes(" ")) {
      onComplete?.(joined);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        setAt(index, " ");
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setAt(index - 1, " ");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    if (pasted.length === CODE_LENGTH) onComplete?.(pasted);
  }

  return (
    <motion.div
      key={error ? `err-${shakeKey}` : "otp"}
      className={cn("flex justify-between gap-2 sm:gap-2.5", className)}
      onPaste={handlePaste}
      animate={
        reduce
          ? undefined
          : error
            ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
            : { x: 0 }
      }
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {digits.map((digit, i) => {
        const filled = Boolean(digit);
        return (
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <input
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              disabled={disabled}
              aria-label={`Digit ${i + 1}`}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn(
                "w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-semibold rounded-xl border bg-white/90 backdrop-blur-sm",
                "transition-all duration-200 outline-none",
                "focus:ring-2 focus:ring-primary/30 focus:border-primary focus:scale-[1.04]",
                error
                  ? "border-error text-error ring-2 ring-error/20"
                  : filled
                    ? "border-primary text-forest shadow-glow/30"
                    : "border-border text-forest placeholder:text-muted/50",
                disabled && "opacity-60 cursor-not-allowed"
              )}
            />
            <AnimatePresence>
              {filled && !reduce && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary"
                />
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export { CODE_LENGTH };
