import Link from 'next/link';
import { Logo } from '@/components/logo';

export const metadata = {
  title: 'Terms of Service — Turna',
  description: 'Terms of Service for Turna rotating savings circles.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-forest text-white">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="on-dark" size={32} />
            <span className="font-display text-lg font-bold text-white">Turna</span>
          </Link>
          <Link href="/privacy" className="text-sm text-primary hover:text-primary-light">
            Privacy Policy
          </Link>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight mb-6">Terms of Service</h1>
        <p className="text-sm text-white/50 mb-8">Last updated: September 2026</p>

        <div className="space-y-6 text-white/75 leading-relaxed text-sm">
          <section>
            <h2 className="font-semibold text-white text-base mb-2">1. Agreement</h2>
            <p>
              By creating a Turna account or joining a savings circle, you agree to these Terms
              and our Privacy Policy. If you do not agree, do not use Turna.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">2. The service</h2>
            <p>
              Turna helps groups manage rotating savings circles: contributions, schedules,
              payouts, and records. Turna is a tool — it does not hold or invest your money as a
              bank. Circle funds move between members as defined by circle rules and supported
              payment rails (e.g. Paystack).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">3. Accounts</h2>
            <p>
              You must provide accurate information, keep credentials confidential, and notify us
              of unauthorized use. One person per account. You are responsible for activity under
              your account.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">4. Circle conduct</h2>
            <p>
              Circle owners set rules (amounts, cadence, payout order). Members must contribute on
              time. Fraudulent activity, fake identities, or abuse may result in suspension and
              removal from circles. Disputed contributions are reviewed with records you provide.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">5. Payments</h2>
            <p>
              Contribution and payout processing is handled by third-party payment providers.
              Fees, network charges, and settlement timing are shown before you confirm a payment.
              Failed or reversed payments remain your responsibility to resolve.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">6. Termination</h2>
            <p>
              You may delete your account at any time from Settings. We may suspend or terminate
              accounts that violate these Terms, applicable law, or threaten other members.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">7. Disclaimers</h2>
            <p>
              Turna is provided “as is” without warranties of any kind. We do not guarantee
              uninterrupted service. To the maximum extent permitted by law, liability is limited
              to amounts you paid to Turna in the prior 12 months.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white text-base mb-2">8. Contact</h2>
            <p>
              Questions: <a href="mailto:support.turna@gmail.com" className="text-primary hover:text-primary-light">support.turna@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
