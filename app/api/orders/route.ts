import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { OrderStatus } from "@/lib/order-status";
import {
  normalizeStatusKeyword,
  resolveOrderStatus,
} from "@/lib/order-status";

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
  state: string | null;
  result: string | null;
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
  status: string | null;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  total: number | string | null;
  created_at: string | Date | null;
  reviewed_at: string | Date | null;
  review_note: string | null;
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

function normalizeStatusFromState(row: Pick<OrderStateRow, "state" | "result">): OrderStatus {
  return resolveOrderStatus(row.state, row.result);
}

function normalizeStatusFromLegacy(row: Pick<OrderLegacyRow, "status">): OrderStatus {
  const status = (row.status ?? "").toLowerCase();
  if (status === "delivered") return "delivering";
  return resolveOrderStatus(row.status, null);
}

async function fetchOrders(userId: number) {
  try {
    const [rows] = await db.query<OrderStateRow[]>(
      `
      SELECT
        id,
        order_number,
        state,
        result,
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
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return {
      mode: "state" as const,
      rows,
    };
  } catch (err) {
    if (!isUnknownColumnError(err)) {
      throw err;
    }

    const [rows] = await db.query<OrderLegacyRow[]>(
      `
      SELECT
        id,
        order_number,
        status,
        subtotal,
        tax_amount,
        total,
        created_at,
        reviewed_at,
        review_note
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return {
      mode: "legacy" as const,
      rows,
    };
  }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchOrders(auth.userId);

    const orders =
      data.mode === "state"
        ? data.rows.map(row => ({
            id: row.id,
            order_number: row.order_number,
            status: normalizeStatusFromState(row),
            subtotal: toNumber(row.subtotal),
            tax_amount: toNumber(row.tax_amount),
            total: toNumber(row.total),
            created_at: toDateString(row.created_at),
            delivery_title: row.delivery_title,
            delivery_message: row.delivery_message,
            delivered_at: toDateString(row.delivered_at),
            reviewed_at: toDateString(row.reviewed_at),
            review_note: row.review_note,
          }))
        : data.rows.map(row => ({
            id: row.id,
            order_number: row.order_number,
            status: normalizeStatusFromLegacy(row),
            subtotal: toNumber(row.subtotal),
            tax_amount: toNumber(row.tax_amount),
            total: toNumber(row.total),
            created_at: toDateString(row.created_at),
            delivery_title: null,
            delivery_message: null,
            delivered_at: null,
            reviewed_at: toDateString(row.reviewed_at),
            review_note: row.review_note,
          }));

    return NextResponse.json({ orders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
