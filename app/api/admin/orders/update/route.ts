import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
type State =
  | "pending"
  | "approved"
  | "delivering"
  | "completed"
  | "cancelled"
  | "resolution";
type Result = "none" | "done" | "failed";

function deriveResultFromState(state: State): Result {
  if (state === "completed") return "done";
  if (state === "resolution" || state === "cancelled") return "failed";
  return "none";
}

type OrderRow = RowDataPacket & { state: State; stock_reserved?: number | null };
type OrderItemRow = RowDataPacket & { product_id: number; qty: number };
type ToolOrderItemRow = RowDataPacket & {
  order_item_id: number;
  product_id: number;
  product_title: string;
  product_slug: string;
  qty: number;
  duration_days: number | null;
  device_limit: number | null;
  is_unlimited_device: number | null;
};

function makeLicenseKey(prefix = "LIC-TOOL"): string {
  const rand1 = Math.random().toString(36).slice(2, 8).toUpperCase();
  const rand2 = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${stamp}-${rand1}-${rand2}`;
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatExpiry(expiresAt: Date | null): string {
  if (!expiresAt) return "No expiry";
  return expiresAt.toLocaleString();
}

function normalizeQty(qty: unknown): number {
  const n = Number(qty ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function normalizeMaxDevices(limit: number | null, isUnlimited: number | null): number {
  if (Number(isUnlimited ?? 0) === 1) return 9999;
  const n = Number(limit ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

async function getToolOrderItems(orderId: number): Promise<ToolOrderItemRow[]> {
  const [toolVariantColRows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'order_items'
      AND column_name = 'tool_variant_id'
    LIMIT 1
    `
  );
  const hasToolVariantId = toolVariantColRows.length > 0;
  const toolVariantRef = hasToolVariantId ? "oi.tool_variant_id" : "oi.variant_id";
  try {
    const [rows] = await db.query<ToolOrderItemRow[]>(
      `
      SELECT
        oi.id AS order_item_id,
        oi.product_id,
        p.title AS product_title,
        p.slug AS product_slug,
        oi.qty,
        tv.duration_days,
        tv.device_limit,
        tv.is_unlimited_device
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN tool_variants tv ON tv.id = ${toolVariantRef}
      WHERE oi.order_id = ? AND LOWER(pc.name) = 'tools'
      `,
      [orderId]
    );
    return rows;
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (!message.includes("tool_variants")) {
      throw err;
    }
  }

  const [rows] = await db.query<ToolOrderItemRow[]>(
    `
    SELECT
      oi.id AS order_item_id,
      oi.product_id,
      p.title AS product_title,
      p.slug AS product_slug,
      oi.qty,
      pv.duration_days,
      NULL AS device_limit,
      NULL AS is_unlimited_device
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN product_variants pv ON pv.id = oi.variant_id
    WHERE oi.order_id = ? AND LOWER(pc.name) = 'tools'
    `,
    [orderId]
  );
  return rows;
}

