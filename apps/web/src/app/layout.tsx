import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { AppProviders } from '@/components/providers';
import { CookieConsent } from '@/components/cookie-consent';
import { ServiceWorkerRegister } from '@/components/sw-register';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Turna — Save Together. Grow Together.',
    template: '%s | Turna',
  },
  description:
    'Turna is a digital platform for managing Ajo, Esusu, and Susu savings circles. Create circles, invite members, track contributions, and grow together.',
  keywords: [
    'ajo',
    'esusu',
    'susu',
    'savings circle',
    'rotating savings',
    'group savings',
    'nigeria savings',
    'african savings',
    'turna',
  ],
  openGraph: {
    title: 'Turna — Save Together. Grow Together.',
    description:
      'Manage your Ajo, Esusu, and Susu savings circles with transparency and trust.',
    url: appUrl,
    siteName: 'Turna',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Turna — Save Together. Grow Together.',
    description:
      'Manage your Ajo, Esusu, and Susu savings circles with transparency and trust.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/turna-favicon.png', type: 'image/png' },
      { url: '/app-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [{ url: '/app-icon-512.png', sizes: '512x512', type: 'image/png' }],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-cream font-sans antialiased">
        <AppProviders>
          {children}
          <CookieConsent />
          <ServiceWorkerRegister />
        </AppProviders>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Turna',
              url: appUrl,
              description:
                'Digital platform for managing Ajo, Esusu, and Susu savings circles.',
              applicationCategory: 'FinanceApplication',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'NGN',
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
