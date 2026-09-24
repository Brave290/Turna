import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { mobileAuth } from '../lib/api';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'needsVerify' | 'onboarding';

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  email: string | null;
  displayName: string | null;
  pendingEmail: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string; needsVerify?: boolean }>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error?: string; needsVerify?: boolean }>;
  verifyOtp: (code: string) => Promise<{ error?: string }>;
  resendOtp: () => Promise<{ error?: string }>;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingPurpose, setPendingPurpose] = useState<'signup' | 'login'>('signup');

  const applyUser = useCallback((s: Session | null) => {
    setSession(s);
    if (!s?.user) {
      setStatus('signedOut');
      return;
    }
    const onboarded =
      typeof s.user.user_metadata?.onboarded === 'boolean'
        ? (s.user.user_metadata.onboarded as boolean)
        : false;
    setStatus(onboarded ? 'signedIn' : 'onboarding');
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      applyUser(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      applyUser(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applyUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const clean = email.trim().toLowerCase();
    const res = await mobileAuth.signIn(clean, password);
    if (res.ok) {
      // Session already established via supabase-js on the API side?
      // Mobile signs in directly for confirmed users:
      const { error } = await supabase.auth.signInWithPassword({
        email: clean,
        password,
      });
      if (!error) return {};
      const msg = error.message ?? '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setPendingEmail(clean);
        setPendingPurpose('login');
        const otp = await mobileAuth.resendOtp(clean, 'login');
        return { needsVerify: true, error: otp.error };
      }
      return { error: msg || 'Sign in failed' };
    }
    if ((res.data as { needsVerify?: boolean } | undefined)?.needsVerify) {
      setPendingEmail(clean);
      setPendingPurpose('login');
      return { needsVerify: true };
    }
    // Fallback: try direct Supabase password login
    const { error } = await supabase.auth.signInWithPassword({
      email: clean,
      password,
    });
    if (!error) return {};
    const msg = error.message ?? '';
    if (msg.toLowerCase().includes('email not confirmed')) {
      setPendingEmail(clean);
      setPendingPurpose('login');
      await mobileAuth.resendOtp(clean, 'login');
      return { needsVerify: true };
    }
    return { error: res.error || msg || 'Sign in failed' };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const clean = email.trim().toLowerCase();
      const res = await mobileAuth.signup(clean, password, displayName);
      if (res.ok) {
        setPendingEmail(clean);
        setPendingPurpose('signup');
        return { needsVerify: true };
      }
      return { error: res.error };
    },
    []
  );

  const verifyOtp = useCallback(
    async (code: string) => {
      if (!pendingEmail) return { error: 'No pending verification' };
      const res = await mobileAuth.verifyOtp(pendingEmail, code, pendingPurpose);
      if (!res.ok) return { error: res.error };

      // After verify, sign in with password (stashed by caller flow)
      // Caller stores password briefly; here we re-read from secure path:
      // For v1 we sign in if we still have password in memory via event.
      const pw = (globalThis as { __turna_pending_password?: string })
        .__turna_pending_password;
      if (pw) {
        const { error } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password: pw,
        });
        delete (globalThis as { __turna_pending_password?: string })
          .__turna_pending_password;
        if (error) return { error: error.message };
        setPendingEmail(null);
        return {};
      }
      return { error: 'Sign in with your password to continue' };
    },
    [pendingEmail, pendingPurpose]
  );

  const resendOtp = useCallback(async () => {
    if (!pendingEmail) return { error: 'No pending verification' };
    const res = await mobileAuth.resendOtp(pendingEmail, pendingPurpose);
    return res.ok ? {} : { error: res.error };
  }, [pendingEmail, pendingPurpose]);

  const completeOnboarding = useCallback(async () => {
    try {
      await supabase.auth.updateUser({ data: { onboarded: true } });
      const { data } = await supabase.auth.getSession();
      applyUser(data.session);
    } catch {
      setStatus('signedIn');
    }
  }, [applyUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setPendingEmail(null);
    setStatus('signedOut');
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    applyUser(data.session);
  }, [applyUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      email: session?.user?.email ?? pendingEmail,
      displayName:
        (session?.user?.user_metadata?.display_name as string | undefined) ??
        session?.user?.email?.split('@')[0] ??
        null,
      pendingEmail,
      signIn,
      signUp,
      verifyOtp,
      resendOtp,
      completeOnboarding,
      signOut,
      refresh,
    }),
    [
      status,
      session,
      pendingEmail,
      signIn,
      signUp,
      verifyOtp,
      resendOtp,
      completeOnboarding,
      signOut,
      refresh,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
