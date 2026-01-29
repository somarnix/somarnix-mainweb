import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type CourseRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  category: string | null;
  tags: string | null;
  description: string | null;
  level: string;
  author_name: string | null;
  author_avatar_url: string | null;
  rating: number | string | null;
  rating_count: number | null;
  students_count: number | null;
  upload_date: string | Date | null;
  thumbnail_url: string | null;
  hero_url: string | null;
  min_price: number | string | null;
  plan_count: number | null;
  preview_mode: string;
  preview_count: number;
  is_active: number;
  created_at: string;
};

export async function GET(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let rows: CourseRow[] = [];
    try {
      const [data] = await db.query<CourseRow[]>(
        `
        SELECT
          vc.id,
          vc.title,
          vc.slug,
          vc.category,
          vc.tags,
          vc.description,
          vc.level,
          vc.author_name,
          vc.author_avatar_url,
          vc.rating,
          vc.rating_count,
          vc.students_count,
          vc.upload_date,
          vc.thumbnail_url,
          vc.hero_url,
          (
            SELECT MIN(price)
            FROM video_course_plans vcp
            WHERE vcp.course_id = vc.id AND vcp.is_active = 1
          ) AS min_price,
          (
            SELECT COUNT(*)
            FROM video_course_plans vcp
            WHERE vcp.course_id = vc.id AND vcp.is_active = 1
          ) AS plan_count,
          vc.preview_mode,
          vc.preview_count,
          vc.is_active,
          vc.created_at
        FROM video_courses vc
        WHERE vc.deleted_at IS NULL
        ORDER BY vc.id DESC
        `
      );
      rows = data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes("unknown column") || !message.includes("deleted_at")) {
        throw err;
      }
      const [data] = await db.query<CourseRow[]>(
        `
        SELECT
          vc.id,
          vc.title,
          vc.slug,
          vc.category,
          vc.tags,
          vc.description,
          vc.level,
          vc.author_name,
          vc.author_avatar_url,
          vc.rating,
          vc.rating_count,
          vc.students_count,
          vc.upload_date,
          vc.thumbnail_url,
          vc.hero_url,
          (
            SELECT MIN(price)
            FROM video_course_plans vcp
            WHERE vcp.course_id = vc.id AND vcp.is_active = 1
          ) AS min_price,
          (
            SELECT COUNT(*)
            FROM video_course_plans vcp
            WHERE vcp.course_id = vc.id AND vcp.is_active = 1
          ) AS plan_count,
          vc.preview_mode,
          vc.preview_count,
          vc.is_active,
          vc.created_at
        FROM video_courses vc
        ORDER BY vc.id DESC
        `
      );
      rows = data;
    }

    return Response.json({ courses: rows });
  } catch (err: unknown) {
    return Response.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: unknown = await req.json().catch(() => ({}));
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const slug = typeof data.slug === "string" ? data.slug.trim() : "";
    const level = typeof data.level === "string" ? data.level : "beginner";

    if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
    if (!slug) return Response.json({ error: "Slug is required" }, { status: 400 });

    const [result] = await db.query<ResultSetHeader>(
      `
      INSERT INTO video_courses (title, slug, level)
      VALUES (?,?,?)
      `,
      [title, slug, level]
    );

    return Response.json({ success: true, id: result.insertId });
  } catch (err: unknown) {
    return Response.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
