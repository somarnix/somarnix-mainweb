import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";

import { db } from "@/lib/db";
import { ORDER_CONFIRMATION_WINDOW_MS } from "@/lib/order-confirmation";

type Queryable = Pick<PoolConnection, "query">;

type ExpiredOrderRow = RowDataPacket & {
  id: number;
  stock_reserved?: number | string | null;
};

type OrderItemRow = RowDataPacket & {
  product_id: number;
  required_units: number;
};

async function hasColumn(
  conn: Queryable,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const [rows] = await conn.query<RowDataPacket[]>(
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

async function listInventoryUnitsByProduct(conn: Queryable, orderId: number): Promise<OrderItemRow[]> {
  const hasProductsMode = await hasColumn(conn, "products", "mode");
  const hasOrderUnitsPerQty = await hasColumn(conn, "order_items", "units_per_qty");
  const hasVariantUnitsPerQty = await hasColumn(conn, "product_variants", "units_per_qty");
  const modeExpr = hasProductsMode
    ? "CASE WHEN p.mode IN ('license','inventory') THEN p.mode ELSE 'inventory' END"
    : "'inventory'";
  const unitsPerQtyExpr = hasOrderUnitsPerQty
    ? "GREATEST(1, COALESCE(oi.units_per_qty, 1))"
    : hasVariantUnitsPerQty
      ? "GREATEST(1, COALESCE(pv.units_per_qty, 1))"
      : "1";

  const [rows] = await conn.query<OrderItemRow[]>(
    `
    SELECT
      oi.product_id,
      SUM(GREATEST(0, oi.qty) * ${unitsPerQtyExpr}) AS required_units
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN product_variants pv ON pv.id = oi.variant_id
    WHERE oi.order_id = ?
      AND p.is_unlimited_stock = 0
      AND (${modeExpr}) = 'inventory'
    GROUP BY oi.product_id
    `,
    [orderId]
  );

  return rows;
}

async function releaseReservedStock(conn: Queryable, orderId: number): Promise<void> {
  const items = await listInventoryUnitsByProduct(conn, orderId);
  for (const item of items) {
    const requiredUnits = Number(item.required_units ?? 0);
    if (!Number.isFinite(requiredUnits) || requiredUnits <= 0) continue;
    await conn.query<ResultSetHeader>(
      `
      UPDATE products
      SET stock_qty = stock_qty + ?
      WHERE id = ? AND is_unlimited_stock = 0
      `,
      [requiredUnits, item.product_id]
    );
  }
}

async function cancelExpiredOrder(orderId: number, stockReserved: boolean): Promise<void> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (stockReserved) {
      await releaseReservedStock(conn, orderId);
      try {
        await conn.query<ResultSetHeader>(`UPDATE orders SET stock_reserved = 0 WHERE id = ?`, [
          orderId,
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        if (!(message.includes("unknown column") && message.includes("stock_reserved"))) {
          throw error;
        }
      }
    }

    try {
      await conn.query<ResultSetHeader>(
        `
        UPDATE orders
        SET
          state = 'cancelled',
          result = 'failed',
          payment_state = 'declined',
          review_note = 'Auto-cancelled after 2 hours without payment confirmation',
          reviewed_at = NOW(),
          payment_review_note = 'Auto-cancelled after 2 hours without payment confirmation',
          payment_reviewed_at = NOW()
        WHERE id = ?
        `,
        [orderId]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const workflowColumnMissing =
        message.includes("unknown column") &&
        (message.includes("state") ||
          message.includes("result") ||
          message.includes("payment_state") ||
          message.includes("payment_review_note") ||
          message.includes("payment_reviewed_at"));
      if (!workflowColumnMissing) {
        throw error;
      }

      await conn.query<ResultSetHeader>(
        `
        UPDATE orders
        SET status = 'cancelled'
        WHERE id = ?
        `,
        [orderId]
      );
    }

    await conn.query<ResultSetHeader>(
      `
      UPDATE video_course_purchases
      SET status = 'cancelled'
      WHERE order_id = ?
      `,
      [orderId]
    );

    try {
      await conn.query<ResultSetHeader>(
        `
        UPDATE video_subscriptions
        SET status = 'cancelled'
        WHERE order_id = ?
        `,
        [orderId]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!message.includes("doesn't exist") || !message.includes("video_subscriptions")) {
        throw error;
      }
    }

    await conn.commit();
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    conn.release();
  }
}

export async function syncExpiredUnconfirmedOrders(): Promise<number[]> {
  const cutoff = new Date(Date.now() - ORDER_CONFIRMATION_WINDOW_MS)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  let rows: ExpiredOrderRow[] = [];
  try {
    const [currentRows] = await db.query<ExpiredOrderRow[]>(
      `
      SELECT o.id, COALESCE(o.stock_reserved, 0) AS stock_reserved
      FROM orders o
      WHERE o.state = 'pending'
        AND o.created_at <= ?
        AND NOT EXISTS (
          SELECT 1
          FROM payments p
          WHERE p.order_id = o.id
        )
      `,
      [cutoff]
    );
    rows = currentRows;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const missingCurrentColumns =
      message.includes("unknown column") &&
      (message.includes("state") || message.includes("stock_reserved"));
    if (!missingCurrentColumns) {
      throw error;
    }

    const [legacyRows] = await db.query<ExpiredOrderRow[]>(
      `
      SELECT o.id
      FROM orders o
      WHERE o.status = 'pending'
        AND o.created_at <= ?
        AND NOT EXISTS (
          SELECT 1
          FROM payments p
          WHERE p.order_id = o.id
        )
      `,
      [cutoff]
    );
    rows = legacyRows;
  }

  const expiredOrderIds: number[] = [];
  for (const row of rows) {
    const orderId = Number(row.id ?? 0);
    if (!Number.isFinite(orderId) || orderId <= 0) continue;
    await cancelExpiredOrder(orderId, Number(row.stock_reserved ?? 0) === 1);
    expiredOrderIds.push(orderId);
  }

  return expiredOrderIds;
}
