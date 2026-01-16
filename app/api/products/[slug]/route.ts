// app\api\products\[slug]\route.ts
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

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
  image_url: string | null;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;

  category: string;
  posted_by_email: string;

  avg_rating: number | null;
  rating_count: number;
};

type VariantRow = RowDataPacket & {
  id: number;
  duration_label: string | null;
  duration_note: string | null;
  duration_days: number | null;
  device_label: string | null;
  device_limit: number | null;
  is_unlimited_device: 0 | 1;
  original_price: number;
  price: number;
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params; // ✅ FIX: await params

    const [pRows] = await db.query<ProductDetailRow[]>(
      `
      SELECT
        p.*,
        c.name AS category,
        u.email AS posted_by_email,
        ROUND((SELECT AVG(r.rating) FROM product_reviews r WHERE r.product_id = p.id), 2) AS avg_rating,
        (SELECT COUNT(*) FROM product_reviews r WHERE r.product_id = p.id) AS rating_count
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

    const [vRows] = await db.query<VariantRow[]>(
      `
      SELECT
        id, duration_label, duration_note, duration_days,
        device_label, device_limit, is_unlimited_device,
        original_price, price
      FROM product_variants
      WHERE product_id = ? AND is_active = 1
      ORDER BY price ASC
      `,
      [product.id]
    );

    const normalizedProduct = {
      ...product,
      avg_rating: product.avg_rating === null ? null : Number(product.avg_rating),
      rating_count: Number(product.rating_count),
      stock_qty: Number(product.stock_qty),
      is_unlimited_stock: Number(product.is_unlimited_stock) as 0 | 1,
    };

    const normalizedVariants = vRows.map((v) => ({
      ...v,
      original_price: Number(v.original_price),
      price: Number(v.price),
      is_unlimited_device: Number(v.is_unlimited_device) as 0 | 1,
      duration_days: v.duration_days === null ? null : Number(v.duration_days),
      device_limit: v.device_limit === null ? null : Number(v.device_limit),
    }));

    return Response.json({
      product: normalizedProduct,
      variants: normalizedVariants,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}