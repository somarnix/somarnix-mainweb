import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type NotificationRow = RowDataPacket & {
  id: number;
  order_number: string;
  product_title: string | null;
};

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [cancelledRows] = await db.query<NotificationRow[]>(
      `
      SELECT
        o.id,
        o.order_number,
        (
          SELECT p.title
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = o.id
          ORDER BY oi.id ASC
          LIMIT 1
        ) AS product_title
      FROM orders o
      WHERE o.user_id = ? AND o.state = 'cancelled'
      ORDER BY o.created_at DESC
      LIMIT 2
      `,
      [auth.userId]
    );

    const [purchaseRows] = await db.query<NotificationRow[]>(
      `
      SELECT
        o.id,
        o.order_number,
        (
          SELECT p.title
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = o.id
          ORDER BY oi.id ASC
          LIMIT 1
        ) AS product_title
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      LIMIT 5
      `,
      [auth.userId]
    );

    const [soldRows] = await db.query<NotificationRow[]>(
      `
      SELECT
        o.id,
        o.order_number,
        (
          SELECT p.title
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = o.id AND p.posted_by = ?
          ORDER BY oi.id ASC
          LIMIT 1
        ) AS product_title
      FROM orders o
      JOIN order_items oi2 ON oi2.order_id = o.id
      JOIN products p2 ON p2.id = oi2.product_id
      WHERE p2.posted_by = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 5
      `,
      [auth.userId, auth.userId]
    );

    return NextResponse.json({
      cancelledOrders: cancelledRows.map((row) => ({
        id: Number(row.id),
        order_number: String(row.order_number),
        product_title: row.product_title ? String(row.product_title) : null,
      })),
      purchaseOrders: purchaseRows.map((row) => ({
        id: Number(row.id),
        order_number: String(row.order_number),
        product_title: row.product_title ? String(row.product_title) : null,
      })),
      soldOrders: soldRows.map((row) => ({
        id: Number(row.id),
        order_number: String(row.order_number),
        product_title: row.product_title ? String(row.product_title) : null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
