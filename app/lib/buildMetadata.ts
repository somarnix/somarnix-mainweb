import type { Metadata } from "next";

import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "./siteConfig";
import { getSiteUrl } from "./siteUrl";

export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
}: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  const siteUrl = getSiteUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalPath = normalizedPath === "/" ? "/" : normalizedPath.replace(/\/+$/, "");
  const canonicalUrl = canonicalPath === "/" ? siteUrl : `${siteUrl}${canonicalPath}`;
  const socialTitle = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: socialTitle,
      description,
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
      title: socialTitle,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
