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

    return Response.json({
      totalOrders,
      totalProducts,
      totalUsers,
    });
  } catch (err) {
    console.error("ADMIN DASHBOARD ERROR:", err);

    return Response.json(
      {
        totalOrders: 0,
        totalProducts: 0,
        totalUsers: 0,
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