async function hasToolLicenseOrderIdColumn(): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'tool_license_keys'
      AND column_name = 'order_id'
    LIMIT 1
    `
  );
  return rows.length > 0;
}

async function createAutoToolLicenses(orderId: number, userId: number) {
  const toolItems = await getToolOrderItems(orderId);
  const withOrderId = await hasToolLicenseOrderIdColumn();
  const created: Array<{
    productId: number;
    productTitle: string;
    productSlug: string;
    licenseKey: string;
    expiresAt: Date | null;
    maxDevices: number;
  }> = [];

  for (const item of toolItems) {
    const qty = normalizeQty(item.qty);
    if (qty <= 0) continue;

    const baseExpiresAt =
      Number(item.duration_days ?? 0) > 0
        ? new Date(Date.now() + Number(item.duration_days) * 24 * 60 * 60 * 1000)
        : null;
    const maxDevices = normalizeMaxDevices(item.device_limit, item.is_unlimited_device);

    for (let i = 0; i < qty; i += 1) {
      const licenseKey = makeLicenseKey("LIC-TOOL");
      const expiresAt = toDateOrNull(baseExpiresAt);
      if (withOrderId) {
        await db.query<ResultSetHeader>(
          `
          INSERT INTO tool_license_keys
            (order_id, product_id, user_id, license_key, max_devices, status, expires_at)
          VALUES
            (?, ?, ?, ?, ?, 'active', ?)
          `,
          [orderId, item.product_id, userId, licenseKey, maxDevices, expiresAt]
        );
      } else {
        await db.query<ResultSetHeader>(
          `
          INSERT INTO tool_license_keys
            (product_id, user_id, license_key, max_devices, status, expires_at)
          VALUES
            (?, ?, ?, ?, 'active', ?)
          `,
          [item.product_id, userId, licenseKey, maxDevices, expiresAt]
        );
      }

      created.push({
        productId: item.product_id,
        productTitle: item.product_title,
        productSlug: item.product_slug,
        licenseKey,
        expiresAt,
        maxDevices,
      });
    }
  }

  return created;
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    orderId?: number;
    state?: State;
    result?: Result;
    delivery_title?: string | null;
    delivery_message?: string | null;
  };

  if (!body.orderId || !body.state) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const nextResult: Result =
    body.result && ["none", "done", "failed"].includes(body.result)
      ? body.result
      : deriveResultFromState(body.state);

  const deliveryTitle =
    typeof body.delivery_title === "string" &&
    body.delivery_title.trim() !== ""
      ? body.delivery_title.trim()
      : null;

  const deliveryMessage =
    typeof body.delivery_message === "string" &&
    body.delivery_message.trim() !== ""
      ? body.delivery_message.trim()
      : null;

  let existingRows: Array<OrderRow & { user_id?: number }> = [];
  try {
    const [rows] = await db.query<Array<OrderRow & { user_id: number }>>(
      "SELECT state, stock_reserved, user_id FROM orders WHERE id = ? LIMIT 1",
      [body.orderId]
    );
    existingRows = rows;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes("unknown column") || !message.includes("stock_reserved")) {
      throw err;
    }
    const [rows] = await db.query<Array<OrderRow & { user_id: number }>>(
      "SELECT state, user_id FROM orders WHERE id = ? LIMIT 1",
      [body.orderId]
    );
    existingRows = rows;
  }
  if (existingRows.length === 0) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  const previousState = existingRows[0].state;
  const orderUserId = Number(existingRows[0].user_id ?? 0);
  const stockReserved = Number(existingRows[0].stock_reserved ?? 0) === 1;
  const shouldAutoLicense =
    body.state === "completed" && previousState !== "completed" && orderUserId > 0;
  let autoLicenses: Array<{
    productId: number;
    productTitle: string;
    productSlug: string;
    licenseKey: string;
    expiresAt: Date | null;
    maxDevices: number;
  }> = [];

  if (shouldAutoLicense) {
    autoLicenses = await createAutoToolLicenses(body.orderId, orderUserId);
  }

  const autoDeliveryTitle = autoLicenses.length > 0 ? "Tool license key" : null;
  const autoDeliveryMessage =
    autoLicenses.length > 0
      ? autoLicenses
          .map(
            (row, idx) =>
              `${idx + 1}. ${row.productTitle} (${row.productSlug})\n` +
              `License key: ${row.licenseKey}\n` +
              `Max devices: ${row.maxDevices >= 9999 ? "Unlimited" : row.maxDevices}\n` +
              `Expires: ${formatExpiry(row.expiresAt)}`
          )
          .join("\n\n")
      : null;

  const finalDeliveryTitle = deliveryTitle ?? autoDeliveryTitle;
  const finalDeliveryMessage = deliveryMessage ?? autoDeliveryMessage;

  const [r] = await db.query<ResultSetHeader>(
    `
    UPDATE orders
    SET
      state = ?,
      result = ?,
      delivery_title = ?,
      delivery_message = ?,
      delivered_at = IF(? IS NOT NULL, NOW(), delivered_at),
      reviewed_by = ?,
      reviewed_at = NOW()
    WHERE id = ?
    `,
    [
      body.state,
      nextResult,
      finalDeliveryTitle,
      finalDeliveryMessage,
      finalDeliveryMessage,
      auth.userId,
      body.orderId,
    ]
  );

  if (r.affectedRows === 0) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  if (body.state === "completed" && previousState !== "completed" && !stockReserved) {
    const [items] = await db.query<OrderItemRow[]>(
      `
      SELECT oi.product_id, oi.qty
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ? AND p.is_unlimited_stock = 0
      `,
      [body.orderId]
    );

    for (const item of items) {
      const qty = Number(item.qty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      await db.query<ResultSetHeader>(
        `
        UPDATE products
        SET stock_qty = GREATEST(0, stock_qty - ?)
        WHERE id = ? AND is_unlimited_stock = 0
        `,
        [qty, item.product_id]
      );
    }

    await db.query<ResultSetHeader>(
      `UPDATE orders SET stock_reserved = 1 WHERE id = ?`,
      [body.orderId]
    );
  }

  if (
    (body.state === "approved" || body.state === "completed") &&
    previousState !== "approved" &&
    previousState !== "completed"
  ) {
    await db.query<ResultSetHeader>(
      `
      UPDATE video_course_purchases vcp
      JOIN video_course_plans vplan ON vplan.id = vcp.plan_id
      SET
        vcp.status = 'active',
        vcp.access_start = NOW(),
        vcp.access_end = CASE
          WHEN vplan.access_type = 'months' AND vplan.duration_days IS NOT NULL
            THEN DATE_ADD(NOW(), INTERVAL vplan.duration_days DAY)
          ELSE NULL
        END
      WHERE vcp.order_id = ?
      `,
      [body.orderId]
    );

    await db.query<ResultSetHeader>(
      `
      UPDATE video_subscriptions vsub
      JOIN video_subscription_plans spl ON spl.id = vsub.plan_id
      SET
        vsub.status = 'active',
        vsub.access_start = NOW(),
        vsub.access_end = DATE_ADD(NOW(), INTERVAL spl.duration_days DAY)
      WHERE vsub.order_id = ?
      `,
      [body.orderId]
    );
  }

  if (body.state === "cancelled" && previousState !== "cancelled" && stockReserved) {
    await db.query<ResultSetHeader>(
      `
      UPDATE video_course_purchases
      SET status = 'cancelled'
      WHERE order_id = ?
      `,
      [body.orderId]
    );

    await db.query<ResultSetHeader>(
      `
      UPDATE video_subscriptions
      SET status = 'cancelled'
      WHERE order_id = ?
      `,
      [body.orderId]
    );

    const [items] = await db.query<OrderItemRow[]>(
      `
      SELECT oi.product_id, oi.qty
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ? AND p.is_unlimited_stock = 0
      `,
      [body.orderId]
    );

    for (const item of items) {
      const qty = Number(item.qty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      await db.query<ResultSetHeader>(
        `
        UPDATE products
        SET stock_qty = stock_qty + ?
        WHERE id = ? AND is_unlimited_stock = 0
        `,
        [qty, item.product_id]
      );
    }

    await db.query<ResultSetHeader>(
      `UPDATE orders SET stock_reserved = 0 WHERE id = ?`,
      [body.orderId]
    );
  }

  if (body.state === "resolution" && previousState !== "resolution" && stockReserved) {
    const [items] = await db.query<OrderItemRow[]>(
      `
      SELECT oi.product_id, oi.qty
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ? AND p.is_unlimited_stock = 0
      `,
      [body.orderId]
    );

    for (const item of items) {
      const qty = Number(item.qty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      await db.query<ResultSetHeader>(
        `
        UPDATE products
        SET stock_qty = stock_qty + ?
        WHERE id = ? AND is_unlimited_stock = 0
        `,
        [qty, item.product_id]
      );
    }

    await db.query<ResultSetHeader>(
      `UPDATE orders SET stock_reserved = 0 WHERE id = ?`,
      [body.orderId]
    );
  }
  return Response.json({ success: true, auto_licenses_created: autoLicenses.length });
}
