import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let rows: RowDataPacket[] = [];
  try {
    const [rowsWithPaymentDecision] = await db.query<RowDataPacket[]>(
      `
      SELECT
        o.id,
        o.order_number,
        o.user_id,
        o.state,
        COALESCE(lp.admin_decision, o.payment_state) AS payment_state,
        o.result,
        o.total,
        o.created_at,
        o.delivery_title,
        o.delivery_message,
        o.delivered_at,
        u.email AS user_email,
        cats.categories
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN (
        SELECT p1.order_id, p1.admin_decision
        FROM payments p1
        JOIN (
          SELECT order_id, MAX(id) AS max_id
          FROM payments
          GROUP BY order_id
        ) px ON px.max_id = p1.id
      ) lp ON lp.order_id = o.id
      LEFT JOIN (
        SELECT
          x.order_id,
          GROUP_CONCAT(DISTINCT x.category ORDER BY x.category SEPARATOR ',') AS categories
        FROM (
          SELECT oi.order_id, LOWER(pc.name) AS category
          FROM order_items oi
          JOIN products pr ON pr.id = oi.product_id
          LEFT JOIN product_categories pc ON pc.id = pr.category_id
          UNION ALL
          SELECT vcp.order_id, 'video-course' AS category
          FROM video_course_purchases vcp
        ) x
        GROUP BY x.order_id
      ) cats ON cats.order_id = o.id
      ORDER BY o.created_at DESC
      `
    );
    rows = rowsWithPaymentDecision;
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    const missingAdminDecision = msg.includes("unknown column") && msg.includes("admin_decision");
    const missingPaymentState = msg.includes("unknown column") && msg.includes("payment_state");
    if (!(missingAdminDecision || missingPaymentState)) {
      throw err;
    }
    const [rowsLegacy] = await db.query<RowDataPacket[]>(
      `
      SELECT
        o.id,
        o.order_number,
        o.user_id,
        o.state,
        o.result,
        o.total,
        o.created_at,
        o.delivery_title,
        o.delivery_message,
        o.delivered_at,
        u.email AS user_email,
        cats.categories
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN (
        SELECT
          x.order_id,
          GROUP_CONCAT(DISTINCT x.category ORDER BY x.category SEPARATOR ',') AS categories
        FROM (
          SELECT oi.order_id, LOWER(pc.name) AS category
          FROM order_items oi
          JOIN products pr ON pr.id = oi.product_id
          LEFT JOIN product_categories pc ON pc.id = pr.category_id
          UNION ALL
          SELECT vcp.order_id, 'video-course' AS category
          FROM video_course_purchases vcp
        ) x
        GROUP BY x.order_id
      ) cats ON cats.order_id = o.id
      ORDER BY o.created_at DESC
      `
    );
    rows = rowsLegacy.map((r) => ({ ...r, payment_state: null }));
  }

  return NextResponse.json({ orders: rows });
}
