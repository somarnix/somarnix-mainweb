import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) {
    return Response.json({ error: "Invalid order id" }, { status: 400 });
  }

  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT *
    FROM orders
    WHERE id = ?
    `,
    [orderId]
  );

  if (rows.length === 0) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const [items] = await db.query<RowDataPacket[]>(
    `
    SELECT
      oi.id,
      oi.product_id,
      oi.qty,
      oi.unit_price,
      oi.order_info_json,
      p.slug AS product_slug,
      p.title AS product_title,
      p.order_fields_json,
      c.name AS category_name
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN product_categories c ON c.id = p.category_id
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
    `,
    [orderId]
  );

  return Response.json({ order: rows[0], items });
}
