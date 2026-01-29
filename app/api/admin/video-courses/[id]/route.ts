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
  preview_mode: string;
  preview_count: number;
  is_active: number;
};

export async function GET(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const id = Number(params?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

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
      hero_url,
      preview_mode,
      preview_count,
      is_active
    FROM video_courses
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  if (rows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ course: rows[0] });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const id = Number(params?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : null;
  const slug = typeof data.slug === "string" ? data.slug.trim() : null;
  const description =
    typeof data.description === "string" ? data.description.trim() : null;
  const category = typeof data.category === "string" ? data.category.trim() : null;
  const tags = typeof data.tags === "string" ? data.tags.trim() : null;
  const level =
    typeof data.level === "string" && ["beginner", "advanced", "pro"].includes(data.level)
      ? data.level
      : null;
  const authorName =
    typeof data.author_name === "string" ? data.author_name.trim() : null;
  const authorAvatar =
    typeof data.author_avatar_url === "string" ? data.author_avatar_url.trim() : null;
  const rating =
    typeof data.rating === "number" ? data.rating : Number(data.rating);
  const ratingCount =
    typeof data.rating_count === "number" ? data.rating_count : Number(data.rating_count);
  const studentsCount =
    typeof data.students_count === "number" ? data.students_count : Number(data.students_count);
  const uploadDate =
    typeof data.upload_date === "string" ? data.upload_date.trim() : null;
  const thumbnailUrl =
    typeof data.thumbnail_url === "string" ? data.thumbnail_url.trim() : null;
  const heroUrl = typeof data.hero_url === "string" ? data.hero_url.trim() : null;
  const previewMode =
    typeof data.preview_mode === "string" && ["count", "manual"].includes(data.preview_mode)
      ? data.preview_mode
      : null;
  const previewCount =
    typeof data.preview_count === "number"
      ? data.preview_count
      : Number(data.preview_count);
  const isActive =
    typeof data.is_active === "number" ? (data.is_active ? 1 : 0) : null;

  const [result] = await db.query<ResultSetHeader>(
    `
    UPDATE video_courses
    SET
      title = COALESCE(?, title),
      slug = COALESCE(?, slug),
      category = ?,
      tags = ?,
      description = ?,
      level = COALESCE(?, level),
      author_name = ?,
      author_avatar_url = ?,
      rating = COALESCE(?, rating),
      rating_count = COALESCE(?, rating_count),
      students_count = COALESCE(?, students_count),
      upload_date = ?,
      thumbnail_url = ?,
      hero_url = ?,
      preview_mode = COALESCE(?, preview_mode),
      preview_count = COALESCE(?, preview_count),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
    `,
    [
      title,
      slug,
      category,
      tags,
      description,
      level,
      authorName,
      authorAvatar,
      Number.isFinite(rating) ? rating : null,
      Number.isFinite(ratingCount) ? ratingCount : null,
      Number.isFinite(studentsCount) ? studentsCount : null,
      uploadDate,
      thumbnailUrl,
      heroUrl,
      previewMode,
      Number.isFinite(previewCount) ? previewCount : null,
      isActive,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const id = Number(params?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await db.query("START TRANSACTION");

    let result: ResultSetHeader;
    try {
      const [res] = await db.query<ResultSetHeader>(
        `
        UPDATE video_courses
        SET is_active = 0, deleted_at = NOW()
        WHERE id = ?
        `,
        [id]
      );
      result = res;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes("unknown column") || !message.includes("deleted_at")) {
        throw err;
      }
      const [res] = await db.query<ResultSetHeader>(
        `
        UPDATE video_courses
        SET is_active = 0
        WHERE id = ?
        `,
        [id]
      );
      result = res;
    }

    await db.query<ResultSetHeader>(
      `
      UPDATE video_course_purchases
      SET status = 'expired'
      WHERE course_id = ? AND status <> 'cancelled'
      `,
      [id]
    );

    await db.query("COMMIT");

    if (result.affectedRows === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    await db.query("ROLLBACK");
    return Response.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
