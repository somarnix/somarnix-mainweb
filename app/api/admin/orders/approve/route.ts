import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const orderId = Number(b.orderId);

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return Response.json({ error: "orderId required" }, { status: 400 });
    }

    const note =
      typeof b.note === "string" && b.note.trim() !== ""
        ? b.note.trim()
        : null;

    const [result] = await db.query<ResultSetHeader>(
      `
      UPDATE orders
      SET 
        status='approved',
        reviewed_by=?,
        reviewed_at=NOW(),
        review_note=?
      WHERE id=?
      `,
      [auth.userId, note, orderId]
    );

    if (result.affectedRows === 0) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    return Response.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
