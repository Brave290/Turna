'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ShieldCheck,
  Landmark,
  Sparkles,
  ArrowRight,
  CreditCard,
} from 'lucide-react';
import { Logo } from '@/components/logo';

const SLIDES = [
  {
    key: 'circles',
    title: 'Save together',
    body: 'Create or join a savings circle. Everyone contributes on schedule, everyone knows the plan.',
    icon: Users,
    accent: 'text-primary',
    bg: 'from-primary/20 via-primary/5 to-transparent',
  },
  {
    key: 'pay',
    title: 'Pay in seconds',
    body: 'Card or bank transfer via Paystack. Fees and network charges are transparent before you confirm.',
    icon: CreditCard,
    accent: 'text-violet',
    bg: 'from-violet/20 via-violet/5 to-transparent',
  },
  {
    key: 'privacy',
    title: 'Private by design',
    body: 'Members see masked identities. Only the circle admin sees full details and the payment ledger.',
    icon: ShieldCheck,
    accent: 'text-sky',
    bg: 'from-sky/20 via-sky/5 to-transparent',
  },
  {
    key: 'payout',
    title: 'Payouts on autopilot',
    body: 'Save your bank account once — verified with Paystack Resolve. When it is your turn, the pot ships to you.',
    icon: Landmark,
    accent: 'text-primary',
    bg: 'from-primary/20 via-sky/5 to-transparent',
  },
];

/**
 * First-run onboarding — branded motion slides (Blender-style gradient orbs).
 * Completes by setting user_metadata.onboarded = true then → dashboard.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [exiting, setExiting] = useState(false);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  // Prefetch next route for instant handoff
  useEffect(() => {
    void import('next/navigation');
  }, []);

  async function next() {
    if (busy) return;
    if (!last) {
      setI((v) => v + 1);
      return;
    }
    setBusy(true);
    setExiting(true);
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { onboarded: true },
      });
    } catch {
      /* still continue — layout re-checks */
    }
    setTimeout(() => {
      router.replace('/dashboard');
      router.refresh();
    }, 380);
  }

  function skip() {
    setBusy(true);
    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase');
        const s = createClient();
        await s.auth.updateUser({ data: { onboarded: true } });
      } catch {
        /* ignore */
      }
      router.replace('/dashboard');
      router.refresh();
    })();
  }

  const Icon = slide.icon;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-forest flex flex-col">
      {/* Blender-style floating gradient orbs (pure CSS, GPU-friendly) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute w-[420px] h-[420px] rounded-full blur-[80px] opacity-40"
          style={{
            background:
              'radial-gradient(circle, #00C2A8 0%, transparent 70%)',
            top: '-8%',
            right: '-12%',
          }}
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[360px] h-[360px] rounded-full blur-[80px] opacity-30"
          style={{
            background:
              'radial-gradient(circle, #7C5CFF 0%, transparent 70%)',
            bottom: '10%',
            left: '-15%',
          }}
          animate={{ x: [0, -25, 0], y: [0, -15, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[280px] h-[280px] rounded-full blur-[70px] opacity-25"
          style={{
            background:
              'radial-gradient(circle, #38BDF8 0%, transparent 70%)',
            top: '45%',
            left: '40%',
          }}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Progress */}
      <div className="relative z-10 px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors">
          <Logo variant="on-dark" size={28} />
          <span className="font-display font-bold tracking-tight">Turna</span>
        </Link>
        <button
          type="button"
          onClick={skip}
          className="text-sm text-white/70 hover:text-white transition-colors"
          disabled={busy}
        >
          Skip
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="flex gap-2 mb-10">
          {SLIDES.map((s, idx) => (
            <span
              key={s.key}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === i ? 'w-8 bg-primary' : 'w-3 bg-white/20'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.key}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
            className="text-center max-w-md"
          >
            <div
              className={`w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-gradient-to-br ${slide.bg} border border-white/10`}
            >
              <Icon className={`w-11 h-11 ${slide.accent}`} strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
              {slide.title}
            </h1>
            <p className="text-white/65 leading-relaxed text-[15px]">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>

        <motion.div
          className="mt-10 w-full max-w-xs"
          animate={exiting ? { opacity: 0, scale: 1.08 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <button
            type="button"
            onClick={next}
            disabled={busy}
            className="btn-primary w-full justify-center"
          >
            {busy ? 'Opening…' : last ? 'Get started' : 'Continue'}
            {!busy && <ArrowRight className="w-4 h-4" />}
          </button>
          {!last && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => setI((v) => Math.min(v + 1, SLIDES.length - 1))}
                className="inline-flex items-center gap-1.5 text-xs text-white/65 hover:text-white/70 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Show me everything
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
