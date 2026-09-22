import Link from "next/link";

function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M16 8c-4.418 0-8 3.582-8 8s3.582 8 8 8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M20 4.9A12 12 0 0 1 27.1 16H16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-cream/80 backdrop-blur-md border-b border-border">
      <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-forest">
          <Logo className="w-7 h-7 text-primary" />
          <span className="text-xl font-bold tracking-tight">Turna</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
          <a href="#features" className="hover:text-forest transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-forest transition-colors">
            How it works
          </a>
          <a href="#savings" className="hover:text-forest transition-colors">
            Savings
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="btn-ghost text-sm hidden sm:inline-flex"
          >
            Sign in
          </Link>
          <Link href="/auth/signup" className="btn-primary btn-sm">
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-forest text-white">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 pt-36 pb-24 md:pt-44 md:pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-primary-light mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-light animate-pulse" />
            Built for Ajo, Esusu &amp; Susu circles
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Save together.
            <br />
            <span className="text-primary-light">Grow together.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-xl mb-10 leading-relaxed">
            The modern way to manage your savings circle. Invite members,
            track contributions, and know exactly what&apos;s happening — with
            full transparency.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/auth/signup"
              className="btn bg-primary text-white hover:bg-primary-hover rounded-xl px-8 py-4 text-base font-semibold"
            >
              Start your circle
            </Link>
            <a
              href="#how-it-works"
              className="btn border border-white/15 text-white hover:bg-white/5 rounded-xl px-8 py-4 text-base font-semibold"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-10">
          {[
            ["100%", "Transparent"],
            ["2-way", "Confirmation"],
            ["Append-only", "Ledger"],
            ["Email-based", "Invites"],
          ].map(([value, label]) => (
            <div key={label}>
              <div className="text-2xl md:text-3xl font-bold text-primary-light">
                {value}
              </div>
              <div className="text-sm text-white/40 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: "Two-party confirmation",
      body: "Every contribution is reported by the member and confirmed by the treasurer. No single person controls the truth.",
      icon: "✓",
    },
    {
      title: "Append-only ledger",
      body: "Every action is recorded permanently. Nothing is deleted, nothing is edited. Full history, always.",
      icon: "≡",
    },
    {
      title: "Email-based invites",
      body: "Invite members by email. No phone numbers, no SMS. Simple, private, and secure.",
      icon: "@",
    },
    {
      title: "Clear payout tracking",
      body: "Know whose turn it is, when it's due, and whether it was received. Disputes are handled fairly.",
      icon: "↻",
    },
    {
      title: "Savings insights",
      body: "See your contribution trends, streaks, and circle health at a glance. Data that helps, not overwhelms.",
      icon: "↗",
    },
    {
      title: "Smart reminders",
      body: "Gentle nudges before contributions are due. Stay on track without the stress.",
      icon: "⏰",
    },
  ];

  return (
    <section id="features" className="py-24 bg-cream">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-forest mt-3 mb-4">
            Everything your circle needs
          </h2>
          <p className="text-muted text-lg">
            Built around the way savings circles actually work — not a generic
            finance app.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card-hover">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-forest mb-2">
                {f.title}
              </h3>
              <p className="text-muted text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["Create your circle", "Set the contribution amount, frequency, and payout order."],
    ["Invite members", "Send email invites. Members join with a single click."],
    ["Report contributions", "Each member reports their payment. The treasurer confirms."],
    ["Track everything", "The ledger records every action. Payouts go to the right person."],
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-forest mt-3 mb-4">
            Four steps to a better circle
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map(([title, body], i) => (
            <div key={title}>
              <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center text-sm font-bold mb-4">
                {i + 1}
              </div>
              <h3 className="text-lg font-semibold text-forest mb-2">
                {title}
              </h3>
              <p className="text-muted text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Savings() {
  return (
    <section id="savings" className="py-24 bg-forest text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-primary-light font-semibold text-sm uppercase tracking-wider">
              Savings
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-6">
              Your circle, your rules
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Turna doesn&apos;t hold your money. It helps your circle
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
                  <span className="text-primary-light mt-0.5">✓</span>
                  <span className="text-white/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-sm text-white/40 mb-1">Total Savings</div>
            <div className="text-4xl font-bold text-primary-light mb-6">
              ₦1,200,000
            </div>
            <div className="space-y-4">
              {[
                ["Family Ajo", "₦60,000 / week", "Active", "10 members"],
                ["Market Traders", "₦25,000 / month", "Active", "8 members"],
                ["Office Susu", "₦15,000 / week", "Paused", "12 members"],
              ].map(([name, amount, status, members]) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                >
                  <div>
                    <div className="font-medium text-white">{name}</div>
                    <div className="text-sm text-white/40">{amount}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`badge ${
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
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 bg-cream">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-forest mb-4">
          Ready to start your circle?
        </h2>
        <p className="text-muted text-lg mb-8 max-w-md mx-auto">
          Join thousands managing their savings the modern way.
        </p>
        <Link
          href="/auth/signup"
          className="btn-primary btn-lg inline-flex"
        >
          Get started — it&apos;s free
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-forest text-white/40 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white">
            <Logo className="w-6 h-6 text-primary" />
            <span className="font-bold">Turna</span>
            <span className="text-white/30 text-sm font-normal ml-2">
              Save Together. Grow Together.
            </span>
          </div>

          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-sm text-center md:text-left">
          <p>© 2025 Turna. Built by Akanji Mus&apos;ab · Brave hx Technology · Founda Technologies</p>
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
