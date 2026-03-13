import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "puppeteer", "puppeteer-core"],
};

export default nextConfig;
