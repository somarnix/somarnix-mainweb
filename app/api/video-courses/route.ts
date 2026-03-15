import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  min_price: number | string | null;
  lesson_count: number | null;
  preview_mode: string;
  preview_count: number;
  is_active: number;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postedByRaw = Number(url.searchParams.get("posted_by") ?? 0);
    const postedBy = Number.isFinite(postedByRaw) && postedByRaw > 0 ? postedByRaw : null;

    const [postedByColumnRows] = await db.query<RowDataPacket[]>(
      `
      SELECT 1 AS ok
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'video_courses'
        AND column_name = 'posted_by'
      LIMIT 1
      `
    );
    const hasPostedByColumn = postedByColumnRows.length > 0;

    const whereClause =
      hasPostedByColumn && postedBy
        ? "WHERE is_active = 1 AND posted_by = ?"
        : "WHERE is_active = 1";

    const [rows] = await db.query<CourseRow[]>(
      `
      SELECT
        id,
        title,
        slug,
        category,
        tags,
        description,
        level,
        author_name,
        author_avatar_url,
        rating,
        rating_count,
        students_count,
        upload_date,
        thumbnail_url,
        (
          SELECT MIN(price)
          FROM video_course_plans
          WHERE course_id = video_courses.id AND is_active = 1
        ) AS min_price,
        (
          SELECT COUNT(*)
          FROM video_course_lessons
          WHERE course_id = video_courses.id AND is_active = 1
        ) AS lesson_count,
        preview_mode,
        preview_count,
        is_active
      FROM video_courses
      ${whereClause}
      ORDER BY id DESC
      `,
      hasPostedByColumn && postedBy ? [postedBy] : []
    );

    return Response.json({ courses: rows });
  } catch (err: unknown) {
    return Response.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
