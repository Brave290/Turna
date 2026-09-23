'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Mail } from 'lucide-react';
import { acceptInvitation, type AcceptInviteState } from '@/lib/auth-actions';
import { Logo } from '@/components/logo';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/components/toast';

function AcceptButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Accepting...
        </>
      ) : (
        'Accept invitation'
      )}
    </button>
  );
}

function JoinCircleInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const toast = useToast();
  const [state, formAction] = useFormState(
    acceptInvitation,
    null as AcceptInviteState
  );
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.success) {
      toast.success(state.success);
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast]);

  if (!token) {
    return (
      <Shell>
        <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Invalid link
        </h1>
        <p className="text-white/55 text-sm mb-8">
          This invitation link is missing a token. Ask the circle owner to
          resend the invite.
        </p>
        <Link href="/auth/login" className="btn-primary w-full inline-flex">
          Go to sign in
        </Link>
      </Shell>
    );
  }

  if (state?.success && state.circleId) {
    return (
      <Shell>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
        >
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          You&apos;re in!
        </h1>
        <p className="text-white/55 text-sm mb-8">{state.success}</p>
        <Link
          href={`/dashboard/circles/${state.circleId}`}
          className="btn-primary w-full inline-flex"
        >
          View circle
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex justify-center mb-4">
        <Logo variant="on-dark" size={48} />
      </div>
      <h1 className="font-display text-3xl font-bold text-white mb-2">
        Join a savings circle
      </h1>
      <p className="text-white/55 text-sm mb-8 leading-relaxed">
        You&apos;ve been invited to join a Turna circle. Sign in with the email
        that received this invitation to accept.
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6 flex items-start gap-3">
        <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-white/70 leading-relaxed">
          Make sure you&apos;re signed in with the invited email address. If
          you don&apos;t have an account yet, create one first — then come back
          to this link.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <AcceptButton />
      </form>

      <AnimatePresence>
        {state?.error?.form?.[0] && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-error text-center mt-4"
            role="alert"
          >
            {state.error.form[0]}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-6 space-y-3 text-center">
        <p className="text-sm text-white/50">
          Need an account?{' '}
          <Link
            href={`/auth/signup?redirect=${encodeURIComponent(`/circles/join?token=${token}`)}`}
            className="text-primary hover:text-primary-light font-medium"
          >
            Create one
          </Link>
        </p>
        <p className="text-sm text-white/50">
          Already a member?{' '}
          <Link
            href={`/auth/login?redirect=${encodeURIComponent(`/circles/join?token=${token}`)}`}
            className="text-primary hover:text-primary-light font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-forest text-white flex flex-col app-bg">
      <header className="px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <Logo variant="on-dark" size={24} />
          <span className="font-display text-lg font-bold tracking-tight">
            Turna
          </span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md text-center"
        >
          {children}
        </motion.div>
      </main>
      <footer className="px-6 py-5 text-center text-sm text-white/30">
        &copy; {new Date().getFullYear()} Turna. All rights reserved.
      </footer>
    </div>
  );
}

export default function JoinCirclePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-forest flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <JoinCircleInner />
    </Suspense>
  );
}
