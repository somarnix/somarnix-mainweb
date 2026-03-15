import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductRow = RowDataPacket & {
  id: number;
  category_id: number;
};

type RelatedRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  category: string | null;
  avg_rating: number | null;
  rating_count: number;
  buyers_count: number;
  min_price: number | null;
  min_original_price: number | null;
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;

    const [productRows] = await db.query<ProductRow[]>(
      "SELECT id, category_id FROM products WHERE slug = ? AND is_active = 1 LIMIT 1",
      [slug]
    );

    if (productRows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const productId = productRows[0].id;
    const categoryId = productRows[0].category_id;

    const [rows] = await db.query<RelatedRow[]>(
      `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.image_url,
        c.name AS category,
        ROUND(AVG(r.rating), 2) AS avg_rating,
        COUNT(r.id) AS rating_count,
        (
          SELECT COALESCE(SUM(oi.qty), 0)
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id
            AND o.state = 'completed'
        ) AS buyers_count,
        CASE
          WHEN LOWER(c.name) = 'tools'
            THEN (SELECT MIN(tv.price) FROM tool_variants tv WHERE tv.product_id = p.id AND tv.is_active = 1)
          ELSE (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = p.id AND v.is_active = 1)
        END AS min_price,
        CASE
          WHEN LOWER(c.name) = 'tools'
            THEN (SELECT MIN(tv.original_price) FROM tool_variants tv WHERE tv.product_id = p.id AND tv.is_active = 1)
          ELSE (SELECT MIN(v.original_price) FROM product_variants v WHERE v.product_id = p.id AND v.is_active = 1)
        END AS min_original_price
      FROM products p
      LEFT JOIN product_reviews r ON r.product_id = p.id
      LEFT JOIN product_categories c ON c.id = p.category_id
      WHERE p.category_id = ? AND p.id <> ? AND p.is_active = 1
      GROUP BY p.id, c.name
      ORDER BY buyers_count DESC, p.created_at DESC
      LIMIT 12
      `,
      [categoryId, productId]
    );

    const related = rows.map((row) => ({
      ...row,
      avg_rating: row.avg_rating === null ? null : Number(row.avg_rating),
      rating_count: Number(row.rating_count),
      buyers_count: Number(row.buyers_count ?? 0),
      min_price: row.min_price === null ? null : Number(row.min_price),
      min_original_price:
        row.min_original_price === null ? null : Number(row.min_original_price),
    }));

    return Response.json({ products: related });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
