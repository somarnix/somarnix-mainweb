import type { NextConfig } from "next";
import { securityHeaders, getCSPString } from "./lib/security-headers";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "puppeteer", "puppeteer-core"],
  
  // Security Headers - FREE Protection
  headers: async () => [
    {
      source: '/:path*',
      headers: securityHeaders,
    },
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: getCSPString(),
        },
      ],
    },
  ],
  
  // Additional Security Settings
  poweredByHeader: false, // Hide Next.js version
  reactStrictMode: true, // Enable React strict mode for better error detection
};

export default nextConfig;
