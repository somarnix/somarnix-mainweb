import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export const runtime = "nodejs";
const GLOBAL_MAX_DEVICES = 10;

type ProductRow = RowDataPacket & {
  id: number;
  slug: string;
  title: string;
  is_active: number;
};

type OrderRow = RowDataPacket & {
  order_id: number;
  created_at: Date | string;
  variant_id: number;
  duration_days: number | null;
  device_limit: number | null;
  is_unlimited_device: number;
  device_type: "any" | "pc" | "phone" | "both" | null;
};

type DeviceRow = RowDataPacket & { device_id: string };

function detectDeviceType(ua: string): "pc" | "phone" {
  const lower = ua.toLowerCase();
  if (lower.includes("mobi") || lower.includes("android") || lower.includes("iphone") || lower.includes("ipad")) {
    return "phone";
  }
  return "pc";
}

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
  const auth = await getAuthUser(req);
  if (!auth) {
    return Response.json({ hasAccess: false, reason: "login_required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  const deviceId = (url.searchParams.get("deviceId") || "").trim();

  if (!slug) {
    return Response.json({ hasAccess: false, reason: "slug_required" }, { status: 400 });
  }
  if (!deviceId) {
    return Response.json({ hasAccess: false, reason: "device_id_required" }, { status: 400 });
  }

  const [productRows] = await db.query<ProductRow[]>(
    `
    SELECT p.id, p.slug, p.title, p.is_active
    FROM products p
    JOIN product_categories c ON c.id = p.category_id
    WHERE p.slug = ? AND c.name = 'tools'
    LIMIT 1
    `,
    [slug]
  );

  if (productRows.length === 0) {
    return Response.json({ hasAccess: false, reason: "tool_not_found" }, { status: 404 });
  }

  const product = productRows[0];
  if (!product.is_active) {
    return Response.json({ hasAccess: false, reason: "tool_disabled" }, { status: 403 });
  }

  const hasOrderToolVariantId = await hasColumn("order_items", "tool_variant_id");
  const toolVariantJoinRef = hasOrderToolVariantId ? "oi.tool_variant_id" : "oi.variant_id";

  let orders: OrderRow[] = [];
  try {
    const [rows] = await db.query<OrderRow[]>(
      `
      SELECT
        o.id AS order_id,
        COALESCE(o.delivered_at, o.reviewed_at, o.updated_at, o.created_at) AS created_at,
        v.id AS variant_id,
        v.duration_days,
        v.device_limit AS device_limit,
        v.is_unlimited_device AS is_unlimited_device,
        v.device_type AS device_type
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN tool_variants v ON v.id = ${toolVariantJoinRef}
      WHERE o.user_id = ?
        AND oi.product_id = ?
        AND o.state IN ('approved','completed')
        AND o.result <> 'failed'
      ORDER BY o.created_at DESC
      LIMIT 1
      `,
      [auth.userId, product.id]
    );
    orders = rows;
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (!message.includes("tool_variants")) {
      throw err;
    }

    const [rows] = await db.query<OrderRow[]>(
      `
      SELECT
        o.id AS order_id,
        COALESCE(o.delivered_at, o.reviewed_at, o.updated_at, o.created_at) AS created_at,
        v.id AS variant_id,
        v.duration_days,
        NULL AS device_limit,
        1 AS is_unlimited_device,
        'any' AS device_type
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN product_variants v ON v.id = oi.variant_id
      WHERE o.user_id = ?
        AND oi.product_id = ?
        AND o.state IN ('approved','completed')
        AND o.result <> 'failed'
      ORDER BY o.created_at DESC
      LIMIT 1
      `,
      [auth.userId, product.id]
    );
    orders = rows;
  }

  if (orders.length === 0) {
    return Response.json({ hasAccess: false, reason: "not_purchased" }, { status: 200 });
  }

  const order = orders[0];
  const start = new Date(order.created_at);
  const durationDays = order.duration_days;
  const accessEnd = durationDays && Number.isFinite(durationDays)
    ? new Date(start.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000)
    : null;

  if (accessEnd && accessEnd.getTime() < Date.now()) {
    return Response.json({ hasAccess: false, reason: "expired", accessEnd }, { status: 200 });
  }

  const userAgent = req.headers.get("user-agent") || "";
  const clientDevice = detectDeviceType(userAgent);
  const deviceType = order.device_type || "any";

  if ((deviceType === "pc" && clientDevice !== "pc") || (deviceType === "phone" && clientDevice !== "phone")) {
    return Response.json({ hasAccess: false, reason: "device_not_allowed", deviceType }, { status: 200 });
  }

  const isUnlimited = Number(order.is_unlimited_device) === 1;
  const configuredDeviceLimit = Math.max(1, Number(order.device_limit ?? 1) || 1);
  const deviceLimit = isUnlimited
    ? GLOBAL_MAX_DEVICES
    : Math.min(GLOBAL_MAX_DEVICES, configuredDeviceLimit);

  const [exists] = await db.query<DeviceRow[]>(
    `
    SELECT device_id
    FROM tool_device_access
    WHERE user_id = ? AND product_id = ? AND device_id = ?
    LIMIT 1
    `,
    [auth.userId, product.id, deviceId]
  );

  if (exists.length === 0) {
    const [countRows] = await db.query<RowDataPacket[]>(
      `
      SELECT COUNT(*) AS total
      FROM tool_device_access
      WHERE user_id = ? AND product_id = ?
      `,
      [auth.userId, product.id]
    );
    const total = Number(countRows[0]?.total ?? 0);
    if (total >= deviceLimit) {
      return Response.json({ hasAccess: false, reason: "device_limit", deviceLimit }, { status: 200 });
    }

    await db.query<ResultSetHeader>(
      `
      INSERT INTO tool_device_access (user_id, product_id, device_id, device_type)
      VALUES (?, ?, ?, ?)
      `,
      [auth.userId, product.id, deviceId, clientDevice]
    );
  } else {
    await db.query<ResultSetHeader>(
      `
      UPDATE tool_device_access
      SET last_used_at = NOW()
      WHERE user_id = ? AND product_id = ? AND device_id = ?
      `,
      [auth.userId, product.id, deviceId]
    );
  }

  return Response.json({
    hasAccess: true,
    product: { id: product.id, slug: product.slug, title: product.title },
    variantId: order.variant_id,
    accessEnd,
    deviceType,
    deviceLimit,
  });
}
