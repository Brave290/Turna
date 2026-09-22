"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/logo";

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

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError(null);
    router.push("/auth/verify");
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4"><Logo variant="on-dark" size={48} /></div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
          Create your account
        </h1>
        <p className="text-white/55">Start saving with your circle today.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="name" className="label text-white/80">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Ada Obi"
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="email" className="label text-white/80">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="password" className="label text-white/80">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className="input pr-11"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
        </div>

        {error && (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full">
          Create Account
        </button>
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
