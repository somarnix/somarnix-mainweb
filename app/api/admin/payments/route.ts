import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type PaymentRow = RowDataPacket & {
  id: number;
  order_id: number;
  order_number: string | null;
  user_email: string | null;
  account_id: string | null;
  payment_id: string | null;
  payment_apv: string | null;
  paid_at: string | Date | null;
  method: string | null;
  total: number | string | null;
};

export async function GET(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [rows] = await db.query<PaymentRow[]>(
      `
      SELECT
        p.id,
        p.order_id,
        o.order_number,
        u.email AS user_email,
        p.account_id,
        p.payment_id,
        p.payment_apv,
        p.paid_at,
        p.method,
        COALESCE(o.total_amount, o.total) AS total
      FROM payments p
      LEFT JOIN orders o ON o.id = p.order_id
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.paid_at DESC, p.id DESC
      `
    );

    return Response.json({ payments: rows });
  } catch (err) {
    return Response.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
