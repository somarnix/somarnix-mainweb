import type { MetadataRoute } from "next";

import { getSiteUrl } from "./lib/siteUrl";

const STATIC_PATHS = [
  "/",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
  "/refund-policy",
  "/copyright",
  "/support",
  "/ai",
  "/programs",
  "/games",
  "/tools",
  "/courses",
  "/blog",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return STATIC_PATHS.map((path) => ({
    url: path === "/" ? siteUrl : `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
