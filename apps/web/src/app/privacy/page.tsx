import Link from 'next/link';
import { Logo } from '@/components/logo';

export const metadata = {
  title: 'Privacy Policy — Turna',
  description: 'Privacy Policy for Turna rotating savings circles.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-forest text-white">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="on-dark" size={32} />
            <span className="font-display text-lg font-bold text-white">Turna</span>
          </Link>
          <Link href="/terms" className="text-sm text-primary hover:text-primary-light">
            Terms of Service
          </Link>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight mb-6">Privacy Policy</h1>
        <p className="text-sm text-white/70 mb-8">Last updated: September 2026</p>

        <div className="space-y-6 text-white/75 leading-relaxed text-sm">
          <section>
            <h2 className="font-semibold text-white text-base mb-2">1. What we collect</h2>
            <p>
              Account details (name, email, optional profile fields), circle activity you create
              or join, contribution and payout records, and technical data (device, logs) needed
              to run and secure the service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">2. How we use it</h2>
            <p>
              To provide the service: authenticate you, run circles, process contributions and
              payouts, send transactional email (codes, reminders, receipts), prevent fraud, and
              improve the product. We do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">3. What other members see</h2>
            <p>
              In a circle, members may see masked versions of your name and email. Full details
              are not shown. Bank account numbers are never shown to other members.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">4. Sharing</h2>
            <p>
              We share data only with service providers needed to run Turna (hosting and email)
              and when required by law. We do not share your data with payment processors —
              contributions and payouts are arranged directly between members.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">5. Retention</h2>
            <p>
              We keep account and transaction records while your account is active and as needed
              for legal, accounting, and dispute-resolution purposes. You can delete your account
              from Settings.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">6. Security</h2>
            <p>
              We use industry-standard measures (encryption in transit, access controls, rate
              limiting). No system is 100% secure — report concerns to us promptly.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">7. Your rights</h2>
            <p>
              You may access, correct, or delete your data via Settings or by contacting us.
              Depending on your location, you may have additional legal rights.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">8. Contact</h2>
            <p>
              Privacy questions:{' '}
              <a href="mailto:support.turna@gmail.com" className="text-primary hover:text-primary-light">
                support.turna@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
