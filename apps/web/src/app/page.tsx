import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { Reveal, AnimatedCounter, Tilt } from "@/components/animated";
import { ThemeToggle } from "@/components/theme-toggle";

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
        <nav className="flex items-center justify-between h-14 px-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-glass">
          <Link href="/" className="flex items-center">
            <Image
              src="/turna-favicon.png"
              alt="Turna"
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-lg object-cover"
            />
            <span className="ml-2 font-display text-xl font-bold tracking-tight text-forest">Turna</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-forest/60">
            <a href="#features" className="hover:text-forest transition-colors">Features</a>
            <a href="#how" className="hover:text-forest transition-colors">How it works</a>
            <a href="#savings" className="hover:text-forest transition-colors">Savings</a>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/auth/login" className="hidden sm:inline-flex text-[13px] font-medium text-forest/70 hover:text-forest px-3 py-2 rounded-lg hover:bg-forest/5 transition-colors">
              Sign in
            </Link>
            <Link href="/auth/signup" className="bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-glow">
              Get started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* ─── Phone mockup (illustrative UI chrome — not user metrics) ─── */
function PhoneMockup() {
  return (
    <div className="relative w-[260px] sm:w-[290px] mx-auto" aria-hidden>
      <div className="absolute -inset-8 bg-primary/20 blur-[60px] rounded-full" />

      <div className="relative rounded-[42px] bg-forest p-[10px] shadow-[0_25px_60px_rgba(10,22,40,0.4)] border border-white/10">
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-24 h-5 bg-forest rounded-b-2xl z-10" />

        <div className="rounded-[34px] overflow-hidden bg-cream aspect-[9/19] relative">
          <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[10px] text-forest/50 font-medium">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-3 h-1.5 rounded-sm bg-forest/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-forest/30" />
            </div>
          </div>

          <div className="px-4 pt-2 space-y-3">
            <div>
              <p className="text-[10px] text-muted">Your circles</p>
              <p className="font-display text-sm font-semibold text-forest">Overview</p>
            </div>

            <div className="bg-forest rounded-2xl p-3.5 text-white">
              <p className="text-[9px] text-white/50">Circle activity</p>
              <p className="text-lg font-bold text-primary-light mt-0.5">On track</p>
              <div className="flex items-center gap-1 mt-1.5">
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-primary-light"><path d="M6 2l4 5H2z" fill="currentColor"/></svg>
                <span className="text-[9px] text-primary-light">Members confirmed</span>
              </div>
            </div>

            <div className="space-y-2">
              {[
                ["Weekly circle", "Members confirmed"],
                ["Monthly circle", "Awaiting reports"],
                ["Family circle", "Payout scheduled"],
              ].map(([name, meta], i) => (
                <div
                  key={name}
                  className={`bg-white rounded-xl p-2.5 border border-border flex items-center justify-between ${i === 2 ? "opacity-60" : ""}`}
                >
                  <div>
                    <p className="text-[10px] font-semibold text-forest">{name}</p>
                    <p className="text-[8px] text-muted">{meta}</p>
                  </div>
                  <span
                    className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium ${
                      i === 0
                        ? "bg-primary/10 text-primary"
                        : i === 1
                          ? "bg-warning/10 text-warning"
                          : "bg-forest/10 text-forest"
                    }`}
                  >
                    {i === 0 ? "Active" : i === 1 ? "Pending" : "Ready"}
                  </span>
                </div>
              ))}
            </div>

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

      <div className="absolute -left-10 top-1/4 glass-card rounded-xl px-3 py-2 flex items-center gap-2 animate-float">
        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
          <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-forest">Confirmed</p>
          <p className="text-[8px] text-muted">Member report</p>
        </div>
      </div>

      <div className="absolute -right-8 bottom-1/3 glass-card rounded-xl px-3 py-2 flex items-center gap-2 animate-float-delayed">
        <div className="w-6 h-6 rounded-full bg-forest/10 flex items-center justify-center">
          <svg viewBox="0 0 12 12" className="w-3 h-3 text-forest"><path d="M6 2v8M6 10l-3-3M6 10l3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-forest">Payout logged</p>
          <p className="text-[8px] text-muted">Ledger entry</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-forest text-white pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
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
                Manage your savings circle in one place. Invite members, track
                every contribution, and always know whose turn it is — with a
                shared ledger everyone can see.
              </p>
            </Reveal>

            <Reveal type="fade-up" delay={300}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/signup"
                  className="group bg-primary hover:bg-primary-hover text-white rounded-xl px-8 py-4 text-base font-semibold transition-all inline-flex items-center justify-center gap-2 hover:shadow-glow"
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

            {/* Product facts — real, not fabricated user counts */}
            <Reveal type="fade-up" delay={400}>
              <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-8">
                {[
                  { value: 0, suffix: "", label: "Fees we take", display: "0" },
                  { value: 2, suffix: "-party", label: "Confirmation" },
                  { value: 6, suffix: "-digit", label: "Email OTP" },
                  { value: 100, suffix: "%", label: "Shared ledger" },
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
    { title: "Two-party confirmation", body: "A member reports a payment. The treasurer confirms it. Two people, one truth — no single person can change the record alone.", icon: <IconShield /> },
    { title: "Append-only ledger", body: "Every action is written once and kept. Nothing is deleted or edited. You can always see what happened.", icon: <IconLedger /> },
    { title: "Email invites", body: "Invite people with their email. No phone numbers. Members join with a link.", icon: <IconMail /> },
    { title: "Clear payout tracking", body: "See whose turn it is, when it is due, and whether it was received. Disputes are recorded, not swept under the rug.", icon: <IconRefresh /> },
    { title: "Savings insights", body: "Contribution trends and circle health in plain numbers. Useful data, not noise.", icon: <IconChart /> },
    { title: "Reminders", body: "A quiet nudge before contributions are due, so nobody has to chase the group chat.", icon: <IconBell /> },
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
              Built around how savings circles actually work — not a generic
              finance app.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} type="fade-up" delay={i * 80}>
              <Tilt max={5}>
                <div className="glass-card h-full group hover:shadow-card-hover transition-shadow">
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
    ["Create your circle", "Set the amount, how often you pay, and the payout order."],
    ["Invite members", "Send an email invite. They join with one click."],
    ["Report contributions", "Each person reports their payment. The treasurer confirms."],
    ["Track everything", "The ledger records every step. Payouts go to the right person."],
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
              Four steps to a clearer circle
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
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
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet/10 blur-[100px] rounded-full pointer-events-none" />

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
              Turna does not hold your money. It helps your circle coordinate —
              who paid, who confirmed, whose turn it is. A shared ledger with
              the simplicity of a modern app.
            </p>
            <ul className="space-y-4">
              {[
                "You set the amounts and the schedule",
                "You choose the payout order that fits your group",
                "Everyone sees the same ledger — no hidden numbers",
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
                <div className="text-sm text-white/40 mb-1">How confirmation works</div>
                <div className="text-2xl font-display font-bold text-primary-light mb-6">
                  Report → Confirm → Record
                </div>
                <div className="space-y-1">
                  {[
                    ["Member reports", "Payment details", "Step 1"],
                    ["Treasurer confirms", "Independent check", "Step 2"],
                    ["Ledger entry", "Written once", "Step 3"],
                  ].map(([name, amount, status]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between py-4 border-b border-white/5 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-white">{name}</div>
                        <div className="text-sm text-white/40">{amount}</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary-light">
                          {status}
                        </span>
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
            Create an account, invite your people, and run your circle with a
            clear record from day one.
          </p>
          <Link
            href="/auth/signup"
            className="group inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white rounded-xl px-8 py-4 text-base font-semibold transition-all hover:shadow-glow"
          >
            Get started — free to use
            <svg viewBox="0 0 16 16" className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Footer — big-company style ─── */
function Footer() {
  const currentYear = new Date().getFullYear();

  const columns: Array<{
    title: string;
    links: Array<{ label: string; href: string; external?: boolean }>;
  }> = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "How it works", href: "#how" },
        { label: "Sign in", href: "/auth/login" },
        { label: "Get started", href: "/auth/signup" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Brave hx Technology", href: "https://www.bravehx.online", external: true },
        { label: "Founda Technologies", href: "https://foundatech.vercel.app", external: true },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" },
      ],
    },
  ];

  return (
    <footer className="bg-forest text-white/50 pt-16 pb-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white mb-4">
              <Logo variant="on-dark" size={28} />
              <span className="font-bold text-lg">Turna</span>
            </Link>
            <p className="text-sm leading-relaxed text-white/40 max-w-xs">
              Savings circles, made clear. Built for Ajo, Esusu, and Susu
              groups who want trust without the group-chat chaos.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-white text-sm font-semibold mb-4">{col.title}</h3>
              <ul className="space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="hover:text-white transition-colors"
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 text-sm">
          <p>
            &copy; {currentYear} Turna. All rights reserved.
          </p>
          <p className="text-white/35">
            Built by Akanji Mus&apos;ab
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Savings />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
