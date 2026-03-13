import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { resolveOrderStatus } from "@/lib/order-status";

type PurchaseRow = RowDataPacket & {
  order_id: number;
  product_id: number;
  title: string;
  slug: string;
  category_name: string | null;
  image_url: string | null;
  is_active: number;
  order_number: string;
  ordered_at: string | Date | null;
  completed_at: string | Date | null;
  state_value: string | null;
  status_value: string | null;
  result_value: string | null;
  qty: number | string | null;
  unit_price: number | string | null;
  product_duration_label: string | null;
  tool_duration_label: string | null;
  product_duration_days: number | null;
  tool_duration_days: number | null;
  product_device_label: string | null;
  tool_device_label: string | null;
  product_device_type: string | null;
  tool_device_type: string | null;
  product_device_limit: number | null;
  tool_device_limit: number | null;
  product_is_unlimited_device: number | null;
  tool_is_unlimited_device: number | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}Z`;
  }
  return trimmed;
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

function isToolCategory(name?: string | null): boolean {
  const normalized = String(name || "").trim().toLowerCase();
  return normalized === "tools" || normalized === "tool";
}

function resolveVariantLabel(row: PurchaseRow): string | null {
  if (isToolCategory(row.category_name)) {
    return row.tool_duration_label ?? row.product_duration_label ?? row.tool_device_label ?? null;
  }
  return row.product_duration_label ?? row.product_device_label ?? null;
}

function resolveDurationDays(row: PurchaseRow): number | null {
  const value = isToolCategory(row.category_name) ? row.tool_duration_days ?? row.product_duration_days : row.product_duration_days;
  return value === null || value === undefined ? null : Number(value);
}

function resolveDeviceType(row: PurchaseRow): string | null {
  return isToolCategory(row.category_name) ? row.tool_device_type ?? row.product_device_type : row.product_device_type;
}

function resolveDeviceLimit(row: PurchaseRow): number | null {
  const value = isToolCategory(row.category_name) ? row.tool_device_limit ?? row.product_device_limit : row.product_device_limit;
  return value === null || value === undefined ? null : Number(value);
}

function resolveUnlimitedDevice(row: PurchaseRow): boolean {
  const value = isToolCategory(row.category_name)
    ? row.tool_is_unlimited_device ?? row.product_is_unlimited_device
    : row.product_is_unlimited_device;
  return Number(value ?? 0) === 1;
}

function resolveCompletedStatus(row: Pick<PurchaseRow, "state_value" | "status_value" | "result_value">): boolean {
  const stateSource = row.state_value ?? row.status_value;
  return resolveOrderStatus(stateSource, row.result_value) === "completed";
}

async function loadPurchaseRows(userId: number): Promise<PurchaseRow[]> {
  const hasState = await hasColumn("orders", "state");
  const hasStatus = await hasColumn("orders", "status");
  const hasResult = await hasColumn("orders", "result");
  const hasDeliveredAt = await hasColumn("orders", "delivered_at");
  const hasReviewedAt = await hasColumn("orders", "reviewed_at");
  const hasUpdatedAt = await hasColumn("orders", "updated_at");
  const hasToolVariantId = await hasColumn("order_items", "tool_variant_id");

  const hasProductDeviceLabel = await hasColumn("product_variants", "device_label");
  const hasProductDeviceType = await hasColumn("product_variants", "device_type");
  const hasProductDeviceLimit = await hasColumn("product_variants", "device_limit");
  const hasProductUnlimitedDevice = await hasColumn("product_variants", "is_unlimited_device");

  const stateExpr = hasState ? "o.state" : "NULL";
  const statusExpr = hasStatus ? "o.status" : "NULL";
  const resultExpr = hasResult ? "o.result" : "NULL";
  const completedAtExpr = hasDeliveredAt
    ? "o.delivered_at"
    : hasReviewedAt
      ? "o.reviewed_at"
      : hasUpdatedAt
        ? "o.updated_at"
        : "o.created_at";
  const toolVariantRef = hasToolVariantId ? "oi.tool_variant_id" : "oi.variant_id";
  const productDeviceLabelExpr = hasProductDeviceLabel ? "pv.device_label" : "NULL";
  const productDeviceTypeExpr = hasProductDeviceType ? "pv.device_type" : "NULL";
  const productDeviceLimitExpr = hasProductDeviceLimit ? "pv.device_limit" : "NULL";
  const productUnlimitedDeviceExpr = hasProductUnlimitedDevice ? "pv.is_unlimited_device" : "0";

  try {
    const [rows] = await db.query<PurchaseRow[]>(
      `
      SELECT
        o.id AS order_id,
        p.id AS product_id,
        p.title,
        p.slug,
        pc.name AS category_name,
        p.image_url,
        p.is_active,
        o.order_number,
        o.created_at AS ordered_at,
        ${completedAtExpr} AS completed_at,
        ${stateExpr} AS state_value,
        ${statusExpr} AS status_value,
        ${resultExpr} AS result_value,
        oi.qty,
        oi.unit_price,
        pv.duration_label AS product_duration_label,
        tv.duration_label AS tool_duration_label,
        pv.duration_days AS product_duration_days,
        tv.duration_days AS tool_duration_days,
        ${productDeviceLabelExpr} AS product_device_label,
        tv.device_label AS tool_device_label,
        ${productDeviceTypeExpr} AS product_device_type,
        tv.device_type AS tool_device_type,
        ${productDeviceLimitExpr} AS product_device_limit,
        tv.device_limit AS tool_device_limit,
        ${productUnlimitedDeviceExpr} AS product_is_unlimited_device,
        COALESCE(tv.is_unlimited_device, 0) AS tool_is_unlimited_device
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      LEFT JOIN tool_variants tv ON tv.id = ${toolVariantRef}
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, oi.id DESC
      `,
      [userId]
    );
    return rows;
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (!message.includes("tool_variants")) {
      throw err;
    }

    const [rows] = await db.query<PurchaseRow[]>(
      `
      SELECT
        o.id AS order_id,
        p.id AS product_id,
        p.title,
        p.slug,
        pc.name AS category_name,
        p.image_url,
        p.is_active,
        o.order_number,
        o.created_at AS ordered_at,
        ${completedAtExpr} AS completed_at,
        ${stateExpr} AS state_value,
        ${statusExpr} AS status_value,
        ${resultExpr} AS result_value,
        oi.qty,
        oi.unit_price,
        pv.duration_label AS product_duration_label,
        NULL AS tool_duration_label,
        pv.duration_days AS product_duration_days,
        NULL AS tool_duration_days,
        ${productDeviceLabelExpr} AS product_device_label,
        NULL AS tool_device_label,
        ${productDeviceTypeExpr} AS product_device_type,
        NULL AS tool_device_type,
        ${productDeviceLimitExpr} AS product_device_limit,
        NULL AS tool_device_limit,
        ${productUnlimitedDeviceExpr} AS product_is_unlimited_device,
        0 AS tool_is_unlimited_device
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, oi.id DESC
      `,
      [userId]
    );
    return rows;
  }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await loadPurchaseRows(auth.userId);

    const purchases = rows
      .filter((row) => resolveCompletedStatus(row))
      .map((row) => {
        const completedAt = toDate(row.completed_at) ?? toDate(row.ordered_at);
        const orderedAt = toDate(row.ordered_at);
        const durationDays = resolveDurationDays(row);
        return {
          orderId: row.order_id,
          productId: row.product_id,
          title: row.title,
          slug: row.slug,
          categoryName: row.category_name,
          imageUrl: row.image_url,
          orderNumber: row.order_number,
          orderedAt,
          completedAt,
          quantity: toNumber(row.qty),
          unitPrice: toNumber(row.unit_price),
          variantLabel: resolveVariantLabel(row),
          durationDays,
          isActive: Number(row.is_active) === 1,
          deviceType: resolveDeviceType(row),
          deviceLimit: resolveDeviceLimit(row),
          unlimitedDevice: resolveUnlimitedDevice(row),
          accessEnd:
            durationDays && Number.isFinite(Number(durationDays)) && completedAt
              ? (() => {
                  const startDate = new Date(completedAt);
                  if (Number.isNaN(startDate.getTime())) return null;
                  return new Date(
                    startDate.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000
                  ).toISOString();
                })()
              : null,
        };
      });

    return NextResponse.json({ products: purchases });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
