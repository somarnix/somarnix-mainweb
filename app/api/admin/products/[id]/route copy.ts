// app/api/admin/products/[id]/route.ts
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs"; // ✅ important for mysql2

/* =========================
   PUT: UPDATE PRODUCT (ADMIN)
========================= */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const productId = Number(params.id);
    if (!Number.isFinite(productId) || productId <= 0) {
      return Response.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    const title = typeof b.title === "string" ? b.title.trim() : null;
    const slug = typeof b.slug === "string" ? b.slug.trim() : null;

    const categoryId = b.category_id !== undefined ? Number(b.category_id) : null;

    const level = typeof b.level === "string" ? b.level : null;

    const stockQty = b.stock_qty !== undefined ? Number(b.stock_qty) : null;

    const unlimitedStock =
      b.is_unlimited_stock !== undefined ? Number(b.is_unlimited_stock) : null;

    // ✅ allow null to remove image
    const imageUrl =
      b.image_url === null ? null : typeof b.image_url === "string" ? b.image_url.trim() : null;

    const isActive = b.is_active !== undefined ? Number(b.is_active) : null;

    if (categoryId !== null && (!Number.isFinite(categoryId) || categoryId <= 0)) {
      return Response.json({ error: "Invalid category_id" }, { status: 400 });
    }

    if (level !== null && !["beginner", "advanced", "pro"].includes(level)) {
      return Response.json({ error: "Invalid level" }, { status: 400 });
    }

    if (stockQty !== null && (!Number.isFinite(stockQty) || stockQty < 0)) {
      return Response.json({ error: "Invalid stock_qty" }, { status: 400 });
    }

    if (unlimitedStock !== null && ![0, 1].includes(unlimitedStock)) {
      return Response.json({ error: "Invalid is_unlimited_stock" }, { status: 400 });
    }

    if (isActive !== null && ![0, 1].includes(isActive)) {
      return Response.json({ error: "Invalid is_active" }, { status: 400 });
    }

    if (slug) {
      const [exists] = await db.query<RowDataPacket[]>(
        `SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1`,
        [slug, productId]
      );
      if (exists.length > 0) {
        return Response.json({ error: "Slug already exists" }, { status: 409 });
      }
    }

    const [result] = await db.query<ResultSetHeader>(
      `
      UPDATE products
      SET
        title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        category_id = COALESCE(?, category_id),
        level = COALESCE(?, level),
        stock_qty = COALESCE(?, stock_qty),
        is_unlimited_stock = COALESCE(?, is_unlimited_stock),
        image_url = COALESCE(?, image_url),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?
      `,
      [title, slug, categoryId, level, stockQty, unlimitedStock, imageUrl, isActive, productId]
    );

    if (result.affectedRows === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("UPDATE PRODUCT ERROR:", err);
    return Response.json({ error: "Server error", detail: String(err) }, { status: 500 });
  }
}

/* =========================
   DELETE: SOFT DELETE PRODUCT
========================= */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const productId = Number(params.id);
    if (!Number.isFinite(productId) || productId <= 0) {
      return Response.json({ error: "Invalid product id" }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `
      UPDATE products
      SET is_active = 0, updated_at = NOW()
      WHERE id = ?
      `,
      [productId]
    );

    if (result.affectedRows === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE PRODUCT ERROR:", err);
    return Response.json({ error: "Server error", detail: String(err) }, { status: 500 });
  }
}
