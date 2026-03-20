// app\layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import PWARegistration from "./components/PWARegistration";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SUPPORT_EMAIL } from "./lib/siteConfig";
import { getSiteUrl } from "./lib/siteUrl";

const siteUrl = getSiteUrl();

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: siteUrl,
  logo: `${siteUrl}${DEFAULT_OG_IMAGE}`,
  description: SITE_DESCRIPTION,
  email: SUPPORT_EMAIL,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "GSTECHKH",
    "digital products",
    "AI tools",
    "online courses",
    "marketplace",
    "support",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: DEFAULT_OG_IMAGE,
    shortcut: DEFAULT_OG_IMAGE,
    apple: DEFAULT_OG_IMAGE,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <PWARegistration />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  );
}
