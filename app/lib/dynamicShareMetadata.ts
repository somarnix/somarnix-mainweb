import "server-only";

import type { Metadata } from "next";
import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";

import { DEFAULT_OG_IMAGE, SITE_NAME } from "./siteConfig";
import { getSiteUrl } from "./siteUrl";

type ProductShareRow = RowDataPacket & {
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
};

type CourseShareRow = RowDataPacket & {
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  hero_url: string | null;
  author_name: string | null;
};

type ToolShareRow = RowDataPacket & {
  canonical_slug: string;
  display_name: string;
  short_description: string | null;
  image_url: string | null;
};

type BlogShareRow = RowDataPacket & {
  username: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function toAbsoluteImageUrl(raw: string | null | undefined, siteUrl: string) {
  const fallback = `${siteUrl}${DEFAULT_OG_IMAGE}`;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  try {
    return new URL(value.startsWith("/") ? value : `/${value.replace(/^\/+/, "")}`, siteUrl).toString();
  } catch {
    return fallback;
  }
}

function plainText(value: string | null | undefined) {
  return typeof value === "string"
    ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function summarize(value: string | null | undefined, fallback: string) {
  const text = plainText(value) || fallback;
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}...` : text;
}

function buildShareMetadata({
  title,
  description,
  image,
  path,
}: {
  title: string;
  description: string;
  image?: string | null;
  path: string;
}): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalPath = normalizePath(path).replace(/\/+$/, "") || "/";
  const canonicalUrl = canonicalPath === "/" ? siteUrl : `${siteUrl}${canonicalPath}`;
  const socialTitle = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;
  const imageUrl = toAbsoluteImageUrl(image, siteUrl);

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
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [imageUrl],
    },
  };
}

export async function resolveDynamicShareMetadata(slugs: string[]): Promise<Metadata | null> {
  try {
    const [section, rawValue] = slugs;
    const value = typeof rawValue === "string" ? decodeURIComponent(rawValue).trim() : "";

    if (!section || !value) return null;

    if (section === "product") {
      const [rows] = await db.query<ProductShareRow[]>(
        `
        SELECT
          p.title,
          p.slug,
          p.description,
          p.image_url,
          c.name AS category
        FROM products p
        LEFT JOIN product_categories c ON c.id = p.category_id
        WHERE p.slug = ? AND p.is_active = 1
        LIMIT 1
        `,
        [value]
      );
      if (!rows.length) return null;
      const product = rows[0];
      return buildShareMetadata({
        title: product.title,
        description: summarize(
          product.description,
          `${product.title} is available now on ${SITE_NAME}${product.category ? ` in ${product.category}` : ""}.`
        ),
        image: product.image_url,
        path: `/product/${encodeURIComponent(product.slug)}`,
      });
    }

    if (section === "courses" || section === "video") {
      const [rows] = await db.query<CourseShareRow[]>(
        `
        SELECT title, slug, description, thumbnail_url, hero_url, author_name
        FROM video_courses
        WHERE slug = ? AND is_active = 1
        LIMIT 1
        `,
        [value]
      );
      if (!rows.length) return null;
      const course = rows[0];
      return buildShareMetadata({
        title: course.title,
        description: summarize(
          course.description,
          `${course.title} video course${course.author_name ? ` by ${course.author_name}` : ""} on ${SITE_NAME}.`
        ),
        image: course.hero_url || course.thumbnail_url,
        path: `/courses/${encodeURIComponent(course.slug)}`,
      });
    }

    if (section === "tools-ai") {
      const [rows] = await db.query<ToolShareRow[]>(
        `
        SELECT
          td.canonical_slug,
          td.display_name,
          td.short_description,
          p.image_url
        FROM tool_definitions td
        JOIN products p ON p.id = td.product_id
        WHERE td.canonical_slug = ?
          AND td.is_active = 1
          AND p.is_active = 1
        LIMIT 1
        `,
        [value]
      );
      if (!rows.length) return null;
      const tool = rows[0];
      return buildShareMetadata({
        title: tool.display_name,
        description: summarize(
          tool.short_description,
          `${tool.display_name} is available now on ${SITE_NAME}.`
        ),
        image: tool.image_url,
        path: `/tools-ai/${encodeURIComponent(tool.canonical_slug)}`,
      });
    }

    if (section === "blog") {
      const numericId = Number(value);
      const [rows] = await db.query<BlogShareRow[]>(
        `
        SELECT username, email, first_name, last_name, bio, avatar_url
        FROM users
        WHERE (
          LOWER(username) = LOWER(?)
          OR (? > 0 AND id = ?)
        )
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
        `,
        [value, numericId, numericId]
      );
      if (!rows.length) return null;
      const seller = rows[0];
      const displayName =
        seller.username ||
        [seller.first_name, seller.last_name].filter(Boolean).join(" ").trim() ||
        seller.email;
      return buildShareMetadata({
        title: displayName,
        description: summarize(
          seller.bio,
          `Browse products, tools, and video courses from ${displayName} on ${SITE_NAME}.`
        ),
        image: seller.avatar_url,
        path: `/blog/${encodeURIComponent((seller.username || value).toLowerCase())}`,
      });
    }

    return null;
  } catch {
    return null;
  }
}
