import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const APP_NAME = 'Turna';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://turna.name.ng';

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Your turn to collect`,
    template: `%s | ${APP_NAME}`,
  },
  description: 'Turna brings esusu, ajo, and chama into one simple app. Track contributions, know your payout date, and build real trust in your savings circle.',
  metadataBase: new URL(APP_URL),
  keywords: [
    'savings circle', 'esusu', 'ajo', 'chama', 'rotating savings',
    'community finance', 'Nigeria', 'Ghana', 'Kenya', 'West Africa',
    'digital savings', 'group savings', 'tontine', 'pooling money',
  ],
  authors: [{ name: "Akanji Mus'ab" }],
  creator: 'Akanji Musab | Brave Hx Technology | Founda Technologies',
  publisher: 'Turna',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Your turn to collect`,
    description: 'Track contributions, know your payout date, and build real trust in your savings circle.',
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — Savings Circles`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Your turn to collect`,
    description: 'Track contributions, know your payout date, and build real trust in your savings circle.',
    images: [`${APP_URL}/og-image.png`],
    creator: '@turna_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: `${APP_URL}/manifest.json`,
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="canonical" href={APP_URL} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: APP_NAME,
              url: APP_URL,
              description: 'Track contributions, know your payout date, and build real trust in your savings circle.',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Web, iOS, Android',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'NGN',
              },
              author: {
                '@type': 'Organization',
                name: 'Brave Hx Technology',
              },
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}