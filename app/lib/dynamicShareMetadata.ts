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
  min_price: number | string | null;
  compare_price: number | string | null;
  seller_name: string | null;
  seller_avatar_url: string | null;
  is_unlimited_stock: number | null;
  stock_qty: number | null;
};

type CourseShareRow = RowDataPacket & {
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  hero_url: string | null;
  author_name: string | null;
  category: string | null;
  price: number | string | null;
  compare_price: number | string | null;
  seller_name: string | null;
  seller_avatar_url: string | null;
};

type ToolShareRow = RowDataPacket & {
  canonical_slug: string;
  display_name: string;
  short_description: string | null;
  image_url: string | null;
  tool_category: string;
  min_price: number | string | null;
  compare_price: number | string | null;
  seller_name: string | null;
  seller_avatar_url: string | null;
  is_unlimited_stock: number | null;
  stock_qty: number | null;
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

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return `$${num.toFixed(2)}`;
}

function formatShareLabel(value: string | null | undefined, fallback: string) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return fallback;
  if (raw === "program" || raw === "programs") return "Programs";
  if (raw === "game" || raw === "games") return "Games";
  if (raw === "course" || raw === "courses" || raw === "video") return "Courses";
  if (raw === "tool" || raw === "tools") return "Tools";
  if (raw === "ai") return "AI";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function buildShareMetadata({
  title,
  description,
  image,
  path,
  kind,
  label,
  price,
  comparePrice,
  sellerName,
  sellerLogo,
  stockBadge,
}: {
  title: string;
  description: string;
  image?: string | null;
  path: string;
  kind: string;
  label?: string | null;
  price?: string | null;
  comparePrice?: string | null;
  sellerName?: string | null;
  sellerLogo?: string | null;
  stockBadge?: string | null;
}): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalPath = normalizePath(path).replace(/\/+$/, "") || "/";
  const canonicalUrl = canonicalPath === "/" ? siteUrl : `${siteUrl}${canonicalPath}`;
  const fallbackImageUrl = `${siteUrl}${DEFAULT_OG_IMAGE}`;
  const sourceImageUrl = toAbsoluteImageUrl(image, siteUrl);
  const ogImageUrl = new URL("/api/og", siteUrl);
  ogImageUrl.searchParams.set("kind", kind);
  ogImageUrl.searchParams.set("title", title);
  ogImageUrl.searchParams.set("subtitle", description);
  ogImageUrl.searchParams.set("image", sourceImageUrl);
  ogImageUrl.searchParams.set("url", canonicalUrl);
  ogImageUrl.searchParams.set("domain", new URL(canonicalUrl).hostname.replace(/^www\./i, "").toUpperCase());
  if (label) ogImageUrl.searchParams.set("label", label);
  if (price) ogImageUrl.searchParams.set("price", price);
  if (comparePrice) ogImageUrl.searchParams.set("comparePrice", comparePrice);
  if (sellerName) ogImageUrl.searchParams.set("sellerName", sellerName);
  if (sellerLogo) ogImageUrl.searchParams.set("sellerLogo", toAbsoluteImageUrl(sellerLogo, siteUrl));
  if (stockBadge) ogImageUrl.searchParams.set("stockBadge", stockBadge);
  const generatedImageUrl = ogImageUrl.toString();
  const openGraphImages: NonNullable<Metadata["openGraph"]>["images"] = [];

  openGraphImages.push({
    url: generatedImageUrl,
    alt: title,
    width: 1200,
    height: 630,
  });

  if (sourceImageUrl && sourceImageUrl !== fallbackImageUrl) {
    openGraphImages.push({
      url: sourceImageUrl,
      alt: title,
      width: 1200,
      height: 630,
    });
  }

  const primarySocialImage = generatedImageUrl;

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      siteName: SITE_NAME,
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [primarySocialImage],
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
          c.name AS category,
          COALESCE(NULLIF(u.username, ''), NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), u.email) AS seller_name,
          u.avatar_url AS seller_avatar_url,
          p.is_unlimited_stock,
          p.stock_qty,
          (
            SELECT MIN(pv.price)
            FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.is_active = 1
          ) AS min_price,
          (
            SELECT MAX(NULLIF(pv.original_price, 0))
            FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.is_active = 1
          ) AS compare_price
        FROM products p
        LEFT JOIN product_categories c ON c.id = p.category_id
        LEFT JOIN users u ON u.id = p.posted_by
        WHERE p.slug = ? AND p.is_active = 1
        LIMIT 1
        `,
        [value]
      );
      if (!rows.length) return null;
      const product = rows[0];
      const productPrice = formatPrice(product.min_price);
      const productComparePrice = formatPrice(product.compare_price);
      const productCategory = formatShareLabel(product.category, "Product");
      const stockBadge =
        Number(product.is_unlimited_stock ?? 0) === 1
          ? "Unlimited stock"
          : Number(product.stock_qty ?? 0) > 0
          ? "In stock"
          : "Out of stock";
      return buildShareMetadata({
        title: product.title,
        description: summarize(
          product.description,
          `${product.title}${productPrice ? ` for ${productPrice}` : ""}${productCategory ? ` in ${productCategory}` : ""}. Buy now on ${SITE_NAME}.`
        ),
        image: product.image_url,
        path: `/product/${encodeURIComponent(product.slug)}`,
        kind: "product",
        label: productCategory,
        price: productPrice,
        comparePrice:
          productComparePrice && productComparePrice !== productPrice ? productComparePrice : null,
        sellerName: product.seller_name,
        sellerLogo: product.seller_avatar_url,
        stockBadge,
      });
    }

    if (section === "courses" || section === "video") {
      const [rows] = await db.query<CourseShareRow[]>(
        `
        SELECT
          vc.title,
          vc.slug,
          vc.description,
          vc.thumbnail_url,
          vc.hero_url,
          vc.author_name,
          COALESCE(NULLIF(u.username, ''), NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), u.email) AS seller_name,
          COALESCE(NULLIF(u.avatar_url, ''), NULLIF(vc.author_avatar_url, '')) AS seller_avatar_url,
          vc.category,
          (
            SELECT MIN(vcp.price)
            FROM video_course_plans vcp
            WHERE vcp.course_id = vc.id AND vcp.is_active = 1
          ) AS price,
          (
            SELECT MAX(NULLIF(vcp.original_price, 0))
            FROM video_course_plans vcp
            WHERE vcp.course_id = vc.id AND vcp.is_active = 1
          ) AS compare_price
        FROM video_courses vc
        LEFT JOIN users u ON u.id = vc.posted_by
        WHERE vc.slug = ? AND vc.is_active = 1
        LIMIT 1
        `,
        [value]
      );
      if (!rows.length) return null;
      const course = rows[0];
      const coursePrice = formatPrice(course.price);
      const courseComparePrice = formatPrice(course.compare_price);
      const courseCategory = formatShareLabel(course.category, "Courses");
      return buildShareMetadata({
        title: course.title,
        description: summarize(
          course.description,
          `${course.title}${coursePrice ? ` for ${coursePrice}` : ""}${course.author_name ? ` by ${course.author_name}` : ""}. Learn with this video course on ${SITE_NAME}.`
        ),
        image: course.hero_url || course.thumbnail_url,
        path: `/courses/${encodeURIComponent(course.slug)}`,
        kind: "course",
        label: courseCategory,
        price: coursePrice,
        comparePrice: courseComparePrice && courseComparePrice !== coursePrice ? courseComparePrice : null,
        sellerName: course.seller_name || course.author_name,
        sellerLogo: course.seller_avatar_url,
      });
    }

    if (section === "tools-ai") {
      const [rows] = await db.query<ToolShareRow[]>(
        `
        SELECT
          td.canonical_slug,
          td.display_name,
          td.short_description,
          p.image_url,
          td.tool_category,
          COALESCE(NULLIF(u.username, ''), NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), u.email) AS seller_name,
          u.avatar_url AS seller_avatar_url,
          p.is_unlimited_stock,
          p.stock_qty,
          (
            SELECT MIN(pv.price)
            FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.is_active = 1
          ) AS min_price,
          (
            SELECT MAX(NULLIF(pv.original_price, 0))
            FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.is_active = 1
          ) AS compare_price
        FROM tool_definitions td
        JOIN products p ON p.id = td.product_id
        LEFT JOIN users u ON u.id = p.posted_by
        WHERE td.canonical_slug = ?
          AND td.is_active = 1
          AND p.is_active = 1
        LIMIT 1
        `,
        [value]
      );
      if (!rows.length) return null;
      const tool = rows[0];
      const toolPrice = formatPrice(tool.min_price);
      const toolComparePrice = formatPrice(tool.compare_price);
      const toolCategory = formatShareLabel(tool.tool_category, "Tools");
      const stockBadge =
        Number(tool.is_unlimited_stock ?? 0) === 1
          ? "Unlimited stock"
          : Number(tool.stock_qty ?? 0) > 0
          ? "In stock"
          : "Out of stock";
      return buildShareMetadata({
        title: tool.display_name,
        description: summarize(
          tool.short_description,
          `${tool.display_name}${toolPrice ? ` for ${toolPrice}` : ""}. Use this ${toolCategory.toLowerCase()} on ${SITE_NAME}.`
        ),
        image: tool.image_url,
        path: `/tools-ai/${encodeURIComponent(tool.canonical_slug)}`,
        kind: "tool",
        label: toolCategory,
        price: toolPrice,
        comparePrice: toolComparePrice && toolComparePrice !== toolPrice ? toolComparePrice : null,
        sellerName: tool.seller_name,
        sellerLogo: tool.seller_avatar_url,
        stockBadge,
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
        kind: "blog",
        label: "Seller",
      });
    }

    return null;
  } catch {
    return null;
  }
}
