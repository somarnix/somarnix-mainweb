import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id?: string; sectionId?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const courseId = Number(params?.id);
  const sectionId = Number(params?.sectionId);
  if (!Number.isFinite(courseId) || courseId <= 0 || !Number.isFinite(sectionId) || sectionId <= 0) {
    return Response.json({ error: "Invalid ids" }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : null;
  const position =
    typeof data.position === "number" ? data.position : Number(data.position);

  const [result] = await db.query<ResultSetHeader>(
    `
    UPDATE video_course_sections
    SET
      title = COALESCE(?, title),
      position = COALESCE(?, position)
    WHERE id = ? AND course_id = ?
    `,
    [title, Number.isFinite(position) ? position : null, sectionId, courseId]
  );

  if (result.affectedRows === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id?: string; sectionId?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const courseId = Number(params?.id);
  const sectionId = Number(params?.sectionId);
  if (!Number.isFinite(courseId) || courseId <= 0 || !Number.isFinite(sectionId) || sectionId <= 0) {
    return Response.json({ error: "Invalid ids" }, { status: 400 });
  }

  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM video_course_sections WHERE id = ? AND course_id = ?",
    [sectionId, courseId]
  );

  if (result.affectedRows === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
