'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const validateEmail = (value: string): string | null => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const err = validateEmail(email);
    if (err) { setError(err); return; }

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error.form?.[0] ?? data.error.message ?? 'Failed to send reset email');
        return;
      }

      setMessage(data.success ?? 'Check your email for password reset instructions.');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <a href="/auth/login" className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary mb-6">
            <ArrowLeft className="w-5 h-5" />
            Back to sign in
          </a>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Reset Password
          </h1>
          <p className="mt-2 text-text-secondary">
            Enter your email and we'll send you reset instructions
          </p>
        </div>

        <div className="card animate-slide-up">
          {message && (
            <div className="mb-6 p-3 rounded-lg bg-success/10 text-success text-sm flex items-center gap-2 animate-scale-in">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-error/10 text-error text-sm flex items-center gap-2 animate-scale-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-text-secondary" />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@example.com"
                className={`input ${emailTouched && validateEmail(email) ? 'border-error focus:ring-error' : ''}`}
                required
                disabled={loading}
                aria-invalid={emailTouched && !!validateEmail(email)}
              />
              {emailTouched && validateEmail(email) && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validateEmail(email)}
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Remember your password?{' '}
            <a href="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>

        <div className="mt-8 text-center text-xs text-text-secondary/50">
          <p>Built by Akanji Mus'ab • Brave hx Technology • Founda Technologies</p>
        </div>
      </div>
    </div>
  );
}