import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type OrderStatsRow = RowDataPacket & {
  total_orders: number | null;
  total_spent: number | string | null;
  pending_count: number | null;
  approved_count: number | null;
  delivering_count: number | null;
  completed_count: number | null;
  cancelled_count: number | null;
  resolution_count: number | null;
};

type ItemStatsRow = RowDataPacket & {
  total_items: number | null;
};

type CartStatsRow = RowDataPacket & {
  cart_items: number | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [orderRows] = await db.query<OrderStatsRow[]>(
      `
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(total), 0) AS total_spent,
        SUM(CASE WHEN state = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN state = 'approved' THEN 1 ELSE 0 END) AS approved_count,
        SUM(CASE WHEN state = 'delivering' THEN 1 ELSE 0 END) AS delivering_count,
        SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN state = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
        SUM(CASE WHEN state = 'resolution' THEN 1 ELSE 0 END) AS resolution_count
      FROM orders
      WHERE user_id = ?
      `,
      [auth.userId]
    );

    const orderStats = orderRows[0] || ({} as OrderStatsRow);

    const [itemsRows] = await db.query<ItemStatsRow[]>(
      `
      SELECT COALESCE(SUM(oi.qty), 0) AS total_items
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = ?
      `,
      [auth.userId]
    );

    const itemStats = itemsRows[0] || ({} as ItemStatsRow);

    const [cartRows] = await db.query<CartStatsRow[]>(
      `
      SELECT COALESCE(SUM(ci.qty), 0) AS cart_items
      FROM carts c
      LEFT JOIN cart_items ci ON ci.cart_id = c.id
      WHERE c.user_id = ? AND c.status = 'active'
      `,
      [auth.userId]
    );

    const cartStats = cartRows[0] || ({} as CartStatsRow);

    return NextResponse.json({
      stats: {
        totalOrders: toNumber(orderStats.total_orders),
        totalSpent: toNumber(orderStats.total_spent),
        totalItems: toNumber(itemStats.total_items),
        cartItems: toNumber(cartStats.cart_items),
        stateCounts: {
          pending: toNumber(orderStats.pending_count),
          approved: toNumber(orderStats.approved_count),
          delivering: toNumber(orderStats.delivering_count),
          completed: toNumber(orderStats.completed_count),
          cancelled: toNumber(orderStats.cancelled_count),
          resolution: toNumber(orderStats.resolution_count),
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
