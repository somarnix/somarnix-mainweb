import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

const UNKNOWN_COLUMN_MARKERS = ["Unknown column 'state'", "Unknown column 'result'"];

type OrderStateRow = RowDataPacket & {
  id: number;
  user_id: number;
  state: string | null;
};

type OrderLegacyRow = RowDataPacket & {
  id: number;
  user_id: number;
  status: string | null;
};

type ItemRow = RowDataPacket & {
  id: number;
  order_fields_json: string | null;
};

function isUnknownColumnError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return UNKNOWN_COLUMN_MARKERS.some((marker) =>
    err.message.toLowerCase().includes(marker.toLowerCase())
  );
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const itemId = Number(body.itemId);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  }

  const orderInfo =
    typeof body.orderInfo === "object" && body.orderInfo !== null
      ? (body.orderInfo as Record<string, unknown>)
      : null;

  if (!orderInfo) {
    return NextResponse.json({ error: "Invalid orderInfo" }, { status: 400 });
  }

  let status: string | null = null;

  try {
    const [rows] = await db.query<OrderStateRow[]>(
      `SELECT id, user_id, state FROM orders WHERE id = ? AND user_id = ? LIMIT 1`,
      [orderId, auth.userId]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    status = rows[0].state;
  } catch (err) {
    if (!isUnknownColumnError(err)) throw err;
    const [rows] = await db.query<OrderLegacyRow[]>(
      `SELECT id, user_id, status FROM orders WHERE id = ? AND user_id = ? LIMIT 1`,
      [orderId, auth.userId]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    status = rows[0].status;
  }

  if (String(status ?? "").toLowerCase() !== "pending") {
    return NextResponse.json(
      { error: "Order info can only be edited while pending" },
      { status: 400 }
    );
  }

  const [itemRows] = await db.query<ItemRow[]>(
    `
    SELECT oi.id, p.order_fields_json
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.id = ? AND oi.order_id = ?
    LIMIT 1
    `,
    [itemId, orderId]
  );

  if (itemRows.length === 0) {
    return NextResponse.json({ error: "Order item not found" }, { status: 404 });
  }

  let allowedKeys: string[] = [];
  const rawFields = itemRows[0].order_fields_json;
  if (rawFields) {
    try {
      const parsed = JSON.parse(rawFields);
      if (Array.isArray(parsed)) {
        allowedKeys = parsed
          .map((f) => (f && typeof f.key === "string" ? f.key : ""))
          .filter(Boolean);
      }
    } catch {
      allowedKeys = [];
    }
  }

  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(orderInfo)) {
    if (allowedKeys.length > 0 && !allowedKeys.includes(key)) continue;
    if (value === null || value === undefined) continue;
    filtered[key] = String(value);
  }

  const payload = JSON.stringify(filtered);

  await db.query<ResultSetHeader>(
    `UPDATE order_items SET order_info_json = ? WHERE id = ? AND order_id = ?`,
    [payload, itemId, orderId]
  );

  return NextResponse.json({ success: true });
}
