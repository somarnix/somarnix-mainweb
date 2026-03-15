import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type CoursePlanRow = RowDataPacket & {
  id: number;
  course_id: number;
  price: number | string;
};

type ExistingRow = RowDataPacket & {
  id: number;
  qty: number;
};

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const courseId = Number(b.courseId);
    const planId = Number(b.planId);
    if (!Number.isFinite(courseId) || courseId <= 0) {
      return Response.json({ error: "courseId is required" }, { status: 400 });
    }
    if (!Number.isFinite(planId) || planId <= 0) {
      return Response.json({ error: "planId is required" }, { status: 400 });
    }

    const [planRows] = await db.query<CoursePlanRow[]>(
      `
      SELECT id, course_id, price
      FROM video_course_plans
      WHERE id = ? AND course_id = ? AND is_active = 1
      LIMIT 1
      `,
      [planId, courseId]
    );
    if (planRows.length === 0) {
      return Response.json({ error: "Course plan not found" }, { status: 404 });
    }

    const [existRows] = await db.query<ExistingRow[]>(
      `
      SELECT id, qty
      FROM video_course_cart_items
      WHERE user_id = ? AND course_id = ? AND plan_id = ?
      LIMIT 1
      `,
      [auth.userId, courseId, planId]
    );

    if (existRows.length > 0) {
      await db.query<ResultSetHeader>(
        `
        UPDATE video_course_cart_items
        SET qty = 1
        WHERE id = ?
        `,
        [existRows[0].id]
      );
    } else {
      await db.query<ResultSetHeader>(
        `
        INSERT INTO video_course_cart_items (user_id, course_id, plan_id, qty)
        VALUES (?, ?, ?, ?)
        `,
        [auth.userId, courseId, planId, 1]
      );
    }

    return Response.json({
      success: true,
      courseId,
      planId,
      qtyAdded: 1,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
