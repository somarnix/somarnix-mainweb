// app/api/admin/variants/[variantId]/route.ts
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_KH_QR = "/paymentQR/khmer_qr.jpg";
const USD_QR_NONE = "none";
const DEVICE_TYPE_COLUMN = "device_type";

function isUnknownColumnError(err: unknown, column: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes(`Unknown column '${column}'`);
}

type RouteCtx = { params: { variantId: string } | Promise<{ variantId: string }> };

async function readVariantId(ctx: RouteCtx): Promise<string> {
  const params = await Promise.resolve(ctx.params); // ✅ FIX
  return typeof params.variantId === "string" ? params.variantId : "";
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* =========================
   PUT: UPDATE VARIANT (ADMIN)
========================= */
export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const idStr = await readVariantId(ctx);
    const variantId = Number(idStr);

    if (!Number.isFinite(variantId) || variantId <= 0) {
      return Response.json({ error: "Invalid variant id" }, { status: 400 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    const sets: string[] = [];
    const values: Array<string | number | null> = [];

    if ("duration_label" in b) {
      if (!(typeof b.duration_label === "string" || b.duration_label === null)) {
        return Response.json({ error: "Invalid duration_label" }, { status: 400 });
      }
      const v = b.duration_label === null ? null : b.duration_label.trim() || null;
      sets.push("duration_label = ?");
      values.push(v);
    }

    if ("duration_note" in b) {
      if (!(typeof b.duration_note === "string" || b.duration_note === null)) {
        return Response.json({ error: "Invalid duration_note" }, { status: 400 });
      }
      const v = b.duration_note === null ? null : b.duration_note.trim() || null;
      sets.push("duration_note = ?");
      values.push(v);
    }

    if ("duration_days" in b) {
      const v = b.duration_days === null ? null : toIntOrNull(b.duration_days);
      if (v !== null && v < 0) {
        return Response.json({ error: "Invalid duration_days" }, { status: 400 });
      }
      sets.push("duration_days = ?");
      values.push(v);
    }

    if ("device_label" in b) {
      if (!(typeof b.device_label === "string" || b.device_label === null)) {
        return Response.json({ error: "Invalid device_label" }, { status: 400 });
      }
      const v = b.device_label === null ? null : b.device_label.trim() || null;
      sets.push("device_label = ?");
      values.push(v);
    }

    if ("device_type" in b) {
      if (!(typeof b.device_type === "string" || b.device_type === null)) {
        return Response.json({ error: "Invalid device_type" }, { status: 400 });
      }
      const raw = typeof b.device_type === "string" ? b.device_type : "";
      const v = ["any", "pc", "phone", "both"].includes(raw) ? raw : "any";
      sets.push("device_type = ?");
      values.push(v);
    }

    if ("is_unlimited_device" in b) {
      const v = Number(b.is_unlimited_device);
      if (![0, 1].includes(v)) {
        return Response.json({ error: "Invalid is_unlimited_device" }, { status: 400 });
      }
      sets.push("is_unlimited_device = ?");
      values.push(v);

      if (v === 1) {
        sets.push("device_limit = ?");
        values.push(null);
      }
    }

    if ("device_limit" in b) {
      const v = b.device_limit === null ? null : toIntOrNull(b.device_limit);
      if (v !== null && v < 0) {
        return Response.json({ error: "Invalid device_limit" }, { status: 400 });
      }
      sets.push("device_limit = ?");
      values.push(v);
    }

    if ("original_price" in b) {
      const v = b.original_price === null ? null : toNumOrNull(b.original_price);
      if (v === null || v < 0) {
        return Response.json({ error: "Invalid original_price" }, { status: 400 });
      }
      sets.push("original_price = ?");
      values.push(v);
    }

    if ("price" in b) {
      const v = b.price === null ? null : toNumOrNull(b.price);
      if (v === null || v < 0) {
        return Response.json({ error: "Invalid price" }, { status: 400 });
      }
      sets.push("price = ?");
      values.push(v);
    }

    if ("khqr" in b) {
      if (!(typeof b.khqr === "string" || b.khqr === null)) {
        return Response.json({ error: "Invalid khqr" }, { status: 400 });
      }
      const raw = typeof b.khqr === "string" ? b.khqr : "";
      const v = raw.trim() || DEFAULT_KH_QR;
      sets.push("khqr = ?");
      values.push(v);
    }

    if ("usdqr" in b) {
      if (!(typeof b.usdqr === "string" || b.usdqr === null)) {
        return Response.json({ error: "Invalid usdqr" }, { status: 400 });
      }
      const raw = typeof b.usdqr === "string" ? b.usdqr : "";
      const v = raw.trim() || USD_QR_NONE;
      sets.push("usdqr = ?");
      values.push(v);
    }

    if ("is_active" in b) {
      const v = Number(b.is_active);
      if (![0, 1].includes(v)) {
        return Response.json({ error: "Invalid is_active" }, { status: 400 });
      }
      sets.push("is_active = ?");
      values.push(v);
    }

    if (sets.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const [check] = await db.query<RowDataPacket[]>(
      `SELECT id FROM product_variants WHERE id = ? LIMIT 1`,
      [variantId]
    );
    if (!check.length) {
      return Response.json({ error: "Variant not found" }, { status: 404 });
    }

    values.push(variantId);

    let result: ResultSetHeader;
    try {
      const [full] = await db.query<ResultSetHeader>(
        `UPDATE product_variants SET ${sets.join(", ")} WHERE id = ?`,
        values
      );
      result = full;
    } catch (err) {
      if (!isUnknownColumnError(err, DEVICE_TYPE_COLUMN)) {
        throw err;
      }
      const filteredSets: string[] = [];
      const filteredValues: Array<string | number | null> = [];
      sets.forEach((set, idx) => {
        if (set.startsWith("device_type")) return;
        filteredSets.push(set);
        filteredValues.push(values[idx]);
      });
      if (filteredSets.length === 0) {
        return Response.json({ error: "No fields to update" }, { status: 400 });
      }
      filteredValues.push(variantId);
      const [fallback] = await db.query<ResultSetHeader>(
        `UPDATE product_variants SET ${filteredSets.join(", ")} WHERE id = ?`,
        filteredValues
      );
      result = fallback;
    }

    if (result.affectedRows === 0) {
      return Response.json({ error: "Variant not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("UPDATE VARIANT ERROR:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

/* =========================
   DELETE: DISABLE VARIANT (ADMIN)
========================= */
export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const idStr = await readVariantId(ctx);
    const variantId = Number(idStr);

    if (!Number.isFinite(variantId) || variantId <= 0) {
      return Response.json({ error: "Invalid variant id" }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `UPDATE product_variants SET is_active = 0 WHERE id = ?`,
      [variantId]
    );

    if (result.affectedRows === 0) {
      return Response.json({ error: "Variant not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("DISABLE VARIANT ERROR:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
