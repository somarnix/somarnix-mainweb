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
          totalSoldItems: 0,
          averageOrderValue: 0,
          adminOwnedRevenue: 0,
          adminOwnedItemsSold: 0,
          pendingOrders: 0,
          completedOrders: 0,
          monthlyRevenue: [],
          categoryBreakdown: [],
          topProducts: [],
          recentCompletedOrders: [],
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

    const [salesRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        COALESCE(SUM(oi.qty), 0) AS total_sold_items,
        COALESCE(SUM(oi.qty * oi.unit_price), 0) AS gross_sales
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.state = 'completed' OR o.result = 'done'
      `
    );
    const totalSoldItems =
      Array.isArray(salesRows) && salesRows.length > 0
        ? Number(salesRows[0].total_sold_items)
        : 0;

    const [avgOrderRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        COALESCE(AVG(COALESCE(o.total_amount, o.total, 0)), 0) AS avg_order_value
      FROM orders o
      WHERE o.state = 'completed' OR o.result = 'done'
      `
    );
    const averageOrderValue =
      Array.isArray(avgOrderRows) && avgOrderRows.length > 0
        ? Number(avgOrderRows[0].avg_order_value)
        : 0;

    const [ownedRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        COALESCE(SUM(oi.qty * oi.unit_price), 0) AS owned_revenue,
        COALESCE(SUM(oi.qty), 0) AS owned_items
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE (o.state = 'completed' OR o.result = 'done')
        AND p.posted_by = ?
      `,
      [auth.userId]
    );
    const adminOwnedRevenue =
      Array.isArray(ownedRows) && ownedRows.length > 0
        ? Number(ownedRows[0].owned_revenue)
        : 0;
    const adminOwnedItemsSold =
      Array.isArray(ownedRows) && ownedRows.length > 0
        ? Number(ownedRows[0].owned_items)
        : 0;

    const [monthlyRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        DATE_FORMAT(o.created_at, '%Y-%m') AS month_key,
        COALESCE(SUM(COALESCE(o.total_amount, o.total, 0)), 0) AS revenue,
        COUNT(*) AS orders_count
      FROM orders o
      WHERE (o.state = 'completed' OR o.result = 'done')
        AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
      GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
      ORDER BY month_key ASC
      `
    );
    const monthlyRevenue = (Array.isArray(monthlyRows) ? monthlyRows : []).map((r) => ({
      month: String(r.month_key ?? ""),
      revenue: Number(r.revenue ?? 0),
      orders: Number(r.orders_count ?? 0),
    }));

    const [categoryRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        COALESCE(pc.name, 'uncategorized') AS category_name,
        COALESCE(SUM(oi.qty), 0) AS sold_qty,
        COALESCE(SUM(oi.qty * oi.unit_price), 0) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE o.state = 'completed' OR o.result = 'done'
      GROUP BY COALESCE(pc.name, 'uncategorized')
      ORDER BY revenue DESC, sold_qty DESC
      `
    );
    const categoryBreakdown = (Array.isArray(categoryRows) ? categoryRows : []).map((r) => ({
      category: String(r.category_name ?? "uncategorized"),
      soldQty: Number(r.sold_qty ?? 0),
      revenue: Number(r.revenue ?? 0),
    }));

    const [topProductRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        p.id AS product_id,
        p.title,
        p.slug,
        COUNT(DISTINCT oi.order_id) AS orders_count,
        COALESCE(SUM(oi.qty), 0) AS sold_qty,
        COALESCE(SUM(oi.qty * oi.unit_price), 0) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.state = 'completed' OR o.result = 'done'
      GROUP BY p.id, p.title, p.slug
      ORDER BY revenue DESC, sold_qty DESC
      LIMIT 8
      `
    );
    const topProducts = (Array.isArray(topProductRows) ? topProductRows : []).map((r) => ({
      productId: Number(r.product_id ?? 0),
      title: String(r.title ?? ""),
      slug: String(r.slug ?? ""),
      orders: Number(r.orders_count ?? 0),
      soldQty: Number(r.sold_qty ?? 0),
      revenue: Number(r.revenue ?? 0),
    }));

    const [recentRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        o.id,
        o.order_number,
        o.created_at,
        o.state,
        COALESCE(o.total_amount, o.total, 0) AS total_value,
        u.email AS user_email
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.state = 'completed' OR o.result = 'done'
      ORDER BY o.created_at DESC
      LIMIT 8
      `
    );
    const recentCompletedOrders = (Array.isArray(recentRows) ? recentRows : []).map((r) => ({
      id: Number(r.id ?? 0),
      orderNumber: String(r.order_number ?? ""),
      userEmail: String(r.user_email ?? ""),
      total: Number(r.total_value ?? 0),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      state: String(r.state ?? ""),
    }));

    return Response.json({
      totalOrders,
      totalProducts,
      totalUsers,
      totalPayments,
      totalRevenue,
      totalSoldItems,
      averageOrderValue,
      adminOwnedRevenue,
      adminOwnedItemsSold,
      pendingOrders,
      completedOrders,
      monthlyRevenue,
      categoryBreakdown,
      topProducts,
      recentCompletedOrders,
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
        totalSoldItems: 0,
        averageOrderValue: 0,
        adminOwnedRevenue: 0,
        adminOwnedItemsSold: 0,
        pendingOrders: 0,
        completedOrders: 0,
        monthlyRevenue: [],
        categoryBreakdown: [],
        topProducts: [],
        recentCompletedOrders: [],
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
