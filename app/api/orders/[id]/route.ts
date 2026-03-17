import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { syncExpiredUnconfirmedOrders } from "@/lib/order-expiry";
import type { OrderStatus } from "@/lib/order-status";
import { resolveOrderStatus } from "@/lib/order-status";

const UNKNOWN_COLUMN_MARKERS = [
  "Unknown column 'state'",
  "Unknown column 'result'",
  "Unknown column 'delivery_title'",
  "Unknown column 'delivery_message'",
  "Unknown column 'delivered_at'",
];

type OrderStateRow = RowDataPacket & {
  id: number;
  order_number: string;
  user_id: number;
  state: string | null;
  result: string | null;
  has_payment_submission: number;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  total: number | string | null;
  created_at: string | Date | null;
  delivery_title: string | null;
  delivery_message: string | null;
  delivered_at: string | Date | null;
  reviewed_at: string | Date | null;
  review_note: string | null;
};

type OrderLegacyRow = RowDataPacket & {
  id: number;
  order_number: string;
  user_id: number;
  status: string | null;
  has_payment_submission: number;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  total: number | string | null;
  created_at: string | Date | null;
  reviewed_at: string | Date | null;
  review_note: string | null;
};

type ItemRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  category_name: string | null;
  image_url: string | null;
  is_active: number;
  qty: number | string | null;
  unit_price: number | string | null;
  duration_label: string | null;
  device_label: string | null;
  duration_days: number | null;
  order_info_json: string | null;
  order_fields_json: string | null;
};

type PaymentRow = RowDataPacket & {
  account_id: string;
  payment_id: string;
  payment_apv: string;
  paid_at: string | Date | null;
  method: string;
};

type VideoCourseItemRow = RowDataPacket & {
  id: number;
  course_title: string;
  plan_name: string;
  access_type: string;
  duration_days: number | null;
  access_start: string | Date | null;
  access_end: string | Date | null;
  status: string;
};

type VideoSubscriptionRow = RowDataPacket & {
  id: number;
  plan_name: string;
  duration_days: number;
  access_start: string | Date | null;
  access_end: string | Date | null;
  status: string;
};

