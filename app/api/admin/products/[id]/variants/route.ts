// app/api/admin/products/[id]/variants/route.ts
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_KH_QR = "/paymentQR/khmer_qr.jpg";
const USD_QR_NONE = "none";

/** Next 15 uses Promise params, Next 14 uses object params */
type RouteCtx = { params: { id: string } | Promise<{ id: string }> };

async function readId(ctx: RouteCtx): Promise<string> {
  const params = await Promise.resolve(ctx.params); // ✅ unwrap object OR promise
  return typeof params.id === "string" ? params.id : "";
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
   GET: LIST VARIANTS (ADMIN)
========================= */
export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ variants: [], error: "Forbidden" }, { status: 403 });
    }

    const idStr = await readId(ctx);
    const productId = Number(idStr);

    if (!Number.isFinite(productId) || productId <= 0) {
      return Response.json({ variants: [], error: "Invalid product id" }, { status: 400 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        CAST(v.id AS UNSIGNED) AS id,
        CAST(v.product_id AS UNSIGNED) AS product_id,
        v.duration_label,
        v.duration_note,
        v.duration_days,
        v.device_label,
        v.device_limit,
        v.is_unlimited_device,
        v.original_price,
        v.price,
        v.khqr,
        v.usdqr,
        v.is_active,
        v.created_at
      FROM product_variants v
      WHERE v.product_id = ?
      ORDER BY v.id DESC
      `,
      [productId]
    );

    return Response.json({ variants: rows ?? [] });
  } catch (err) {
    console.error("LIST VARIANTS ERROR:", err);
    return Response.json({ variants: [], error: "Server error" }, { status: 500 });
  }
}

/* =========================
   POST: CREATE VARIANT (ADMIN)
========================= */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const idStr = await readId(ctx);
    const productId = Number(idStr);

    if (!Number.isFinite(productId) || productId <= 0) {
      return Response.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const b =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

    const duration_label =
      typeof b.duration_label === "string" && b.duration_label.trim()
        ? b.duration_label.trim()
        : null;

    const duration_note =
      typeof b.duration_note === "string" && b.duration_note.trim()
        ? b.duration_note.trim()
        : null;

    const duration_days = toIntOrNull(b.duration_days);

    const device_label =
      typeof b.device_label === "string" && b.device_label.trim()
        ? b.device_label.trim()
        : null;

    const device_limit = toIntOrNull(b.device_limit);

    const is_unlimited_device = Number(b.is_unlimited_device) ? 1 : 0;

    const original_price = toNumOrNull(b.original_price);
    const price = toNumOrNull(b.price);
    const khqr =
      typeof b.khqr === "string" && b.khqr.trim() ? b.khqr.trim() : DEFAULT_KH_QR;
    const usdqr =
      typeof b.usdqr === "string" && b.usdqr.trim() ? b.usdqr.trim() : USD_QR_NONE;

    // must have duration_label OR device_label
    if (!duration_label && !device_label) {
      return Response.json(
        { error: "Variant must have duration_label or device_label" },
        { status: 400 }
      );
    }

    if (original_price === null || original_price < 0) {
      return Response.json({ error: "Invalid original_price" }, { status: 400 });
    }

    if (price === null || price < 0) {
      return Response.json({ error: "Invalid price" }, { status: 400 });
    }

    if (duration_days !== null && duration_days < 0) {
      return Response.json({ error: "Invalid duration_days" }, { status: 400 });
    }

    if (!is_unlimited_device && device_limit !== null && device_limit < 0) {
      return Response.json({ error: "Invalid device_limit" }, { status: 400 });
    }

    const finalDeviceLimit = is_unlimited_device ? null : device_limit;

    const [result] = await db.query<ResultSetHeader>(
      `
      INSERT INTO product_variants
        (
          product_id,
          duration_label, duration_note, duration_days,
          device_label, device_limit, is_unlimited_device,
          original_price, price,
          khqr, usdqr,
          is_active
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        productId,
        duration_label,
        duration_note,
        duration_days,
        device_label,
        finalDeviceLimit,
        is_unlimited_device,
        original_price,
        price,
        khqr,
        usdqr,
      ]
    );

    return Response.json({ success: true, variantId: result.insertId });
  } catch (err) {
    console.error("CREATE VARIANT ERROR:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
