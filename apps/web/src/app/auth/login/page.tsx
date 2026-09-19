'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Eye, EyeOff, Loader2, Check, AlertCircle, Mail, Lock, ArrowLeft } from 'lucide-react';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailTouched, setEmailTouched] = useState(false);
  const [otpTouched, setOtpTouched] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const interval = setInterval(() => {
      if (resendCooldown > 0) {
        setResendCooldown(prev => Math.max(0, prev - 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setMessage('Session expired. Please sign in again.');
        setStep('email');
        setOtp(['', '', '', '', '', '']);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (step === 'otp') {
      const timeout = setTimeout(() => {
        supabase.auth.signOut();
        setError('Session expired. Please sign in again.');
        setStep('email');
        setOtp(['', '', '', '', '', '']);
      }, SESSION_TIMEOUT_MS);
      return () => clearTimeout(timeout);
    }
  }, [step, supabase]);

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return 'Email address is required';
    if (!/^\S+@\S+\.\S+$/.test(value)) return 'Enter a valid email address';
    return null;
  };

  const validateOtp = (values: string[]): string | null => {
    if (values.some(v => !v)) return 'Enter all 6 digits';
    if (values.some(v => !/^\d$/.test(v))) return 'Only numbers allowed';
    return null;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailTouched) {
      const err = validateEmail(value);
      if (err) setError(err);
      else setError('');
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    const err = validateEmail(email);
    if (err) setError(err);
  };

  const requestEmailOtp = async () => {
    const response = await fetch('/api/auth/request-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error ?? 'Unable to send an OTP right now');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) { setError(err); return; }

    setError('');
    setLoading(true);

    try {
      await requestEmailOtp();

      setMessage('OTP sent! Check your email.');
      setStep('otp');
      setResendCooldown(OTP_RESEND_COOLDOWN_MS);
      setOtpTouched(false);
      
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(0, 1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    if (otpTouched) {
      const err = validateOtp(newOtp);
      if (err) setError(err);
      else setError('');
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && otp.every(v => v)) {
      handleOtpSubmit(e as any);
    }
  };

  const handleOtpBlur = () => {
    setOtpTouched(true);
    const err = validateOtp(otp);
    if (err) setError(err);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateOtp(otp);
    if (err) { setError(err); return; }

    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp.join(''),
        type: 'email',
      });

      if (error) throw error;

      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);

    try {
      await requestEmailOtp();

      setMessage('New OTP sent! Check your email.');
      setResendCooldown(OTP_RESEND_COOLDOWN_MS);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setMessage('');
    setOtpTouched(false);
  };

  const formatCooldown = (ms: number) => {
    const secs = Math.ceil(ms / 1000);
    return `${secs}s`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Turna<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-text-secondary">
            Sign in to your savings circle
          </p>
        </div>

        <div className="card animate-slide-up">
          {message && (
            <div className="mb-6 p-3 rounded-lg bg-success/10 text-success text-sm flex items-center gap-2 animate-scale-in">
              <Check className="w-4 h-4 flex-shrink-0" />
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-error/10 text-error text-sm flex items-center gap-2 animate-scale-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-text-secondary" />
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder="you@example.com"
                    className={`input ${emailTouched && validateEmail(email) ? 'border-error focus:ring-error' : ''}`}
                    required
                    disabled={loading}
                    aria-invalid={emailTouched && !!validateEmail(email)}
                  />
                </div>
                {emailTouched && validateEmail(email) && (
                  <p className="mt-1 text-xs text-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validateEmail(email)}
                  </p>
                )}
                {!emailTouched && (
                  <p className="mt-1 text-xs text-text-secondary flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    We&apos;ll send a 6-digit code via email
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
                  'Send OTP'
                )}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-6" noValidate>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-text-secondary" />
                  Enter 6-digit code
                </label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpInputsRef.current[i] = el; }}
                      type={showOtp ? 'text' : 'password'}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onBlur={handleOtpBlur}
                      className={`input text-center text-2xl tracking-widest w-12 ${otpTouched && validateOtp(otp) ? 'border-error focus:ring-error' : ''}`}
                      autoFocus={i === 0}
                      disabled={loading}
                      aria-label={`Digit ${i + 1}`}
                      aria-invalid={otpTouched && !!validateOtp(otp)}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={() => setShowOtp(!showOtp)}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                    disabled={loading}
                  >
                    {showOtp ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show
                      </>
                    )}
                  </button>
                  {otpTouched && validateOtp(otp) && (
                    <p className="text-xs text-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validateOtp(otp)}
                    </p>
                  )}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading || otp.some(v => !v)}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </button>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldown > 0}
                  className="btn-ghost w-full text-sm"
                >
                  {resendCooldown > 0 ? (
                    <>
                      <Loader2 className="w-4 h-4" />
                      Resend in {formatCooldown(resendCooldown)}
                    </>
                  ) : (
                    'Resend OTP'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="btn-ghost w-full"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change email address
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-primary hover:underline">Terms of Service</a>{' '}
          and{' '}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
        </p>

        <div className="mt-8 text-center text-xs text-text-secondary/50">
          <p>Built by Akanji Mus&apos;ab • Brave hx Technology • Founda Technologies</p>
        </div>
      </div>
    </div>
  );
}
