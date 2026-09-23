import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PageEnter } from "@/components/page-enter";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The agreement between you and Turna when you use our platform.",
};

export default function TermsPage() {
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
          <p className="text-sm text-muted mb-2">Legal / Terms of Service</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-forest mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-muted mb-10">Last updated: September 2026</p>

          <article className="space-y-8">
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">1. Agreement to Terms</h2>
              <p className="text-muted leading-relaxed">
                By accessing or using Turna, you agree to be bound by these Terms of Service.
                If you do not agree, do not use the service. Turna is operated by Brave hx Technology.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">2. Description of Service</h2>
              <p className="text-muted leading-relaxed">
                Turna is a coordination platform for community savings circles (Ajo, Esusu, Susu).
                Turna records contributions, tracks payouts, and provides transparency tools.
                Turna does not hold, custody, or transfer funds. All money movement occurs
                directly between circle members outside the platform.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">3. Account Registration</h2>
              <p className="text-muted leading-relaxed">
                You must provide accurate information when creating an account. You are responsible
                for maintaining the confidentiality of your credentials. You must be at least 18
                years old to use Turna.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">4. User Responsibilities</h2>
              <p className="text-muted leading-relaxed">
                You agree to use Turna only for lawful purposes. You are solely responsible for
                contributions you make and promises you make to other circle members. You must not
                manipulate contribution records, submit false information, or attempt unauthorized
                access to other accounts.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">5. Circle Operations</h2>
              <p className="text-muted leading-relaxed">
                Circle owners are responsible for managing their circles. All members are expected
                to contribute on time and confirm transactions honestly. Failure to do so may
                result in removal from a circle.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">6. Limitation of Liability</h2>
              <p className="text-muted leading-relaxed">
                Turna provides coordination tools only. We are not a financial institution. To the
                maximum extent permitted by law, Turna shall not be liable for any indirect,
                incidental, special, or consequential damages arising from your use of the service.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">7. Termination</h2>
              <p className="text-muted leading-relaxed">
                We may suspend or terminate your account for violation of these Terms. You may
                delete your account at any time from Settings.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">8. Changes to These Terms</h2>
              <p className="text-muted leading-relaxed">
                We may update these Terms from time to time. Material changes will be communicated
                via email or in-app notification. Continued use after changes constitutes acceptance.
              </p>
            </section>
            <section>
              <h2 className="font-display text-xl font-bold text-forest mb-3">9. Contact</h2>
              <p className="text-muted leading-relaxed">
                Questions? Contact us at{" "}
                <Link href="/legal/contact" className="text-primary hover:underline">support@turna.app</Link>.
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
