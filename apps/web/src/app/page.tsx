import Link from "next/link";
import { Logo, LogoWordmark } from "@/components/logo";
import { Reveal, AnimatedCounter, Tilt } from "@/components/animated";

/* ─── Icons (SVG only, no emojis) ─── */
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const IconLedger = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 12.75v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);
const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);
const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

/* ─── Nav (glassmorphism) ─── */
function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-4">
        <nav className="flex items-center justify-between h-14 px-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_4px_30px_rgba(3,37,27,0.06)]">
          <Link href="/" className="flex items-center">
            <LogoWordmark variant="default" size={28} />
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-forest/60">
            <a href="#features" className="hover:text-forest transition-colors">Features</a>
            <a href="#how" className="hover:text-forest transition-colors">How it works</a>
            <a href="#savings" className="hover:text-forest transition-colors">Savings</a>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden sm:inline-flex text-[13px] font-medium text-forest/70 hover:text-forest px-3 py-2 rounded-lg hover:bg-forest/5 transition-colors">
              Sign in
            </Link>
            <Link href="/auth/signup" className="bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors">
              Get started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* ─── Phone mockup ─── */
function PhoneMockup() {
  return (
    <div className="relative w-[260px] sm:w-[290px] mx-auto" aria-hidden>
      {/* Glow behind phone */}
      <div className="absolute -inset-8 bg-primary/20 blur-[60px] rounded-full" />

      {/* Phone frame */}
      <div className="relative rounded-[42px] bg-forest p-[10px] shadow-[0_25px_60px_rgba(3,37,27,0.4)] border border-white/10">
        {/* Notch */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-24 h-5 bg-forest rounded-b-2xl z-10" />

        {/* Screen */}
        <div className="rounded-[34px] overflow-hidden bg-cream aspect-[9/19] relative">
          {/* Status bar */}
          <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[10px] text-forest/50 font-medium">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-3 h-1.5 rounded-sm bg-forest/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-forest/30" />
            </div>
          </div>

          {/* App content */}
          <div className="px-4 pt-2 space-y-3">
            {/* Greeting */}
            <div>
              <p className="text-[10px] text-muted">Good morning</p>
              <p className="font-display text-sm font-semibold text-forest">Mus&apos;ab</p>
            </div>

            {/* Balance card */}
            <div className="bg-forest rounded-2xl p-3.5 text-white">
              <p className="text-[9px] text-white/50">Total Savings</p>
              <p className="text-lg font-bold text-primary-light mt-0.5">₦1,200,000</p>
              <div className="flex items-center gap-1 mt-1.5">
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-primary-light"><path d="M6 2l4 5H2z" fill="currentColor"/></svg>
                <span className="text-[9px] text-primary-light">12% this cycle</span>
              </div>
            </div>

            {/* Circle cards */}
            <div className="space-y-2">
              <div className="bg-white rounded-xl p-2.5 border border-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-forest">Family Ajo</p>
                  <p className="text-[8px] text-muted">₦60,000 / week</p>
                </div>
                <span className="text-[7px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Active</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-forest">Market Traders</p>
                  <p className="text-[8px] text-muted">₦25,000 / month</p>
                </div>
                <span className="text-[7px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Active</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-border flex items-center justify-between opacity-60">
                <div>
                  <p className="text-[10px] font-semibold text-forest">Office Susu</p>
                  <p className="text-[8px] text-muted">₦15,000 / week</p>
                </div>
                <span className="text-[7px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-full font-medium">Paused</span>
              </div>
            </div>

            {/* Bottom nav */}
            <div className="absolute bottom-0 inset-x-0 bg-white/80 backdrop-blur-md border-t border-border px-5 py-2 flex justify-around">
              {[
                <path key="h" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
                <path key="c" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
                <path key="l" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
                <path key="p" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
              ].map((d, i) => (
                <svg key={i} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-4 h-4 ${i === 0 ? "text-primary" : "text-muted"}`}>
                  {d}
                </svg>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating glass badge — contribution confirmed */}
      <div className="absolute -left-10 top-1/4 glass-card rounded-xl px-3 py-2 flex items-center gap-2 animate-float">
        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
          <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-forest">Confirmed</p>
          <p className="text-[8px] text-muted">₦60,000</p>
        </div>
      </div>

      {/* Floating glass badge — payout */}
      <div className="absolute -right-8 bottom-1/3 glass-card rounded-xl px-3 py-2 flex items-center gap-2 animate-float-delayed">
        <div className="w-6 h-6 rounded-full bg-forest/10 flex items-center justify-center">
          <svg viewBox="0 0 12 12" className="w-3 h-3 text-forest"><path d="M6 2v8M6 10l-3-3M6 10l3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-forest">Payout sent</p>
          <p className="text-[8px] text-muted">Cycle 4</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-forest text-white pt-32 pb-24 md:pt-40 md:pb-32">
      {/* Radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal type="fade-up" delay={0}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-sm text-primary-light mb-8">
                <svg viewBox="0 0 8 8" className="w-2 h-2"><circle cx="4" cy="4" r="3" fill="currentColor" className="animate-pulse"/></svg>
                Built for Ajo, Esusu and Susu circles
              </div>
            </Reveal>

            <Reveal type="fade-up" delay={100}>
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
                Save together.
                <br />
                <span className="text-primary-light">Grow together.</span>
              </h1>
            </Reveal>

            <Reveal type="fade-up" delay={200}>
              <p className="text-lg md:text-xl text-white/50 max-w-lg mb-10 leading-relaxed">
                The modern way to manage your savings circle. Invite members,
                track contributions, and know exactly what&apos;s happening — with
                full transparency.
              </p>
            </Reveal>

            <Reveal type="fade-up" delay={300}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/signup"
                  className="group bg-primary hover:bg-primary-hover text-white rounded-xl px-8 py-4 text-base font-semibold transition-all inline-flex items-center justify-center gap-2 hover:shadow-[0_8px_30px_rgba(0,168,120,0.35)]"
                >
                  Start your circle
                  <svg viewBox="0 0 16 16" className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <a
                  href="#how"
                  className="border border-white/15 hover:bg-white/5 text-white rounded-xl px-8 py-4 text-base font-semibold transition-colors inline-flex items-center justify-center gap-2 backdrop-blur-sm"
                >
                  See how it works
                </a>
              </div>
            </Reveal>

            {/* Stats */}
            <Reveal type="fade-up" delay={400}>
              <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-8">
                {[
                  { value: 100, suffix: "%", label: "Transparent" },
                  { value: 2, suffix: "-way", label: "Confirmation" },
                  { value: 0, suffix: "", label: "Hidden data", display: "Zero" },
                  { value: 6, suffix: "-digit", label: "Email OTP" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl md:text-3xl font-bold text-primary-light">
                      {s.display || <AnimatedCounter end={s.value} suffix={s.suffix} />}
                    </div>
                    <div className="text-xs text-white/40 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Phone */}
          <Reveal type="scale-in" delay={200} className="flex justify-center lg:justify-end">
            <Tilt max={6}>
              <PhoneMockup />
            </Tilt>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function Features() {
  const features = [
    { title: "Two-party confirmation", body: "Every contribution is reported by the member and confirmed by the treasurer. No single person controls the truth.", icon: <IconShield /> },
    { title: "Append-only ledger", body: "Every action is recorded permanently. Nothing is deleted, nothing is edited. Full history, always.", icon: <IconLedger /> },
    { title: "Email-based invites", body: "Invite members by email. No phone numbers, no SMS. Simple, private, and secure.", icon: <IconMail /> },
    { title: "Clear payout tracking", body: "Know whose turn it is, when it is due, and whether it was received. Disputes are handled fairly.", icon: <IconRefresh /> },
    { title: "Savings insights", body: "See your contribution trends, streaks, and circle health at a glance. Data that helps, not overwhelms.", icon: <IconChart /> },
    { title: "Smart reminders", body: "Gentle nudges before contributions are due. Stay on track without the stress.", icon: <IconBell /> },
  ];

  return (
    <section id="features" className="py-24 bg-cream relative">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal type="fade-up">
          <div className="max-w-2xl mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-widest">
              Features
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-forest mt-3 mb-4">
              Everything your circle needs
            </h2>
            <p className="text-muted text-lg">
              Built around the way savings circles actually work — not a generic
              finance app.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} type="fade-up" delay={i * 80}>
              <Tilt max={5}>
                <div className="glass-card h-full group hover:shadow-[0_8px_40px_rgba(3,37,27,0.08)] transition-shadow">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-forest mb-2">
                    {f.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{f.body}</p>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ─── */
function HowItWorks() {
  const steps = [
    ["Create your circle", "Set the contribution amount, frequency, and payout order."],
    ["Invite members", "Send email invites. Members join with a single click."],
    ["Report contributions", "Each member reports their payment. The treasurer confirms."],
    ["Track everything", "The ledger records every action. Payouts go to the right person."],
  ];

  return (
    <section id="how" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal type="fade-up">
          <div className="max-w-2xl mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-widest">
              How it works
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-forest mt-3 mb-4">
              Four steps to a better circle
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-5 left-[12%] right-[12%] h-px bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

          {steps.map(([title, body], i) => (
            <Reveal key={title} type="fade-up" delay={i * 120} className="relative">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center text-sm font-bold mb-5 relative z-10 ring-4 ring-white">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-forest mb-2">
                  {title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Savings showcase ─── */
function Savings() {
  return (
    <section id="savings" className="py-24 bg-forest text-white relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/8 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <Reveal type="fade-left">
            <span className="text-primary-light font-semibold text-sm uppercase tracking-widest">
              Savings
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 mb-6">
              Your circle, your rules
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8">
              Turna does not hold your money. It helps your circle
              coordinate — who paid, who confirms, whose turn it is. The
              transparency of a shared ledger with the simplicity of a modern
              app.
            </p>
            <ul className="space-y-4">
              {[
                "Set your own contribution amounts and frequency",
                "Choose the payout order that works for your group",
                "Every member sees the same ledger — no hidden numbers",
                "Disputes are recorded and resolved, never deleted",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 shrink-0">
                    <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary-light"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span className="text-white/60">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal type="fade-right" delay={150}>
            <Tilt max={6}>
              <div className="glass-dark rounded-2xl p-8">
                <div className="text-sm text-white/40 mb-1">Total Savings</div>
                <div className="text-5xl font-display font-bold text-primary-light mb-8">
                  ₦<AnimatedCounter end={1200000} />
                </div>
                <div className="space-y-1">
                  {[
                    ["Family Ajo", "₦60,000 / week", "Active", "10 members"],
                    ["Market Traders", "₦25,000 / month", "Active", "8 members"],
                    ["Office Susu", "₦15,000 / week", "Paused", "12 members"],
                  ].map(([name, amount, status, members]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between py-4 border-b border-white/5 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-white">{name}</div>
                        <div className="text-sm text-white/40">{amount}</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            status === "Active"
                              ? "bg-primary/20 text-primary-light"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          {status}
                        </span>
                        <div className="text-xs text-white/30 mt-1">
                          {members}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Tilt>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTA() {
  return (
    <section className="py-24 bg-cream">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <Reveal type="fade-up">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-forest mb-4">
            Ready to start your circle?
          </h2>
          <p className="text-muted text-lg mb-10 max-w-md mx-auto">
            Join thousands managing their savings the modern way.
          </p>
          <Link
            href="/auth/signup"
            className="group inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white rounded-xl px-8 py-4 text-base font-semibold transition-all hover:shadow-[0_8px_30px_rgba(0,168,120,0.35)]"
          >
            Get started — it&apos;s free
            <svg viewBox="0 0 16 16" className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-forest text-white/40 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 text-white">
            <Logo variant="on-dark" size={24} />
            <span className="font-bold">Turna</span>
            <span className="text-white/30 text-sm font-normal ml-2">
              Save Together. Grow Together.
            </span>
          </Link>

          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-sm text-center md:text-left">
          <p>
            &copy; 2025&ndash;{currentYear} Turna. Built by Akanji Mus&apos;ab &middot;{" "}
            <a
              href="https://www.bravehx.online"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-light hover:text-white transition-colors underline underline-offset-2 decoration-primary-light/30"
            >
              Brave hx Technology
            </a>{" "}
            &middot;{" "}
            <a
              href="https://foundatech.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-light hover:text-white transition-colors underline underline-offset-2 decoration-primary-light/30"
            >
              Founda Technologies
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Savings />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
