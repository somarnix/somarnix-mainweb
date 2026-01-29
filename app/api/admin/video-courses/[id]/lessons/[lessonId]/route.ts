import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id?: string; lessonId?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const courseId = Number(params?.id);
  const lessonId = Number(params?.lessonId);
  if (!Number.isFinite(courseId) || courseId <= 0 || !Number.isFinite(lessonId) || lessonId <= 0) {
    return Response.json({ error: "Invalid ids" }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : null;
  const videoUrl = typeof data.video_url === "string" ? data.video_url.trim() : null;
  const durationLabel =
    typeof data.duration_label === "string" ? data.duration_label.trim() : null;
  const sectionId = Number(data.section_id);
  const position =
    typeof data.position === "number" ? data.position : Number(data.position);
  const isFree =
    typeof data.is_free_preview === "number"
      ? data.is_free_preview
      : data.is_free_preview
      ? 1
      : null;
  const isActive =
    typeof data.is_active === "number" ? (data.is_active ? 1 : 0) : null;

  const [result] = await db.query<ResultSetHeader>(
    `
    UPDATE video_course_lessons
    SET
      title = COALESCE(?, title),
      video_url = COALESCE(?, video_url),
      duration_label = ?,
      section_id = COALESCE(?, section_id),
      position = COALESCE(?, position),
      is_free_preview = COALESCE(?, is_free_preview),
      is_active = COALESCE(?, is_active)
    WHERE id = ? AND course_id = ?
    `,
    [
      title,
      videoUrl,
      durationLabel,
      Number.isFinite(sectionId) ? sectionId : null,
      Number.isFinite(position) ? position : null,
      isFree,
      isActive,
      lessonId,
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
  ctx: { params: Promise<{ id?: string; lessonId?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const courseId = Number(params?.id);
  const lessonId = Number(params?.lessonId);
  if (!Number.isFinite(courseId) || courseId <= 0 || !Number.isFinite(lessonId) || lessonId <= 0) {
    return Response.json({ error: "Invalid ids" }, { status: 400 });
  }

  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM video_course_lessons WHERE id = ? AND course_id = ?",
    [lessonId, courseId]
  );

  if (result.affectedRows === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
