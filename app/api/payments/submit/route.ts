import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type OrderStatus =
  | "pending"
  | "waiting_admin"
  | "approved"
  | "delivered"
  | "done"
  | "cancelled";

type OrderRow = RowDataPacket & {
  id: number;
  status: OrderStatus;
};

function toMysqlDatetime(input: string): string | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    const oid = Number(b.orderId);
    const paymentId = b.paymentId;
    const purchaseId = b.purchaseId;
    const paidAt = b.paidAt;

    if (
      !Number.isFinite(oid) ||
      oid <= 0 ||
      typeof paymentId !== "string" ||
      paymentId.trim() === "" ||
      typeof purchaseId !== "string" ||
      purchaseId.trim() === "" ||
      typeof paidAt !== "string" ||
      paidAt.trim() === ""
    ) {
      return Response.json(
        { error: "orderId, paymentId, purchaseId, paidAt required" },
        { status: 400 }
      );
    }

    const mysqlPaidAt = toMysqlDatetime(paidAt.trim());
    if (!mysqlPaidAt) {
      return Response.json(
        { error: "paidAt invalid (must be a valid date/time)" },
        { status: 400 }
      );
    }

    // Ensure order belongs to user
    const [oRows] = await db.query<OrderRow[]>(
      "SELECT id, status FROM orders WHERE id=? AND user_id=? LIMIT 1",
      [oid, auth.userId]
    );

    if (oRows.length === 0) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow submit from pending
    if (oRows[0].status !== "pending") {
      return Response.json({ error: "Order not pending" }, { status: 400 });
    }

    // Prevent duplicate payment submissions for same order
    const [existPay] = await db.query<RowDataPacket[]>(
      "SELECT id FROM payments WHERE order_id=? AND user_id=? LIMIT 1",
      [oid, auth.userId]
    );
    if (existPay.length > 0) {
      return Response.json(
        { error: "Payment already submitted for this order" },
        { status: 400 }
      );
    }

    await db.query<ResultSetHeader>(
      `
      INSERT INTO payments (order_id, user_id, payment_id, purchase_id, paid_at, method)
      VALUES (?,?,?,?,?, 'manual')
      `,
      [oid, auth.userId, paymentId.trim(), purchaseId.trim(), mysqlPaidAt]
    );

    // ✅ Move order to waiting_admin
    await db.query<ResultSetHeader>(
      "UPDATE orders SET status='waiting_admin' WHERE id=? AND user_id=?",
      [oid, auth.userId]
    );

    return Response.json({
      success: true,
      message: "Payment submitted. Waiting admin review.",
      orderId: oid,
      status: "waiting_admin",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
