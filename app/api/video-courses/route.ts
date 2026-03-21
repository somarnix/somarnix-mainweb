import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CourseRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  posted_by?: number | null;
  posted_by_username?: string | null;
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

type LinkedAuthorUserRow = RowDataPacket & {
  id: number;
  username: string;
  avatar_url: string | null;
};

function extractLinkedAuthorUsername(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed.startsWith("@")) return null;
  const username = trimmed.slice(1).trim();
  return username || null;
}

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

    let postedByUsername: string | null = null;
    if (postedBy) {
      const [sellerRows] = await db.query<RowDataPacket[]>(
        `
        SELECT username
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [postedBy]
      );
      postedByUsername =
        typeof sellerRows[0]?.username === "string" ? sellerRows[0].username : null;
    }

    const whereParts = ["is_active = 1"];
    const whereValues: Array<number | string> = [];
    if (postedBy) {
      const ownerFilters: string[] = [];
      if (hasPostedByColumn) {
        ownerFilters.push("posted_by = ?");
        whereValues.push(postedBy);
      }
      if (postedByUsername) {
        ownerFilters.push("LOWER(author_avatar_url) = LOWER(?)");
        whereValues.push(`@${postedByUsername}`);
      }
      if (ownerFilters.length > 0) {
        whereParts.push(`(${ownerFilters.join(" OR ")})`);
      }
    }
    const whereClause = `WHERE ${whereParts.join(" AND ")}`;

    const [rows] = await db.query<CourseRow[]>(
      `
      SELECT
        id,
        title,
        slug,
        ${hasPostedByColumn ? "posted_by," : "NULL AS posted_by,"}
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
      whereValues
    );

    const linkedAuthorUsernames = Array.from(
      new Set(
        rows
          .map((row) => extractLinkedAuthorUsername(row.author_avatar_url))
          .filter((value): value is string => !!value)
          .map((value) => value.toLowerCase())
      )
    );

    const linkedAuthorMap = new Map<string, LinkedAuthorUserRow>();
    if (linkedAuthorUsernames.length > 0) {
      const placeholders = linkedAuthorUsernames.map(() => "?").join(", ");
      const [linkedUsers] = await db.query<LinkedAuthorUserRow[]>(
        `
        SELECT id, username, avatar_url
        FROM users
        WHERE LOWER(username) IN (${placeholders})
          AND is_active = 1
          AND deleted_at IS NULL
        `,
        linkedAuthorUsernames
      );

      linkedUsers.forEach((user) => {
        linkedAuthorMap.set(user.username.toLowerCase(), user);
      });
    }

    const resolvedRows = rows.map((row) => {
      const linkedAuthorUsername = extractLinkedAuthorUsername(row.author_avatar_url);
      if (!linkedAuthorUsername) return row;
      const linkedUser = linkedAuthorMap.get(linkedAuthorUsername.toLowerCase());
      if (!linkedUser) return row;
      return {
        ...row,
        author_avatar_url: linkedUser.avatar_url,
        posted_by: linkedUser.id,
        posted_by_username: linkedUser.username,
      };
    });

    return Response.json({ courses: resolvedRows });
  } catch (err: unknown) {
    return Response.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
