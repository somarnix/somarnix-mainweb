import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

type State = "pending" | "approved" | "cancelled";
type Result = "none" | "done" | "failed";

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    orderId?: number;
    state?: State;
    result?: Result;
    delivery_title?: string | null;
    delivery_message?: string | null;
  };

  if (!body.orderId || !body.state || !body.result) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const deliveryTitle =
    typeof body.delivery_title === "string" &&
    body.delivery_title.trim() !== ""
      ? body.delivery_title.trim()
      : null;

  const deliveryMessage =
    typeof body.delivery_message === "string" &&
    body.delivery_message.trim() !== ""
      ? body.delivery_message.trim()
      : null;

  const [r] = await db.query<ResultSetHeader>(
    `
    UPDATE orders
    SET
      state = ?,
      result = ?,
      delivery_title = ?,
      delivery_message = ?,
      delivered_at = IF(? IS NOT NULL, NOW(), delivered_at),
      reviewed_by = ?,
      reviewed_at = NOW()
    WHERE id = ?
    `,
    [
      body.state,
      body.result,
      deliveryTitle,
      deliveryMessage,
      deliveryMessage,
      auth.userId,
      body.orderId,
    ]
  );

  if (r.affectedRows === 0) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
