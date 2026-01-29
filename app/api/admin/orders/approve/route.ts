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

    let updated = false;
    try {
      const [result] = await db.query<ResultSetHeader>(
        `
        UPDATE orders
        SET 
          state='approved',
          result='none',
          reviewed_by=?,
          reviewed_at=NOW(),
          review_note=?
        WHERE id=?
        `,
        [auth.userId, note, orderId]
      );
      updated = result.affectedRows > 0;
      if (!updated) {
        return Response.json({ error: "Order not found" }, { status: 404 });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Unknown column 'state'")) {
        throw error;
      }

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
    }

    await db.query<ResultSetHeader>(
      `
      UPDATE video_course_purchases vcp
      JOIN video_course_plans vplan ON vplan.id = vcp.plan_id
      SET
        vcp.status = 'active',
        vcp.access_start = NOW(),
        vcp.access_end = CASE
          WHEN vplan.access_type = 'months' AND vplan.duration_days IS NOT NULL
            THEN DATE_ADD(NOW(), INTERVAL vplan.duration_days DAY)
          ELSE NULL
        END
      WHERE vcp.order_id = ?
      `,
      [orderId]
    );

    await db.query<ResultSetHeader>(
      `
      UPDATE video_subscriptions vsub
      JOIN video_subscription_plans spl ON spl.id = vsub.plan_id
      SET
        vsub.status = 'active',
        vsub.access_start = NOW(),
        vsub.access_end = DATE_ADD(NOW(), INTERVAL spl.duration_days DAY)
      WHERE vsub.order_id = ?
      `,
      [orderId]
    );

    return Response.json({ success: true });
  } catch (err: unknown) {
    return Response.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
