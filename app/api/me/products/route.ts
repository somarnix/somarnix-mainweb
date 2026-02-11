import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

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
  qty: number | string | null;
  unit_price: number | string | null;
  variant_label: string | null;
  duration_days: number | null;
  device_type: string | null;
  device_limit: number | null;
  is_unlimited_device: number | null;
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

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let rows: PurchaseRow[] = [];
    const [orderCols] = await db.query<RowDataPacket[]>(
      `
      SELECT COLUMN_NAME
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'orders'
      `
    );
    const [variantCols] = await db.query<RowDataPacket[]>(
      `
      SELECT COLUMN_NAME
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'product_variants'
      `
    );

    const orderColSet = new Set(orderCols.map((c) => String(c.COLUMN_NAME)));
    const variantColSet = new Set(variantCols.map((c) => String(c.COLUMN_NAME)));

    const hasState = orderColSet.has("state");
    const hasStatus = orderColSet.has("status");
    const hasDeliveredAt = orderColSet.has("delivered_at");
    const hasReviewedAt = orderColSet.has("reviewed_at");
    const hasUpdatedAt = orderColSet.has("updated_at");

    const hasDeviceLabel = variantColSet.has("device_label");
    const hasDeviceType = variantColSet.has("device_type");
    const hasDeviceLimit = variantColSet.has("device_limit");
    const hasUnlimitedDevice = variantColSet.has("is_unlimited_device");

    const completedAtExpr = hasDeliveredAt
      ? "o.delivered_at"
      : hasReviewedAt
        ? "o.reviewed_at"
        : hasUpdatedAt
          ? "o.updated_at"
          : "o.created_at";

    let stateFilter = "";
    if (hasState && hasStatus) {
      stateFilter =
        "(o.state IN ('completed','complete') OR o.status IN ('completed','complete'))";
    } else if (hasState) {
      stateFilter = "o.state IN ('completed','complete')";
    } else if (hasStatus) {
      stateFilter = "o.status IN ('completed','complete')";
    } else {
      stateFilter = "1=0";
    }

    const deviceLabelExpr = hasDeviceLabel ? "pv.device_label" : "NULL";
    const deviceTypeExpr = hasDeviceType ? "pv.device_type" : "NULL";
    const deviceLimitExpr = hasDeviceLimit ? "pv.device_limit" : "NULL";
    const unlimitedDeviceExpr = hasUnlimitedDevice ? "pv.is_unlimited_device" : "0";

    const [data] = await db.query<PurchaseRow[]>(
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
        oi.qty,
        oi.unit_price,
        COALESCE(pv.duration_label, ${deviceLabelExpr}) AS variant_label,
        pv.duration_days,
        ${deviceTypeExpr} AS device_type,
        ${deviceLimitExpr} AS device_limit,
        ${unlimitedDeviceExpr} AS is_unlimited_device
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.user_id = ? AND ${stateFilter}
      ORDER BY o.created_at DESC, oi.id DESC
      `,
      [auth.userId]
    );
    rows = data;

    const purchases = rows.map(row => ({
      orderId: row.order_id,
      productId: row.product_id,
      title: row.title,
      slug: row.slug,
      categoryName: row.category_name,
      imageUrl: row.image_url,
      orderNumber: row.order_number,
      orderedAt: toDate(row.ordered_at),
      completedAt: toDate(row.completed_at),
      quantity: toNumber(row.qty),
      unitPrice: toNumber(row.unit_price),
      variantLabel: row.variant_label,
      durationDays: row.duration_days,
      isActive: Number(row.is_active) === 1,
      deviceType: row.device_type,
      deviceLimit: row.device_limit,
      unlimitedDevice: Number(row.is_unlimited_device) === 1,
      accessEnd:
        row.duration_days && Number.isFinite(Number(row.duration_days))
          ? (() => {
              const start = toDate(row.completed_at) ?? toDate(row.ordered_at);
              if (!start) return null;
              const startDate = new Date(start);
              if (Number.isNaN(startDate.getTime())) return null;
              return new Date(
                startDate.getTime() + Number(row.duration_days) * 24 * 60 * 60 * 1000
              ).toISOString();
            })()
          : null,
    }));

    return NextResponse.json({ products: purchases });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
