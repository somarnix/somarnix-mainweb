// app\layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import PWARegistration from "./components/PWARegistration";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

export const metadata: Metadata = {
  applicationName: "Edugroit",
  title: "Edugroit",
  description: "Edugroit marketplace and learning platform.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Edugroit",
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
    <html lang="en">
      <body>
        <PWARegistration />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  );
}
