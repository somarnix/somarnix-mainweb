import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type SectionRow = RowDataPacket & {
  id: number;
  course_id: number;
  title: string;
  position: number;
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

  const [rows] = await db.query<SectionRow[]>(
    `
    SELECT id, course_id, title, position
    FROM video_course_sections
    WHERE course_id = ?
    ORDER BY position ASC, id ASC
    `,
    [courseId]
  );

  return Response.json({ sections: rows });
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
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const position =
    typeof data.position === "number" ? data.position : Number(data.position ?? 0);

  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });

  const [result] = await db.query<ResultSetHeader>(
    `
    INSERT INTO video_course_sections (course_id, title, position)
    VALUES (?,?,?)
    `,
    [courseId, title, Number.isFinite(position) ? position : 0]
  );

  return Response.json({ success: true, id: result.insertId });
}
