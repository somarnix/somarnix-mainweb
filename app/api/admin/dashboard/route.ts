import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

/* =========================
   GET: ADMIN DASHBOARD STATS
========================= */
export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json(
        {
          totalOrders: 0,
          totalProducts: 0,
          totalUsers: 0,
          totalPayments: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          completedOrders: 0,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    /* ===== COUNT ORDERS ===== */
    const [orderRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM orders`
    );
    const totalOrders =
      Array.isArray(orderRows) && orderRows.length > 0
        ? Number(orderRows[0].total)
        : 0;

    /* ===== COUNT PRODUCTS ===== */
    const [productRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM products`
    );
    const totalProducts =
      Array.isArray(productRows) && productRows.length > 0
        ? Number(productRows[0].total)
        : 0;

    /* ===== COUNT USERS ===== */
    const [userRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM users`
    );
    const totalUsers =
      Array.isArray(userRows) && userRows.length > 0
        ? Number(userRows[0].total)
        : 0;

    const [paymentRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        COUNT(*) AS total_payments,
        COALESCE(SUM(COALESCE(o.total_amount, o.total)), 0) AS total_revenue
      FROM payments p
      LEFT JOIN orders o ON o.id = p.order_id
      `
    );
    const totalPayments =
      Array.isArray(paymentRows) && paymentRows.length > 0
        ? Number(paymentRows[0].total_payments)
        : 0;
    const totalRevenue =
      Array.isArray(paymentRows) && paymentRows.length > 0
        ? Number(paymentRows[0].total_revenue)
        : 0;

    const [orderStateRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        SUM(CASE WHEN state = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
        SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) AS completed_orders
      FROM orders
      `
    );
    const pendingOrders =
      Array.isArray(orderStateRows) && orderStateRows.length > 0
        ? Number(orderStateRows[0].pending_orders)
        : 0;
    const completedOrders =
      Array.isArray(orderStateRows) && orderStateRows.length > 0
        ? Number(orderStateRows[0].completed_orders)
        : 0;

    return Response.json({
      totalOrders,
      totalProducts,
      totalUsers,
      totalPayments,
      totalRevenue,
      pendingOrders,
      completedOrders,
    });
  } catch (err) {
    console.error("ADMIN DASHBOARD ERROR:", err);

    return Response.json(
      {
        totalOrders: 0,
        totalProducts: 0,
        totalUsers: 0,
        totalPayments: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
