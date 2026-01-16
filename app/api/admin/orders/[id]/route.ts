import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderId = Number(params.id);
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

  return Response.json({ order: rows[0] });
}
