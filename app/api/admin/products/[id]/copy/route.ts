import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type ProductRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  category_id: number;
  posted_by: number;
  description: string | null;
  level: string;
  stock_qty: number;
  is_unlimited_stock: number;
  image_url: string | null;
  is_active: number;
};

type VariantRow = RowDataPacket & {
  duration_label: string | null;
  duration_note: string | null;
  duration_days: number | null;
  device_label: string | null;
  device_type: "any" | "pc" | "phone" | "both" | null;
  device_limit: number | null;
  is_unlimited_device: number | null;
  original_price: number | string | null;
  price: number | string | null;
  khqr: string | null;
  usdqr: string | null;
  is_active: number | null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const productId = Number(id);
  if (!Number.isFinite(productId) || productId <= 0) {
    return Response.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const [rows] = await db.query<ProductRow[]>(
      `
      SELECT
        id,
        title,
        slug,
        category_id,
        posted_by,
        description,
        level,
        stock_qty,
        is_unlimited_stock,
        image_url,
        is_active
      FROM products
      WHERE id = ?
      LIMIT 1
      `,
      [productId]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const product = rows[0];
    const suffix = `copy-${Date.now()}`;
    const newSlug = `${product.slug}-${suffix}`;
    const newTitle = `${product.title} (Copy)`;

    await db.query("START TRANSACTION");

    const [insertRes] = await db.query<ResultSetHeader>(
      `
      INSERT INTO products (
        category_id,
        posted_by,
        title,
        slug,
        description,
        level,
        stock_qty,
        is_unlimited_stock,
        image_url,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product.category_id,
        product.posted_by,
        newTitle,
        newSlug,
        product.description,
        product.level,
        product.stock_qty,
        product.is_unlimited_stock,
        product.image_url,
        0,
      ]
    );

    const newProductId = insertRes.insertId;

    const [variantRows] = await db.query<VariantRow[]>(
      `
      SELECT
        duration_label,
        duration_note,
        duration_days,
        device_label,
        device_type,
        device_limit,
        is_unlimited_device,
        original_price,
        price,
        khqr,
        usdqr,
        is_active
      FROM product_variants
      WHERE product_id = ?
      ORDER BY id ASC
      `,
      [productId]
    );

    if (variantRows.length > 0) {
      const values: Array<unknown> = [];
      const placeholders = variantRows.map(() => {
        return "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      });

      variantRows.forEach((variant) => {
        values.push(
          newProductId,
          variant.duration_label,
          variant.duration_note,
          variant.duration_days,
          variant.device_label,
          variant.device_type ?? "any",
          variant.device_limit,
          variant.is_unlimited_device ?? 0,
          variant.original_price ?? 0,
          variant.price ?? 0,
          variant.khqr ?? "/paymentQR/khmer_qr.jpg",
          variant.usdqr ?? "none",
          variant.is_active ?? 1
        );
      });

      await db.query(
        `
        INSERT INTO product_variants (
          product_id,
          duration_label,
          duration_note,
          duration_days,
          device_label,
          device_type,
          device_limit,
          is_unlimited_device,
          original_price,
          price,
          khqr,
          usdqr,
          is_active
        )
        VALUES ${placeholders.join(", ")}
        `,
        values
      );
    }

    await db.query("COMMIT");

    return Response.json({ success: true, id: newProductId, slug: newSlug });
  } catch (err) {
    await db.query("ROLLBACK");
    return Response.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
