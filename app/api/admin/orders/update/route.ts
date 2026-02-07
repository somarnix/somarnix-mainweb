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

  let existingRows: OrderRow[] = [];
  try {
    const [rows] = await db.query<OrderRow[]>(
      "SELECT state, stock_reserved FROM orders WHERE id = ? LIMIT 1",
      [body.orderId]
    );
    existingRows = rows;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes("unknown column") || !message.includes("stock_reserved")) {
      throw err;
    }
    const [rows] = await db.query<OrderRow[]>(
      "SELECT state FROM orders WHERE id = ? LIMIT 1",
      [body.orderId]
    );
    existingRows = rows;
  }
  if (existingRows.length === 0) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  const previousState = existingRows[0].state;
  const stockReserved = Number(existingRows[0].stock_reserved ?? 0) === 1;

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
  return Response.json({ success: true });
}
