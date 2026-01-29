import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type LessonRow = RowDataPacket & {
  id: number;
  course_id: number;
  section_id: number;
  title: string;
  video_url: string;
  duration_label: string | null;
  position: number;
  is_free_preview: number;
  is_active: number;
};

export async function GET(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const courseId = Number(params?.id);
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return Response.json({ error: "Invalid course id" }, { status: 400 });
  }

  const [rows] = await db.query<LessonRow[]>(
    `
    SELECT
      id,
      course_id,
      section_id,
      title,
      video_url,
      duration_label,
      position,
      is_free_preview,
      is_active
    FROM video_course_lessons
    WHERE course_id = ?
    ORDER BY position ASC, id ASC
    `,
    [courseId]
  );

  return Response.json({ lessons: rows });
}

export async function POST(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const courseId = Number(params?.id);
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return Response.json({ error: "Invalid course id" }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const sectionId = Number(data.section_id);
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const videoUrl = typeof data.video_url === "string" ? data.video_url.trim() : "";
  const durationLabel =
    typeof data.duration_label === "string" ? data.duration_label.trim() : null;
  const position =
    typeof data.position === "number" ? data.position : Number(data.position ?? 0);
  const isFree = data.is_free_preview ? 1 : 0;

  if (!Number.isFinite(sectionId) || sectionId <= 0) {
    return Response.json({ error: "Section is required" }, { status: 400 });
  }
  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
  if (!videoUrl) return Response.json({ error: "Video URL is required" }, { status: 400 });

  const [result] = await db.query<ResultSetHeader>(
    `
    INSERT INTO video_course_lessons (
      course_id,
      section_id,
      title,
      video_url,
      duration_label,
      position,
      is_free_preview
    )
    VALUES (?,?,?,?,?,?,?)
    `,
    [
      courseId,
      sectionId,
      title,
      videoUrl,
      durationLabel,
      Number.isFinite(position) ? position : 0,
      isFree,
    ]
  );

  return Response.json({ success: true, id: result.insertId });
}
