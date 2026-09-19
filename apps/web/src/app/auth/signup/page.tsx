'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, User, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const validateEmail = (value: string): string | null => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
    return null;
  };

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

  const validateDisplayName = (value: string): string | null => {
    if (!value.trim()) return 'Display name is required';
    if (value.trim().length < 2) return 'Display name must be at least 2 characters';
    return null;
  };

  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        break;
      case 'display_name':
        setDisplayName(value);
        break;
    }

    if (touched[field]) {
      let err: string | null = null;
      switch (field) {
        case 'email': err = validateEmail(value); break;
        case 'password': err = validatePassword(value); break;
        case 'confirmPassword': err = validateConfirmPassword(value); break;
        case 'display_name': err = validateDisplayName(value); break;
      }
      setFieldErrors(prev => ({ ...prev, [field]: err ?? '' }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    let err: string | null = null;
    switch (field) {
      case 'email': err = validateEmail(email); break;
      case 'password': err = validatePassword(password); break;
      case 'confirmPassword': err = validateConfirmPassword(confirmPassword); break;
      case 'display_name': err = validateDisplayName(displayName); break;
    }
    setFieldErrors(prev => ({ ...prev, [field]: err ?? '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword);
    const nameErr = validateDisplayName(displayName);

    if (emailErr) errors.email = emailErr;
    if (passwordErr) errors.password = passwordErr;
    if (confirmErr) errors.confirmPassword = confirmErr;
    if (nameErr) errors.display_name = nameErr;

    setFieldErrors(errors);
    setTouched({ email: true, password: true, confirmPassword: true, display_name: true });

    if (Object.keys(errors).length > 0) return;

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('display_name', displayName.trim());

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        if (data.error.form) {
          setError(data.error.form[0]);
        } else {
          setFieldErrors(data.error);
        }
        return;
      }

      setMessage(data.success ?? 'Account created! Check your email to confirm.');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/google', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError('Failed to initiate Google sign in');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-error', 'bg-error', 'bg-warning', 'bg-primary', 'bg-success'];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Turna<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-text-secondary">
            Create your savings circle account
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

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-text-secondary" />
                Display Name
              </label>
              <input
                id="display_name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => handleFieldChange('display_name', e.target.value)}
                onBlur={() => handleFieldBlur('display_name')}
                placeholder="Your name"
                className={`input ${touched.display_name && fieldErrors.display_name ? 'border-error focus:ring-error' : ''}`}
                required
                disabled={loading}
                aria-invalid={touched.display_name && !!fieldErrors.display_name}
              />
              {touched.display_name && fieldErrors.display_name && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.display_name}
                </p>
              )}
            </div>

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
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder="you@example.com"
                className={`input ${touched.email && fieldErrors.email ? 'border-error focus:ring-error' : ''}`}
                required
                disabled={loading}
                aria-invalid={touched.email && !!fieldErrors.email}
              />
              {touched.email && fieldErrors.email && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-text-secondary" />
                Password
              </label>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  onBlur={() => handleFieldBlur('password')}
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
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 rounded-full bg-divider overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColors[passwordStrength() - 1] || 'bg-divider'}`}
                      style={{ width: `${(passwordStrength() / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary">
                    Password strength: {strengthLabels[passwordStrength() - 1] || 'Very Weak'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-text-secondary" />
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
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
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-divider" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface text-text-secondary">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-secondary w-full flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <a href="/auth/login" className="text-primary hover:underline font-medium">
            Sign in
          </a>
        </p>

        <div className="mt-8 text-center text-xs text-text-secondary/50">
          <p>Built by Akanji Mus'ab • Brave hx Technology • Founda Technologies</p>
        </div>
      </div>
    </div>
  );
}