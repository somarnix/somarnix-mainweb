// app\api\products\[slug]\route.ts
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductLevel = "beginner" | "advanced" | "pro";

type ProductDetailRow = RowDataPacket & {
  id: number;
  category_id: number;
  title: string;
  slug: string;
  description: string | null;
  level: ProductLevel;
  posted_by: number;
  stock_qty: number;
  is_unlimited_stock: 0 | 1;
  mode: "license" | "inventory";
  image_url: string | null;
  is_active: 0 | 1;
  order_fields_json: string | null;
  created_at: string;
  updated_at: string;

  category: string;
  posted_by_email: string;
  posted_by_name: string | null;
  posted_by_username: string | null;
  posted_by_level: number | null;
  posted_by_avatar: string | null;
  posted_by_avatar_border: string | null;

  avg_rating: number | null;
  rating_count: number;
  buyers_count: number;
};

type VariantRow = RowDataPacket & {
  id: number;
  duration_label: string | null;
  duration_note: string | null;
  duration_days: number | null;
  device_label: string | null;
  device_limit: number | null;
  is_unlimited_device: 0 | 1;
  units_per_qty: number;
  original_price: number;
  price: number;
  khqr: string | null;
  usdqr: string | null;
};

type ReviewRow = RowDataPacket & {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: Date | string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
  avatar_border_url: string | null;
};

async function hasAllDeviceColumns(): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'product_variants'
      AND column_name IN ('device_label','device_type','device_limit','is_unlimited_device')
    `
  );
  const present = new Set(rows.map((r) => String(r.column_name)));
  return ["device_label", "device_type", "device_limit", "is_unlimited_device"].every((column) =>
    present.has(column)
  );
}

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );
  return rows.length > 0;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const hasAvatarBorderColumn = await hasColumn("users", "avatar_border_url");
    const hasProductsMode = await hasColumn("products", "mode");
    const hasVariantUnitsPerQty = await hasColumn("product_variants", "units_per_qty");
    const modeExpr = hasProductsMode
      ? "CASE WHEN p.mode IN ('license','inventory') THEN p.mode ELSE 'inventory' END"
      : "'inventory'";
    const unitsPerQtyExpr = hasVariantUnitsPerQty ? "COALESCE(units_per_qty, 1)" : "1";
    const postedByAvatarBorderSelect = hasAvatarBorderColumn
      ? "u.avatar_border_url AS posted_by_avatar_border"
      : "NULL AS posted_by_avatar_border";
    const reviewAvatarBorderSelect = hasAvatarBorderColumn
      ? "u.avatar_border_url"
      : "NULL AS avatar_border_url";

    const [pRows] = await db.query<ProductDetailRow[]>(
      `
      SELECT
        p.*,
        ${modeExpr} AS mode,
        c.name AS category,
        u.email AS posted_by_email,
        CONCAT_WS(' ', NULLIF(TRIM(u.first_name),''), NULLIF(TRIM(u.last_name),'')) AS posted_by_name,
        u.username AS posted_by_username,
        u.level AS posted_by_level,
        u.avatar_url AS posted_by_avatar,
        ${postedByAvatarBorderSelect},
        ROUND((SELECT AVG(r.rating) FROM product_reviews r WHERE r.product_id = p.id), 2) AS avg_rating,
        (SELECT COUNT(*) FROM product_reviews r WHERE r.product_id = p.id) AS rating_count,
        (
          SELECT COALESCE(SUM(oi.qty), 0)
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.state = 'completed'
        ) AS buyers_count
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      JOIN users u ON u.id = p.posted_by
      WHERE p.slug = ? AND p.is_active = 1
      LIMIT 1
      `,
      [slug]
    );

    if (pRows.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const product = pRows[0];
    const isTools = String(product.category || "").toLowerCase() === "tools";
    const withDeviceColumns = isTools ? true : await hasAllDeviceColumns();
    let vRows: VariantRow[] = [];

    if (isTools) {
      try {
        const [rows] = await db.query<VariantRow[]>(
          `
          SELECT
            id, duration_label, duration_note, duration_days,
            device_label, device_limit, is_unlimited_device,
            1 AS units_per_qty,
            original_price, price,
            khqr, usdqr
          FROM tool_variants
          WHERE product_id = ? AND is_active = 1
          ORDER BY price ASC
          `,
          [product.id]
        );
        vRows = rows;
      } catch (err) {
        const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        if (!message.includes("tool_variants")) {
          throw err;
        }
      }
    }

    if (!isTools || vRows.length === 0) {
      const [rows] = await db.query<VariantRow[]>(
        withDeviceColumns
          ? `
            SELECT
              id, duration_label, duration_note, duration_days,
              device_label, device_limit, is_unlimited_device,
              ${unitsPerQtyExpr} AS units_per_qty,
              original_price, price,
              khqr, usdqr
            FROM product_variants
            WHERE product_id = ? AND is_active = 1
            ORDER BY price ASC
          `
          : `
            SELECT
              id, duration_label, duration_note, duration_days,
              NULL AS device_label,
              NULL AS device_limit,
              0 AS is_unlimited_device,
              ${unitsPerQtyExpr} AS units_per_qty,
              original_price, price,
              khqr, usdqr
            FROM product_variants
            WHERE product_id = ? AND is_active = 1
            ORDER BY price ASC
          `,
        [product.id]
      );
      vRows = rows;
    }

    const normalizedProduct = {
      ...product,
      avg_rating: product.avg_rating === null ? null : Number(product.avg_rating),
      rating_count: Number(product.rating_count),
      stock_qty: Number(product.stock_qty),
      is_unlimited_stock: Number(product.is_unlimited_stock) as 0 | 1,
      mode: String(product.mode) === "license" ? "license" : "inventory",
      buyers_count: Number(product.buyers_count ?? 0),
      posted_by_level: product.posted_by_level === null ? null : Number(product.posted_by_level),
      posted_by_avatar_border:
        Number(product.posted_by_level ?? 1) >= 2 ? product.posted_by_avatar_border : null,
    };

    const normalizedVariants = vRows.map((v) => ({
      ...v,
      original_price: Number(v.original_price),
      price: Number(v.price),
      is_unlimited_device: Number(v.is_unlimited_device) as 0 | 1,
      units_per_qty: Math.max(1, Math.floor(Number(v.units_per_qty ?? 1))),
      duration_days: v.duration_days === null ? null : Number(v.duration_days),
      device_limit: v.device_limit === null ? null : Number(v.device_limit),
      khqr: v.khqr,
      usdqr: v.usdqr,
    }));

    const [reviewRows] = await db.query<ReviewRow[]>(
      `
      SELECT
        r.id,
        r.product_id,
        r.user_id,
        r.rating,
        r.comment,
        r.created_at,
        u.first_name,
        u.last_name,
        u.username,
        u.avatar_url,
        ${reviewAvatarBorderSelect}
      FROM product_reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
      LIMIT 50
      `,
      [product.id]
    );

    const reviews = reviewRows.map((r) => ({
      id: r.id,
      product_id: r.product_id,
      user_id: r.user_id,
      rating: Number(r.rating),
      comment: r.comment,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      user_name:
        (r.first_name || r.last_name
          ? [r.first_name, r.last_name].filter(Boolean).join(" ")
          : null) ||
        r.username ||
        "User",
      user_avatar: r.avatar_url,
      user_avatar_border: r.avatar_border_url,
    }));

    return Response.json({
      product: normalizedProduct,
      variants: normalizedVariants,
      reviews,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
