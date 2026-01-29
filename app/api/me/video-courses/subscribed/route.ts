import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type CourseRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  min_price?: number | string | null;
  is_active?: number;
};

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [subRows] = await db.query<RowDataPacket[]>(
      `
      SELECT vsub.id, spl.name AS plan_name
      FROM video_subscriptions vsub
      JOIN video_subscription_plans spl ON spl.id = vsub.plan_id
      WHERE user_id = ?
        AND status = 'active'
        AND (access_end IS NULL OR access_end >= NOW())
      LIMIT 1
      `,
      [auth.userId]
    );

    const subscribed = subRows.length > 0;
    const planName =
      subRows.length > 0 && typeof subRows[0]?.plan_name === "string"
        ? subRows[0].plan_name
        : null;

    const [rows] = await db.query<CourseRow[]>(
      `
      SELECT
        vc.id,
        vc.title,
        vc.slug,
        vc.thumbnail_url,
        vc.is_active,
        (
          SELECT MIN(vcp.price)
          FROM video_course_plans vcp
          WHERE vcp.course_id = vc.id AND vcp.is_active = 1
        ) AS min_price
      FROM video_courses vc
      WHERE vc.is_active = 1
      ORDER BY created_at DESC
      `
    );

    const courses = rows.map((row) => ({
      courseId: row.id,
      title: row.title,
      slug: row.slug,
      thumbnailUrl: row.thumbnail_url,
      isActive: Number(row.is_active) === 1,
    }));

    if (subscribed) {
      return NextResponse.json({ subscribed: true, planName, courses });
    }

    const freeCourses = courses.filter((course) => {
      const row = rows.find((r) => r.id === course.courseId);
      const price =
        typeof row?.min_price === "string"
          ? Number(row.min_price)
          : typeof row?.min_price === "number"
            ? row.min_price
            : null;
      return price === null || (Number.isFinite(price) && price <= 0);
    });

    return NextResponse.json({ subscribed: false, courses: freeCourses });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
