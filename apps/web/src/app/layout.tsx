import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://turnaapp.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Turna — Save Together. Grow Together.",
    template: "%s | Turna",
  },
  description:
    "Turna is a digital platform for managing Ajo, Esusu, and Susu savings circles. Create circles, invite members, track contributions, and grow together.",
  keywords: [
    "ajo",
    "esusu",
    "susu",
    "savings circle",
    "rotating savings",
    "group savings",
    "nigeria savings",
    "african savings",
    "turna",
  ],
  openGraph: {
    title: "Turna — Save Together. Grow Together.",
    description:
      "Manage your Ajo, Esusu, and Susu savings circles with transparency and trust.",
    url: appUrl,
    siteName: "Turna",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Turna — Save Together. Grow Together.",
    description:
      "Manage your Ajo, Esusu, and Susu savings circles with transparency and trust.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [{ url: "/app-icon.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body className="min-h-screen bg-cream font-sans antialiased">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Turna",
              url: appUrl,
              description:
                "Digital platform for managing Ajo, Esusu, and Susu savings circles.",
              applicationCategory: "FinanceApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "NGN",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
