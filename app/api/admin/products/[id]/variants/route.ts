// app/api/admin/products/[id]/variants/route.ts
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_KH_QR = "/paymentQR/khmer_qr.jpg";
const USD_QR_NONE = "none";
const GLOBAL_MAX_DEVICES = 10;

const DEVICE_COLUMNS = [
  "device_label",
  "device_type",
  "device_limit",
  "is_unlimited_device",
] as const;

/** Next 15 uses Promise params, Next 14 uses object params */
type RouteCtx = { params: { id: string } | Promise<{ id: string }> };

async function readId(ctx: RouteCtx): Promise<string> {
  const params = await Promise.resolve(ctx.params);
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
  return DEVICE_COLUMNS.every((column) => present.has(column));
}

async function isToolsProduct(productId: number): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM products p
    JOIN product_categories c ON c.id = p.category_id
    WHERE p.id = ? AND LOWER(c.name) = 'tools'
    LIMIT 1
    `,
    [productId]
  );
  return rows.length > 0;
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

    const toolsProduct = await isToolsProduct(productId);
    const tableName = toolsProduct ? "tool_variants" : "product_variants";
    const withDeviceColumns = toolsProduct ? true : await hasAllDeviceColumns();

    const [rows] = await db.query<RowDataPacket[]>(
      withDeviceColumns
        ? `
          SELECT
            CAST(v.id AS UNSIGNED) AS id,
            CAST(v.product_id AS UNSIGNED) AS product_id,
            v.duration_label,
            v.duration_note,
            v.duration_days,
            v.device_label,
            v.device_type,
            v.device_limit,
            v.is_unlimited_device,
            v.original_price,
            v.price,
            v.khqr,
            v.usdqr,
            v.is_active,
            v.created_at
          FROM ${tableName} v
          WHERE v.product_id = ?
          ORDER BY v.id DESC
        `
        : `
          SELECT
            CAST(v.id AS UNSIGNED) AS id,
            CAST(v.product_id AS UNSIGNED) AS product_id,
            v.duration_label,
            v.duration_note,
            v.duration_days,
            NULL AS device_label,
            'any' AS device_type,
            NULL AS device_limit,
            0 AS is_unlimited_device,
            v.original_price,
            v.price,
            v.khqr,
            v.usdqr,
            v.is_active,
            v.created_at
          FROM ${tableName} v
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

    const device_type =
      typeof b.device_type === "string" &&
      ["any", "pc", "phone", "both"].includes(b.device_type)
        ? b.device_type
        : "any";

    const device_limit = toIntOrNull(b.device_limit);
    const is_unlimited_device = Number(b.is_unlimited_device) ? 1 : 0;

    const original_price = toNumOrNull(b.original_price);
    const price = toNumOrNull(b.price);
    const khqr =
      typeof b.khqr === "string" && b.khqr.trim() ? b.khqr.trim() : DEFAULT_KH_QR;
    const usdqr =
      typeof b.usdqr === "string" && b.usdqr.trim() ? b.usdqr.trim() : USD_QR_NONE;

    if (!duration_label) {
      return Response.json({ error: "Variant must have duration_label" }, { status: 400 });
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

    const toolsProduct = await isToolsProduct(productId);
    if (toolsProduct && !is_unlimited_device) {
      if (
        device_limit === null ||
        !Number.isFinite(device_limit) ||
        device_limit < 1 ||
        device_limit > GLOBAL_MAX_DEVICES
      ) {
        return Response.json(
          { error: `device_limit must be between 1 and ${GLOBAL_MAX_DEVICES}` },
          { status: 400 }
        );
      }
    }
    const finalDeviceLimit = is_unlimited_device
      ? GLOBAL_MAX_DEVICES
      : toolsProduct && device_limit !== null
        ? Math.floor(device_limit)
        : device_limit;
    const tableName = toolsProduct ? "tool_variants" : "product_variants";
    const withDeviceColumns = toolsProduct ? true : await hasAllDeviceColumns();

    const [result] = await db.query<ResultSetHeader>(
      withDeviceColumns
        ? `
          INSERT INTO ${tableName}
            (
              product_id,
              duration_label, duration_note, duration_days,
              device_label, device_type, device_limit, is_unlimited_device,
              original_price, price,
              khqr, usdqr,
              is_active
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `
        : `
          INSERT INTO ${tableName}
            (
              product_id,
              duration_label, duration_note, duration_days,
              original_price, price,
              khqr, usdqr,
              is_active
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `,
      withDeviceColumns
        ? [
            productId,
            duration_label,
            duration_note,
            duration_days,
            device_label,
            device_type,
            finalDeviceLimit,
            is_unlimited_device,
            original_price,
            price,
            khqr,
            usdqr,
          ]
        : [
            productId,
            duration_label,
            duration_note,
            duration_days,
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
