import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PageEnter } from "@/components/page-enter";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we collect, use, and protect your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border/60 bg-white/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-forest">
            <Logo variant="primary" size={28} />
            <span className="font-display text-lg font-bold tracking-tight">Turna</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/legal" className="hover:text-forest transition-colors">All legal</Link>
            <Link href="/" className="hover:text-forest transition-colors">Home</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <PageEnter>
          <p className="text-sm text-muted mb-2">Legal / Privacy Policy</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-forest mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted mb-10">Last updated: September 2026</p>

          <article className="space-y-8">
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">1. Information We Collect</h2>
              <p className="text-muted leading-relaxed">
                Account information: email address, display name, and profile details you provide.
                Circle data: circle names, contribution amounts, member lists, and transaction records.
                Usage data: pages visited, actions taken, device information, and IP address for
                security and service improvement.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">2. How We Use Your Information</h2>
              <p className="text-muted leading-relaxed">
                To provide and maintain the Turna service, send transactional emails, improve the
                service, ensure security, and comply with legal obligations.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">3. Data Sharing</h2>
              <p className="text-muted leading-relaxed">
                We do not sell your personal data. Circle members can see your display name and
                email within shared circles. We use trusted third-party processors under strict
                data processing agreements.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">4. Data Security</h2>
              <p className="text-muted leading-relaxed">
                We implement industry-standard security measures including encryption in transit
                and at rest, access controls, and regular security audits.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">5. Data Retention</h2>
              <p className="text-muted leading-relaxed">
                We retain your data for as long as your account is active. Upon account deletion,
                we remove your personal data within 30 days, except where retention is required by law.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">6. Your Rights</h2>
              <p className="text-muted leading-relaxed">
                You have the right to access, correct, export, and delete your personal data.
                Manage your profile from Settings. For data deletion, contact support.turna@gmail.com.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">7. Contact</h2>
              <p className="text-muted leading-relaxed">
                Privacy questions: support.turna@gmail.com. General support:{" "}
                <Link href="/legal/contact" className="text-primary hover:underline">support.turna@gmail.com</Link>.
              </p>
            </section>
          </article>
        </PageEnter>
      </main>

      <footer className="border-t border-border/60 py-6">
        <p className="text-center text-sm text-muted">
          &copy; {new Date().getFullYear()} Turna by Brave hx Technology. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
