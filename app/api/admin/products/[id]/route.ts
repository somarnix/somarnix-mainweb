// app/api/admin/products/[id]/route.ts
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

/* =========================
   PUT: UPDATE PRODUCT (ADMIN)
========================= */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // ✅ params is Promise in Next 15
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params; // ✅ unwrap params
    const productId = Number(id);

    if (!Number.isFinite(productId) || productId <= 0) {
      return Response.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    const sets: string[] = [];
    const values: Array<string | number | null> = [];

    if ("title" in b) {
      const title = typeof b.title === "string" ? b.title.trim() : "";
      if (!title) return Response.json({ error: "Invalid title" }, { status: 400 });
      sets.push("title = ?");
      values.push(title);
    }

    if ("slug" in b) {
      const slug = typeof b.slug === "string" ? b.slug.trim() : "";
      if (!slug) return Response.json({ error: "Invalid slug" }, { status: 400 });

      const [exists] = await db.query<RowDataPacket[]>(
        `SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1`,
        [slug, productId]
      );
      if (exists.length > 0) {
        return Response.json({ error: "Slug already exists" }, { status: 409 });
      }

      sets.push("slug = ?");
      values.push(slug);
    }

    if ("category_id" in b) {
      const categoryId = Number(b.category_id);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        return Response.json({ error: "Invalid category_id" }, { status: 400 });
      }
      sets.push("category_id = ?");
      values.push(categoryId);
    }

    if ("level" in b) {
      const level = typeof b.level === "string" ? b.level : "";
      if (!["beginner", "advanced", "pro"].includes(level)) {
        return Response.json({ error: "Invalid level" }, { status: 400 });
      }
      sets.push("level = ?");
      values.push(level);
    }

    if ("stock_qty" in b) {
      const stockQty = Number(b.stock_qty);
      if (!Number.isFinite(stockQty) || stockQty < 0) {
        return Response.json({ error: "Invalid stock_qty" }, { status: 400 });
      }
      sets.push("stock_qty = ?");
      values.push(stockQty);
    }

    if ("is_unlimited_stock" in b) {
      const unlimited = Number(b.is_unlimited_stock);
      if (![0, 1].includes(unlimited)) {
        return Response.json({ error: "Invalid is_unlimited_stock" }, { status: 400 });
      }
      sets.push("is_unlimited_stock = ?");
      values.push(unlimited);
    }

    // ✅ allow null to remove image
    if ("image_url" in b) {
      if (!(typeof b.image_url === "string" || b.image_url === null)) {
        return Response.json({ error: "Invalid image_url" }, { status: 400 });
      }
      const imageUrl =
        b.image_url === null
          ? null
          : b.image_url.trim()
            ? b.image_url.trim()
            : null;

      sets.push("image_url = ?");
      values.push(imageUrl);
    }

    if ("is_active" in b) {
      const isActive = Number(b.is_active);
      if (![0, 1].includes(isActive)) {
        return Response.json({ error: "Invalid is_active" }, { status: 400 });
      }
      sets.push("is_active = ?");
      values.push(isActive);
    }

    sets.push("updated_at = NOW()");

    if (sets.length === 1) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(productId);


    const [result] = await db.query<ResultSetHeader>(
      `UPDATE products SET ${sets.join(", ")} WHERE id = ?`,
      values
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
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // ✅ same fix
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const productId = Number(id);

    if (!Number.isFinite(productId) || productId <= 0) {
      return Response.json({ error: "Invalid product id" }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `UPDATE products SET is_active = 0, updated_at = NOW() WHERE id = ?`,
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
