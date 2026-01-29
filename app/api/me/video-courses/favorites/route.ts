import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type FavRow = RowDataPacket & {
  course_id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  is_active: number;
  created_at: string | Date | null;
};

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rows] = await db.query<FavRow[]>(
      `
      SELECT
        f.course_id,
        vc.title,
        vc.slug,
        vc.thumbnail_url,
        vc.is_active,
        f.created_at
      FROM video_course_favorites f
      JOIN video_courses vc ON vc.id = f.course_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      `,
      [auth.userId]
    );

    const courses = rows.map((row) => ({
      courseId: row.course_id,
      title: row.title,
      slug: row.slug,
      thumbnailUrl: row.thumbnail_url,
      favoritedAt: row.created_at,
      isActive: Number(row.is_active) === 1,
    }));

    return NextResponse.json({ courses });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const courseId = Number(data.courseId);
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  try {
    await db.query<ResultSetHeader>(
      `
      INSERT IGNORE INTO video_course_favorites (user_id, course_id)
      VALUES (?, ?)
      `,
      [auth.userId, courseId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const courseId = Number(data.courseId);
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  try {
    await db.query<ResultSetHeader>(
      `
      DELETE FROM video_course_favorites
      WHERE user_id = ? AND course_id = ?
      `,
      [auth.userId, courseId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
