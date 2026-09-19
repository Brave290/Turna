'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();
      
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const next = searchParams.get('next') ?? '/dashboard';

      if (error) {
        setStatus('error');
        setMessage(errorDescription ?? 'Authentication failed');
        return;
      }

      if (code) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionError) {
          setStatus('error');
          setMessage(sessionError.message);
          return;
        }
      }

      // Check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setStatus('success');
        setMessage('Signed in successfully!');
        setTimeout(() => router.push(next), 1500);
      } else {
        setStatus('error');
        setMessage('No session found. Please try signing in again.');
      }
    };

    handleAuth();
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center animate-fade-in">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-text-secondary">Completing sign in...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center animate-scale-in">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back!</h1>
          <p className="text-text-secondary">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="card animate-shake">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Sign In Failed</h1>
            <p className="text-text-secondary mb-6">{message}</p>
            <a href="/auth/login" className="btn-primary w-full">
              Try Again
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}