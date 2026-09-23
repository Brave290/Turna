import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { PageEnter } from "@/components/page-enter";

export const metadata: Metadata = {
  title: "Legal",
};

const LEGAL_SLUGS = [
  "terms",
  "privacy",
  "cookies",
  "acceptable-use",
  "refund",
  "contact",
] as const;

type LegalSlug = (typeof LEGAL_SLUGS)[number];

function getLegalPage(slug: LegalSlug): {
  title: string;
  updated: string;
  sections: Array<{ heading: string; body: string[] }>;
} | null {
  const pages: Record<LegalSlug, { title: string; updated: string; sections: Array<{ heading: string; body: string[] }> }> = {
    terms: {
      title: "Terms of Service",
      updated: "September 2026",
      sections: [
        {
          heading: "1. Agreement to Terms",
          body: [
            "By accessing or using Turna, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.",
            "Turna is operated by Brave hx Technology. These terms constitute a legally binding agreement between you and Brave hx Technology.",
          ],
        },
        {
          heading: "2. Description of Service",
          body: [
            "Turna is a coordination platform for community savings circles (Ajo, Esusu, Susu). Turna records contributions, tracks payouts, and provides transparency tools for circle members.",
            "Turna does not hold, custody, or transfer funds. All money movement occurs directly between circle members outside the platform.",
          ],
        },
        {
          heading: "3. Account Registration",
          body: [
            "You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials.",
            "You must be at least 18 years old to use Turna. By registering, you confirm that you meet this age requirement.",
          ],
        },
        {
          heading: "4. User Responsibilities",
          body: [
            "You agree to use Turna only for lawful purposes and in accordance with these Terms.",
            "You are solely responsible for contributions you make and promises you make to other circle members.",
            "You must not manipulate contribution records, submit false information, or attempt to gain unauthorized access to other users' accounts.",
          ],
        },
        {
          heading: "5. Circle Operations",
          body: [
            "Circle owners are responsible for managing their circles, including inviting members, setting contribution amounts, and confirming contributions.",
            "All circle members are expected to contribute on time and confirm transactions honestly. Failure to do so may result in removal from a circle.",
          ],
        },
        {
          heading: "6. Limitation of Liability",
          body: [
            "Turna provides coordination tools only. We are not a financial institution and do not provide financial services.",
            "To the maximum extent permitted by law, Turna shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.",
          ],
        },
        {
          heading: "7. Termination",
          body: [
            "We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.",
            "You may delete your account at any time from your Settings page.",
          ],
        },
        {
          heading: "8. Changes to These Terms",
          body: [
            "We may update these Terms from time to time. Material changes will be communicated via email or in-app notification. Continued use after changes constitutes acceptance.",
          ],
        },
        {
          heading: "9. Contact",
          body: [
            "Questions about these Terms? Contact us at support.turna@gmail.com or through our support channels.",
          ],
        },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      updated: "September 2026",
      sections: [
        {
          heading: "1. Information We Collect",
          body: [
            "Account information: email address, display name, and profile details you provide.",
            "Circle data: circle names, contribution amounts, member lists, and transaction records you create or participate in.",
            "Usage data: pages visited, actions taken, device information, and IP address for security and service improvement.",
          ],
        },
        {
          heading: "2. How We Use Your Information",
          body: [
            "To provide and maintain the Turna service, including circle management, contribution tracking, and notifications.",
            "To send transactional emails (invitations, OTP verification, password resets).",
            "To improve the service, analyze usage patterns, and ensure security.",
            "To comply with legal obligations and enforce our Terms of Service.",
          ],
        },
        {
          heading: "3. Data Sharing",
          body: [
            "We do not sell your personal data to third parties.",
            "Circle members can see your display name and email within shared circles.",
            "We use trusted third-party processors (Supabase for data hosting, email providers for transactional email) under strict data processing agreements.",
          ],
        },
        {
          heading: "4. Data Security",
          body: [
            "We implement industry-standard security measures including encryption in transit (TLS) and at rest, access controls, and regular security audits.",
            "Access to user data is restricted to authorized personnel who need it to operate the service.",
          ],
        },
        {
          heading: "5. Data Retention",
          body: [
            "We retain your data for as long as your account is active or as needed to provide the service.",
            "Upon account deletion, we remove your personal data within 30 days, except where retention is required by law.",
          ],
        },
        {
          heading: "6. Your Rights",
          body: [
            "You have the right to access, correct, export, and delete your personal data.",
            "You can manage your profile information from the Settings page.",
            "To request data deletion, contact support.turna@gmail.com.",
          ],
        },
        {
          heading: "7. Cookies",
          body: [
            "We use essential cookies for authentication and session management. See our Cookie Policy for details.",
          ],
        },
        {
          heading: "8. Changes to This Policy",
          body: [
            "We may update this Privacy Policy from time to time. Material changes will be communicated to you.",
          ],
        },
        {
          heading: "9. Contact",
          body: [
            "Privacy questions: support.turna@gmail.com. General support: support.turna@gmail.com.",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookie Policy",
      updated: "September 2026",
      sections: [
        {
          heading: "What Are Cookies",
          body: [
            "Cookies are small text files stored on your device when you visit a website. They help the website remember your actions and preferences over time.",
          ],
        },
        {
          heading: "How We Use Cookies",
          body: [
            "Essential cookies: required for authentication, session management, and core functionality. The service cannot work without these.",
            "Preference cookies: remember your settings such as language and theme choices.",
            "Analytics cookies: help us understand how the service is used so we can improve it.",
          ],
        },
        {
          heading: "Managing Cookies",
          body: [
            "You can control and delete cookies through your browser settings. Disabling essential cookies may prevent you from using Turna.",
          ],
        },
      ],
    },
    "acceptable-use": {
      title: "Acceptable Use Policy",
      updated: "September 2026",
      sections: [
        {
          heading: "Prohibited Activities",
          body: [
            "Using Turna for any fraudulent, deceptive, or misleading purpose.",
            "Submitting false contribution records or manipulating circle data.",
            "Harassing, threatening, or abusing other users.",
            "Attempting to gain unauthorized access to other accounts or the Turna infrastructure.",
            "Using the service for any illegal purpose or in violation of applicable laws.",
            "Scraping, reverse engineering, or abusing API endpoints.",
          ],
        },
        {
          heading: "Enforcement",
          body: [
            "Violation of this policy may result in suspension or termination of your account, removal from circles, and where applicable, referral to law enforcement.",
          ],
        },
      ],
    },
    refund: {
      title: "Refund Policy",
      updated: "September 2026",
      sections: [
        {
          heading: "Turna Does Not Process Payments",
          body: [
            "Turna is a coordination platform. All money movement between circle members happens outside Turna. We do not hold or process funds.",
          ],
        },
        {
          heading: "Corrections and Disputes",
          body: [
            "If a contribution is recorded incorrectly, circle members can flag it and the circle owner can correct the record.",
            "For disputes between members, we recommend resolving them within the circle. Turna provides a transparent ledger to support fair resolution.",
          ],
        },
        {
          heading: "Subscription Fees",
          body: [
            "Turna is currently free to use. If paid features are introduced in the future, this policy will be updated accordingly with advance notice.",
          ],
        },
      ],
    },
    contact: {
      title: "Contact & Support",
      updated: "September 2026",
      sections: [
        {
          heading: "General Support",
          body: [
            "Email: support.turna@gmail.com",
            "Response time: within 1-2 business days.",
          ],
        },
        {
          heading: "Privacy Requests",
          body: [
            "Email: support.turna@gmail.com for data access, correction, or deletion requests.",
          ],
        },
        {
          heading: "Legal",
          body: [
            "Email: support.turna@gmail.com for legal notices and formal communications.",
          ],
        },
        {
          heading: "Company",
          body: [
            "Turna is operated by Brave hx Technology.",
            "Website: https://www.bravehx.online",
          ],
        },
      ],
    },
  };

  return pages[slug] ?? null;
}

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  if (!LEGAL_SLUGS.includes(params.slug as LegalSlug)) {
    notFound();
  }

  const page = getLegalPage(params.slug as LegalSlug);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border/60 bg-white/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-forest">
            <Logo variant="primary" size={28} />
            <span className="font-display text-lg font-bold tracking-tight">
              Turna
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/legal" className="hover:text-forest transition-colors">
              All legal
            </Link>
            <Link href="/" className="hover:text-forest transition-colors">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <PageEnter>
          <p className="text-sm text-muted mb-2">Legal / {page.title}</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-forest mb-2">
            {page.title}
          </h1>
          <p className="text-sm text-muted mb-10">Last updated: {page.updated}</p>

          <article className="space-y-8">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-xl font-bold text-forest mb-3">
                  {section.heading}
                </h2>
                <div className="space-y-3">
                  {section.body.map((para, i) => (
                    <p key={i} className="text-muted leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </article>

          <div className="mt-12 pt-8 border-t border-border/60">
            <p className="text-sm text-muted">
              Questions?{" "}
              <Link href="/legal/contact" className="text-primary hover:underline font-medium">
                Contact us
              </Link>
              .
            </p>
          </div>
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
