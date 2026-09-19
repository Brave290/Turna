'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Lock, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code);
    }
  }, [searchParams, supabase]);

  const validatePassword = (value: string): string | null => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
    return null;
  };

  const validateConfirmPassword = (value: string): string | null => {
    if (!value) return 'Please confirm your password';
    if (value !== password) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword);

    if (passwordErr) errors.password = passwordErr;
    if (confirmErr) errors.confirmPassword = confirmErr;

    setFieldErrors(errors);
    setTouched({ password: true, confirmPassword: true });

    if (Object.keys(errors).length > 0) return;

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);

      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error.form?.[0] ?? data.error.message ?? 'Failed to update password');
        return;
      }

      setMessage('Password updated successfully! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1500);
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
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Set New Password
          </h1>
          <p className="mt-2 text-text-secondary">
            Your new password must be different from previous ones
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
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-text-secondary" />
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                  placeholder="Create a strong password"
                  className={`input pr-12 ${touched.password && fieldErrors.password ? 'border-error focus:ring-error' : ''}`}
                  required
                  disabled={loading}
                  aria-invalid={touched.password && !!fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-text-secondary" />
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
                  placeholder="Confirm your password"
                  className={`input pr-12 ${touched.confirmPassword && fieldErrors.confirmPassword ? 'border-error focus:ring-error' : ''}`}
                  required
                  disabled={loading}
                  aria-invalid={touched.confirmPassword && !!fieldErrors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.confirmPassword && fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            <a href="/auth/login" className="text-primary hover:underline font-medium">
              Back to sign in
            </a>
          </p>
        </div>

        <div className="mt-8 text-center text-xs text-text-secondary/50">
          <p>Built by Akanji Mus&apos;ab • Brave hx Technology • Founda Technologies</p>
        </div>
      </div>
    </div>
  );
}
