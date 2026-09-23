import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PageEnter } from "@/components/page-enter";

export const metadata: Metadata = {
  title: "Legal",
};

const LEGAL_PAGES = [
  {
    slug: "terms",
    title: "Terms of Service",
    description: "The agreement between you and Turna when you use our platform.",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: "How we collect, use, and protect your personal data.",
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    description: "How we use cookies and similar technologies.",
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    description: "What you can and cannot do on Turna.",
  },
  {
    slug: "refund",
    title: "Refund Policy",
    description: "How refunds and corrections are handled.",
  },
  {
    slug: "contact",
    title: "Contact & Support",
    description: "How to reach us with questions or concerns.",
  },
];

export default function LegalIndexPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-forest">
            <Logo variant="primary" size={28} />
            <span className="font-display text-lg font-bold tracking-tight">
              Turna
            </span>
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-forest transition-colors">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <PageEnter>
          <h1 className="font-display text-4xl font-bold tracking-tight text-forest mb-2">
            Legal
          </h1>
          <p className="text-muted mb-10">
            Policies and terms that govern your use of Turna.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {LEGAL_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/legal/${page.slug}`}
                className="card hover:shadow-card hover:border-primary/30 transition-all group"
              >
                <h2 className="font-semibold text-forest group-hover:text-primary transition-colors">
                  {page.title}
                </h2>
                <p className="text-sm text-muted mt-1">{page.description}</p>
              </Link>
            ))}
          </div>
        </PageEnter>
      </main>

      <footer className="border-t border-border/60 py-6 mt-12">
        <p className="text-center text-sm text-muted">
          &copy; {new Date().getFullYear()} Turna by Brave hx Technology. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