function isUnknownColumnError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return UNKNOWN_COLUMN_MARKERS.some(marker =>
    err.message.toLowerCase().includes(marker.toLowerCase())
  );
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toDateString(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}Z`;
  }
  return trimmed;
}

function normalizeStateRowStatus(row: OrderStateRow): OrderStatus {
  return resolveOrderStatus(row.state, row.result);
}

type OrderColumn = "id" | "order_number";

async function fetchOrderByColumn(
  userId: number,
  column: OrderColumn,
  value: number | string
) {
  const whereColumn = column === "id" ? "id" : "order_number";
  const whereValue =
    column === "id" ? Number(value) : String(value);

  try {
    const [rows] = await db.query<OrderStateRow[]>(
      `
      SELECT
        id,
        order_number,
        user_id,
        state,
        result,
        EXISTS(SELECT 1 FROM payments p WHERE p.order_id = orders.id) AS has_payment_submission,
        subtotal,
        tax_amount,
        total,
        created_at,
        delivery_title,
        delivery_message,
        delivered_at,
        reviewed_at,
        review_note
      FROM orders
      WHERE ${whereColumn} = ? AND user_id = ?
      LIMIT 1
      `,
      [whereValue, userId]
    );

    if (rows.length === 0) {
      return { mode: "state" as const, order: null };
    }

    return { mode: "state" as const, order: rows[0] };
  } catch (err) {
    if (!isUnknownColumnError(err)) {
      throw err;
    }

    const [rows] = await db.query<OrderLegacyRow[]>(
      `
      SELECT
        id,
        order_number,
        user_id,
        status,
        EXISTS(SELECT 1 FROM payments p WHERE p.order_id = orders.id) AS has_payment_submission,
        subtotal,
        tax_amount,
        total,
        created_at,
        reviewed_at,
        review_note
      FROM orders
      WHERE ${whereColumn} = ? AND user_id = ?
      LIMIT 1
      `,
      [whereValue, userId]
    );

    if (rows.length === 0) {
      return { mode: "legacy" as const, order: null };
    }

    return { mode: "legacy" as const, order: rows[0] };
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routeParams = await ctx.params;

  const fallbackId = (() => {
    try {
      const url = new URL(req.url);
      const segments = url.pathname.split("/");
      return segments[segments.length - 1] ?? "";
    } catch {
      return "";
    }
  })();

  const identifierRaw = ((routeParams?.id ?? fallbackId) ?? "").trim();
  if (!identifierRaw) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  try {
    await syncExpiredUnconfirmedOrders();

    const [variantCols] = await db.query<RowDataPacket[]>(
      `
      SELECT COLUMN_NAME
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'product_variants'
      `
    );
    const variantColSet = new Set(variantCols.map((c) => String(c.COLUMN_NAME)));
    const hasDeviceLabel = variantColSet.has("device_label");
    const deviceLabelExpr = hasDeviceLabel ? "pv.device_label" : "NULL";
    const [toolVariantColumnRows] = await db.query<RowDataPacket[]>(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'order_items'
        AND column_name = 'tool_variant_id'
      LIMIT 1
      `
    );
    const hasToolVariantId = toolVariantColumnRows.length > 0;
    const toolVariantRef = hasToolVariantId ? "oi.tool_variant_id" : "oi.variant_id";

    let fetchResult:
      | { mode: "state" | "legacy"; order: OrderStateRow | OrderLegacyRow | null }
      | null = null;

    const isNumeric = /^\d+$/.test(identifierRaw);
    if (isNumeric) {
      const numericId = Number(identifierRaw);
      if (Number.isSafeInteger(numericId) && numericId > 0) {
        fetchResult = await fetchOrderByColumn(auth.userId, "id", numericId);
      }
    }

    if (!fetchResult || !fetchResult.order) {
      fetchResult = await fetchOrderByColumn(auth.userId, "order_number", identifierRaw);
    }

    if (!fetchResult || !fetchResult.order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { mode, order } = fetchResult;
    const orderDbId = Number((order as OrderStateRow | OrderLegacyRow).id);

    const [itemRows] = await db.query<ItemRow[]>(
      `
      SELECT
        oi.id,
        p.title,
        p.slug,
        pc.name AS category_name,
        p.image_url,
        p.is_active,
        oi.qty,
        oi.unit_price,
        oi.order_info_json,
        p.order_fields_json,
        CASE WHEN LOWER(pc.name) = 'tools' THEN tv.duration_label ELSE pv.duration_label END AS duration_label,
        CASE WHEN LOWER(pc.name) = 'tools' THEN tv.device_label ELSE ${deviceLabelExpr} END AS device_label,
        CASE WHEN LOWER(pc.name) = 'tools' THEN tv.duration_days ELSE pv.duration_days END AS duration_days
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      LEFT JOIN tool_variants tv ON tv.id = ${toolVariantRef}
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
      `,
      [orderDbId]
    );

    const [paymentRows] = await db.query<PaymentRow[]>(
      `
      SELECT account_id, payment_id, payment_apv, paid_at, method
      FROM payments
      WHERE order_id = ? AND user_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [orderDbId, auth.userId]
    );

    const [videoCourseRows] = await db.query<VideoCourseItemRow[]>(
      `
      SELECT
        vcp.id,
        vc.title AS course_title,
        vplan.name AS plan_name,
        vplan.access_type,
        vplan.duration_days,
        vcp.access_start,
        vcp.access_end,
        vcp.status
      FROM video_course_purchases vcp
      JOIN video_courses vc ON vc.id = vcp.course_id
      JOIN video_course_plans vplan ON vplan.id = vcp.plan_id
      WHERE vcp.order_id = ?
      ORDER BY vcp.id ASC
      `,
      [orderDbId]
    );

    const [videoSubscriptionRows] = await db.query<VideoSubscriptionRow[]>(
      `
      SELECT
        vsub.id,
        spl.name AS plan_name,
        spl.duration_days,
        vsub.access_start,
        vsub.access_end,
        vsub.status
      FROM video_subscriptions vsub
      JOIN video_subscription_plans spl ON spl.id = vsub.plan_id
      WHERE vsub.order_id = ?
      ORDER BY vsub.id ASC
      `,
      [orderDbId]
    );

    const completedAt =
      mode === "state"
        ? toDateString(
            (order as OrderStateRow).delivered_at ??
              (order as OrderStateRow).reviewed_at ??
              (order as OrderStateRow).created_at
          )
        : toDateString((order as OrderLegacyRow).created_at);

    const items = itemRows.map(item => {
      const durationDays = Number(item.duration_days ?? 0);
      const accessEnd =
        durationDays > 0 && completedAt
          ? (() => {
              const start = new Date(completedAt);
              if (Number.isNaN(start.getTime())) return null;
              return new Date(
                start.getTime() + durationDays * 24 * 60 * 60 * 1000
              ).toISOString();
            })()
          : null;

      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        category_name: item.category_name,
        image_url: item.image_url,
        is_active: Number(item.is_active) === 1,
        qty: Number(item.qty ?? 0),
        unit_price: toNumber(item.unit_price),
        duration_label: item.duration_label,
        device_label: item.device_label,
        duration_days: item.duration_days,
        access_end: accessEnd,
        order_info_json: item.order_info_json ?? null,
        order_fields_json: item.order_fields_json ?? null,
      };
    });

    const payment =
      paymentRows.length === 0
        ? null
        : {
            account_id: paymentRows[0].account_id,
            payment_id: paymentRows[0].payment_id,
            payment_apv: paymentRows[0].payment_apv,
            paid_at: toDateString(paymentRows[0].paid_at),
            method: paymentRows[0].method,
          };

    const videoItems = videoCourseRows.map((row) => ({
      id: row.id,
      type: "course" as const,
      title: row.course_title,
      plan: row.plan_name,
      access_type: row.access_type,
      duration_days: row.duration_days,
      access_start: toDateString(row.access_start),
      access_end: toDateString(row.access_end),
      status: row.status,
    }));

    const videoSubscriptions = videoSubscriptionRows.map((row) => ({
      id: row.id,
      type: "subscription" as const,
      title: row.plan_name,
      plan: row.plan_name,
      access_type: "subscription",
      duration_days: row.duration_days,
      access_start: toDateString(row.access_start),
      access_end: toDateString(row.access_end),
      status: row.status,
    }));

    const video_items = [...videoItems, ...videoSubscriptions];

    if (mode === "state") {
      const normalizedStatus = normalizeStateRowStatus(order as OrderStateRow);
      const canShowDelivery = normalizedStatus === "completed";
      return NextResponse.json({
        order: {
          id: order.id,
          order_number: order.order_number,
          status: normalizedStatus,
          has_payment_submission:
            Number((order as OrderStateRow).has_payment_submission ?? 0) === 1,
          subtotal: toNumber(order.subtotal),
          tax_amount: toNumber(order.tax_amount),
          total: toNumber(order.total),
          created_at: toDateString(order.created_at),
          delivery_title: canShowDelivery ? order.delivery_title : null,
          delivery_message: canShowDelivery ? order.delivery_message : null,
          delivered_at: canShowDelivery ? toDateString(order.delivered_at) : null,
          reviewed_at: toDateString(order.reviewed_at),
          review_note: order.review_note,
        },
        items,
        video_items,
        payment,
      });
    }

    return NextResponse.json({
      order: {
        id: (order as OrderLegacyRow).id,
        order_number: (order as OrderLegacyRow).order_number,
        status: resolveOrderStatus((order as OrderLegacyRow).status, null),
        has_payment_submission:
          Number((order as OrderLegacyRow).has_payment_submission ?? 0) === 1,
        subtotal: toNumber((order as OrderLegacyRow).subtotal),
        tax_amount: toNumber((order as OrderLegacyRow).tax_amount),
        total: toNumber((order as OrderLegacyRow).total),
        created_at: toDateString((order as OrderLegacyRow).created_at),
        delivery_title: null,
        delivery_message: null,
        delivered_at: null,
        reviewed_at: toDateString((order as OrderLegacyRow).reviewed_at),
        review_note: (order as OrderLegacyRow).review_note,
      },
      items,
      video_items,
      payment,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
