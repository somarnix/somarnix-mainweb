import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type CourseRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  min_price: number | string | null;
};

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rows] = await db.query<CourseRow[]>(
      `
      SELECT
        vc.id,
        vc.title,
        vc.slug,
        vc.thumbnail_url,
        (
          SELECT MIN(vcp.price)
          FROM video_course_plans vcp
          WHERE vcp.course_id = vc.id AND vcp.is_active = 1
        ) AS min_price
      FROM video_courses vc
      WHERE vc.is_active = 1
      ORDER BY vc.created_at DESC
      `
    );

    const courses = rows
      .filter((row) => {
        const price =
          typeof row.min_price === "string"
            ? Number(row.min_price)
            : typeof row.min_price === "number"
              ? row.min_price
              : null;
        return price === null || (Number.isFinite(price) && price <= 0);
      })
      .map((row) => ({
        courseId: row.id,
        title: row.title,
        slug: row.slug,
        thumbnailUrl: row.thumbnail_url,
        isActive: true,
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
