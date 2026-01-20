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

type OrderRow = RowDataPacket & { state: State };
type OrderItemRow = RowDataPacket & { product_id: number; qty: number };

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

  const [existingRows] = await db.query<OrderRow[]>(
    "SELECT state FROM orders WHERE id = ? LIMIT 1",
    [body.orderId]
  );
  if (existingRows.length === 0) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  const previousState = existingRows[0].state;

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
      deliveryTitle,
      deliveryMessage,
      deliveryMessage,
      auth.userId,
      body.orderId,
    ]
  );

  if (r.affectedRows === 0) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  if (body.state === "completed" && previousState !== "completed") {
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
  }

  return Response.json({ success: true });
}
