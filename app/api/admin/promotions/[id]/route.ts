import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

type ComboItemInput = {
  item_type: "course" | "tool" | "product";
  item_id: number;
  variant_id?: number | null;
  qty?: number;
};

function normalizeItemInput(raw: unknown): ComboItemInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const itemType = typeof r.item_type === "string" ? r.item_type : "";
  const itemId = Number(r.item_id);
  const variantId = r.variant_id === null || r.variant_id === undefined ? null : Number(r.variant_id);
  const qtyRaw = Number(r.qty ?? 1);
  if (!["course", "tool", "product"].includes(itemType)) return null;
  if (!Number.isFinite(itemId) || itemId <= 0) return null;
  if (variantId !== null && (!Number.isFinite(variantId) || variantId <= 0)) return null;
  if (!Number.isFinite(qtyRaw) || qtyRaw <= 0) return null;
  return {
    item_type: itemType as ComboItemInput["item_type"],
    item_id: Math.floor(itemId),
    variant_id: variantId === null ? null : Math.floor(variantId),
    qty: Math.floor(qtyRaw),
  };
}

function normalizeDateTimeInput(raw: unknown): string | null | undefined {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/);
  if (!match) return undefined;
  return `${match[1]} ${match[2]}${match[3] ?? ":00"}`;
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const comboId = Number(id);
  if (!Number.isFinite(comboId) || comboId <= 0) {
    return Response.json({ error: "Invalid promotion id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : null;
  const price = Number(body.price);
  const originalPrice =
    body.original_price === null || body.original_price === undefined || body.original_price === ""
      ? null
      : Number(body.original_price);
  const thumbnailUrl = typeof body.thumbnail_url === "string" ? body.thumbnail_url.trim() : null;
  const khqr = typeof body.khqr === "string" ? body.khqr.trim() : null;
  const usdqr = typeof body.usdqr === "string" ? body.usdqr.trim() : null;
  const startAt = normalizeDateTimeInput(body.start_at);
  const endAt = normalizeDateTimeInput(body.end_at);
  const isActive = Number(body.is_active) ? 1 : 0;
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems.map(normalizeItemInput).filter(Boolean) as ComboItemInput[];

  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) {
    return Response.json({ error: "Invalid price" }, { status: 400 });
  }
  if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < 0)) {
    return Response.json({ error: "Invalid original_price" }, { status: 400 });
  }
  if (items.length === 0) {
    return Response.json({ error: "At least one combo item is required" }, { status: 400 });
  }
  if (startAt === undefined) {
    return Response.json({ error: "Invalid start_at format" }, { status: 400 });
  }
  if (endAt === undefined) {
    return Response.json({ error: "Invalid end_at format" }, { status: 400 });
  }
  if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
    return Response.json({ error: "end_at must be after start_at" }, { status: 400 });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [upd] = await conn.query<ResultSetHeader>(
      `
      UPDATE promotion_combos
      SET title = ?, description = ?, price = ?, original_price = ?, thumbnail_url = ?, khqr = ?, usdqr = ?, start_at = ?, end_at = ?, is_active = ?
      WHERE id = ?
      `,
      [title, description, price, originalPrice, thumbnailUrl, khqr, usdqr, startAt, endAt, isActive, comboId]
    );
    if (upd.affectedRows === 0) {
      await conn.rollback();
      return Response.json({ error: "Promotion not found" }, { status: 404 });
    }

    await conn.query<ResultSetHeader>("DELETE FROM promotion_combo_items WHERE combo_id = ?", [comboId]);
    for (const item of items) {
      await conn.query<ResultSetHeader>(
        `
        INSERT INTO promotion_combo_items (combo_id, item_type, item_id, variant_id, qty)
        VALUES (?, ?, ?, ?, ?)
        `,
        [comboId, item.item_type, item.item_id, item.variant_id ?? null, item.qty ?? 1]
      );
    }

    await conn.commit();
    return Response.json({ success: true });
  } catch (err: unknown) {
    await conn.rollback();
    return Response.json({ error: "Server error", detail: String(err) }, { status: 500 });
  } finally {
    conn.release();
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const comboId = Number(id);
  if (!Number.isFinite(comboId) || comboId <= 0) {
    return Response.json({ error: "Invalid promotion id" }, { status: 400 });
  }

  const [res] = await db.query<ResultSetHeader>(
    "DELETE FROM promotion_combos WHERE id = ?",
    [comboId]
  );
  if (res.affectedRows === 0) {
    return Response.json({ error: "Promotion not found" }, { status: 404 });
  }
  return Response.json({ success: true });
}
