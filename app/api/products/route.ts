// app\api\products\route.ts
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  level: "beginner" | "advanced" | "pro";
  image_url: string | null;
  stock_qty: number;
  is_unlimited_stock: 0 | 1;
  category: string;
  posted_by_email: string;
  posted_by_id: number;
  posted_by_username: string | null;
  posted_by_avatar: string | null;
  telegram_url: string | null;
  avg_rating: number | null; // may come as string depending mysql2 config
  rating_count: number;
  buyers_count: number;
  min_price: number | null; // may come as string depending mysql2 config
  min_original_price: number | null; // may come as string depending mysql2 config
  variant_count: number;
  mode: "license" | "inventory";
};

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category"); // course/program/game/tools
    const q = url.searchParams.get("q"); // search title
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
    const postedBy = url.searchParams.get("posted_by");

    const params: (string | number)[] = [];
    const whereParts: string[] = ["p.is_active = 1"];

    if (category) {
      whereParts.push("c.name = ?");
      params.push(category);
    }

    if (q) {
      whereParts.push("p.title LIKE ?");
      params.push(`%${q}%`);
    }
    if (postedBy) {
      whereParts.push("p.posted_by = ?");
      params.push(Number(postedBy));
    }

    const where = whereParts.join(" AND ");
    const hasProductsMode = await hasColumn("products", "mode");
    const hasTelegramUrl = await hasColumn("products", "telegram_url");
    const modeExpr = hasProductsMode
      ? "CASE WHEN p.mode IN ('license','inventory') THEN p.mode ELSE 'inventory' END"
      : "'inventory'";
    const telegramExpr = hasTelegramUrl ? "p.telegram_url" : "NULL";

    const sql = `
      SELECT
        p.id, p.title, p.slug, p.level, p.image_url, p.stock_qty, p.is_unlimited_stock,
        ${modeExpr} AS mode,
        c.name AS category,
        u.email AS posted_by_email,
        u.id AS posted_by_id,
        u.username AS posted_by_username,
        u.avatar_url AS posted_by_avatar,
        ${telegramExpr} AS telegram_url,

        -- rating
        ROUND(AVG(r.rating), 2) AS avg_rating,
        COUNT(r.id) AS rating_count,

        -- buyers count (count approved/completed items)
        (
          SELECT COALESCE(SUM(oi.qty),0)
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.state = 'completed'
        ) AS buyers_count,

        -- price from variants
        CASE
          WHEN LOWER(c.name) = 'tools'
            THEN (SELECT MIN(tv.price) FROM tool_variants tv WHERE tv.product_id = p.id AND tv.is_active = 1)
          ELSE (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = p.id AND v.is_active = 1)
        END AS min_price,
        CASE
          WHEN LOWER(c.name) = 'tools'
            THEN (SELECT MIN(tv.original_price) FROM tool_variants tv WHERE tv.product_id = p.id AND tv.is_active = 1)
          ELSE (SELECT MIN(v.original_price) FROM product_variants v WHERE v.product_id = p.id AND v.is_active = 1)
        END AS min_original_price,
        CASE
          WHEN LOWER(c.name) = 'tools'
            THEN (SELECT COUNT(*) FROM tool_variants tv WHERE tv.product_id = p.id AND tv.is_active = 1)
          ELSE (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id AND v.is_active = 1)
        END AS variant_count

      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      JOIN users u ON u.id = p.posted_by
      LEFT JOIN product_reviews r ON r.product_id = p.id

      WHERE ${where}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `;

    params.push(limit);

    const [rows] = await db.query<ProductRow[]>(sql, params);

    // Optional: normalize decimals (mysql2 may return DECIMAL as string)
    const normalized = rows.map((r) => ({
      ...r,
      avg_rating: r.avg_rating === null ? null : Number(r.avg_rating),
      min_price: r.min_price === null ? null : Number(r.min_price),
      min_original_price: r.min_original_price === null ? null : Number(r.min_original_price),
      rating_count: Number(r.rating_count),
      buyers_count: Number(r.buyers_count),
      stock_qty: Number(r.stock_qty),
      variant_count: Number(r.variant_count ?? 0),
      is_unlimited_stock: Number(r.is_unlimited_stock) as 0 | 1,
    }));

    return Response.json(normalized);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
