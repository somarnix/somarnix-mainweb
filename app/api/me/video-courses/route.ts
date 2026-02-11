import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type CourseRow = RowDataPacket & {
  course_id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  is_active: number;
  order_number: string | null;
  plan_name: string | null;
  access_start: string | Date | null;
  access_end: string | Date | null;
  status: string | null;
};

function toDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}Z`;
  }
  return trimmed;
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [orderStateColumnRows] = await db.query<RowDataPacket[]>(
      `
      SELECT 1 AS ok
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'orders'
        AND column_name = 'state'
      LIMIT 1
      `
    );
    const hasOrderStateColumn = orderStateColumnRows.length > 0;

    const [orderStatusColumnRows] = await db.query<RowDataPacket[]>(
      `
      SELECT 1 AS ok
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'orders'
        AND column_name = 'status'
      LIMIT 1
      `
    );
    const hasOrderStatusColumn = orderStatusColumnRows.length > 0;

    const completedOrderClause = hasOrderStateColumn
      ? "o2.state IN ('completed','complete')"
      : hasOrderStatusColumn
        ? "o2.status IN ('completed','complete')"
        : "1 = 0";

    const [rows] = await db.query<CourseRow[]>(
      `
      SELECT
        vc.id AS course_id,
        vc.title,
        vc.slug,
        vc.thumbnail_url,
        vc.is_active,
        o.order_number,
        vcp.access_start,
        vcp.access_end,
        vcp.status,
        vplan.name AS plan_name
      FROM video_course_purchases vcp
      JOIN video_courses vc ON vc.id = vcp.course_id
      JOIN video_course_plans vplan ON vplan.id = vcp.plan_id
      LEFT JOIN orders o ON o.id = vcp.order_id
      WHERE vcp.user_id = ?
        AND vcp.status IN ('active','pending')
        AND (
          vcp.order_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM orders o2
            WHERE o2.id = vcp.order_id
              AND ${completedOrderClause}
          )
        )
      ORDER BY vcp.created_at DESC, vcp.id DESC
      `,
      [auth.userId]
    );

    const courses = rows.map((row) => ({
      courseId: row.course_id,
      title: row.title,
      slug: row.slug,
      thumbnailUrl: row.thumbnail_url,
      orderNumber: row.order_number,
      planName: row.plan_name,
      accessStart: toDate(row.access_start),
      accessEnd: toDate(row.access_end),
      status: Number(row.is_active) === 1 ? row.status : "expired",
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
