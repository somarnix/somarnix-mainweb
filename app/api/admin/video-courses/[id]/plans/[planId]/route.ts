import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id?: string; planId?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const courseId = Number(params?.id);
  const planId = Number(params?.planId);
  if (!Number.isFinite(courseId) || courseId <= 0 || !Number.isFinite(planId) || planId <= 0) {
    return Response.json({ error: "Invalid ids" }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : null;
  const accessType =
    typeof data.access_type === "string" && ["lifetime", "months"].includes(data.access_type)
      ? data.access_type
      : null;
  const durationDays =
    typeof data.duration_days === "number" ? data.duration_days : Number(data.duration_days);
  const price =
    typeof data.price === "number" ? data.price : Number(data.price);
  const khqr = typeof data.khqr === "string" ? data.khqr.trim() : null;
  const usdqr = typeof data.usdqr === "string" ? data.usdqr.trim() : null;
  const isActive =
    typeof data.is_active === "number" ? (data.is_active ? 1 : 0) : null;

  const [result] = await db.query<ResultSetHeader>(
    `
    UPDATE video_course_plans
    SET
      name = COALESCE(?, name),
      access_type = COALESCE(?, access_type),
      duration_days = ?,
      price = COALESCE(?, price),
      khqr = COALESCE(?, khqr),
      usdqr = COALESCE(?, usdqr),
      is_active = COALESCE(?, is_active)
    WHERE id = ? AND course_id = ?
    `,
    [
      name,
      accessType,
      Number.isFinite(durationDays) ? durationDays : null,
      Number.isFinite(price) ? price : null,
      khqr,
      usdqr,
      isActive,
      planId,
      courseId,
    ]
  );

  if (result.affectedRows === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id?: string; planId?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const courseId = Number(params?.id);
  const planId = Number(params?.planId);
  if (!Number.isFinite(courseId) || courseId <= 0 || !Number.isFinite(planId) || planId <= 0) {
    return Response.json({ error: "Invalid ids" }, { status: 400 });
  }

  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM video_course_plans WHERE id = ? AND course_id = ?",
    [planId, courseId]
  );

  if (result.affectedRows === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
