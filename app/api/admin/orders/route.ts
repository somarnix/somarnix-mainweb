import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT
      o.id,
      o.state,
      o.result,
      o.total,
      o.created_at,
      o.delivery_title,
      o.delivery_message,
      o.delivered_at,
      u.email AS user_email
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
    `
  );

  return NextResponse.json({ orders: rows });
}
