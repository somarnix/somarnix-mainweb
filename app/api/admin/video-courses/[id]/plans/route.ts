import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type PlanRow = RowDataPacket & {
  id: number;
  course_id: number;
  name: string;
  access_type: string;
  duration_days: number | null;
  price: number | string;
  khqr: string | null;
  usdqr: string | null;
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

  const [rows] = await db.query<PlanRow[]>(
    `
    SELECT id, course_id, name, access_type, duration_days, price, khqr, usdqr, is_active
    FROM video_course_plans
    WHERE course_id = ?
    ORDER BY id ASC
    `,
    [courseId]
  );

  return Response.json({ plans: rows });
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
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const accessType =
    typeof data.access_type === "string" && ["lifetime", "months"].includes(data.access_type)
      ? data.access_type
      : "lifetime";
  const durationDays =
    typeof data.duration_days === "number" ? data.duration_days : Number(data.duration_days);
  const price = Number(data.price);
  const khqr = typeof data.khqr === "string" ? data.khqr.trim() : "";
  const usdqr = typeof data.usdqr === "string" ? data.usdqr.trim() : "none";

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) {
    return Response.json({ error: "Invalid price" }, { status: 400 });
  }

  const [result] = await db.query<ResultSetHeader>(
    `
    INSERT INTO video_course_plans (course_id, name, access_type, duration_days, price, khqr, usdqr)
    VALUES (?,?,?,?,?,?,?)
    `,
    [
      courseId,
      name,
      accessType,
      accessType === "months" && Number.isFinite(durationDays) ? durationDays : null,
      price,
      khqr || "/paymentQR/khmer_qr.jpg",
      usdqr || "none",
    ]
  );

  return Response.json({ success: true, id: result.insertId });
}
