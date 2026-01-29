import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type SubPlanRow = RowDataPacket & {
  id: number;
  name: string;
  duration_days: number;
  price: number | string;
  description: string | null;
  features: string | null;
  access_courses: number;
  access_ai_tools: number;
  access_downloads: number;
  khqr: string | null;
  usdqr: string | null;
  is_active: number;
};

export async function GET(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [rows] = await db.query<SubPlanRow[]>(
    `
    SELECT
      id,
      name,
      duration_days,
      price,
      description,
      features,
      access_courses,
      access_ai_tools,
      access_downloads,
      khqr,
      usdqr,
      is_active
    FROM video_subscription_plans
    ORDER BY id ASC
    `
  );

  return Response.json({ plans: rows });
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const durationDays =
    typeof data.duration_days === "number" ? data.duration_days : Number(data.duration_days);
  const price = Number(data.price);
  const description = typeof data.description === "string" ? data.description.trim() : null;
  const features = typeof data.features === "string" ? data.features.trim() : null;
  const accessCourses =
    typeof data.access_courses === "number"
      ? data.access_courses
      : data.access_courses
        ? 1
        : 0;
  const accessAiTools =
    typeof data.access_ai_tools === "number"
      ? data.access_ai_tools
      : data.access_ai_tools
        ? 1
        : 0;
  const accessDownloads =
    typeof data.access_downloads === "number"
      ? data.access_downloads
      : data.access_downloads
        ? 1
        : 0;
  const khqr = typeof data.khqr === "string" && data.khqr.trim() ? data.khqr.trim() : null;
  const usdqr = typeof data.usdqr === "string" && data.usdqr.trim() ? data.usdqr.trim() : "none";

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    return Response.json({ error: "Invalid duration" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return Response.json({ error: "Invalid price" }, { status: 400 });
  }

  const [result] = await db.query<ResultSetHeader>(
    `
    INSERT INTO video_subscription_plans (
      name,
      duration_days,
      price,
      description,
      features,
      access_courses,
      access_ai_tools,
      access_downloads,
      khqr,
      usdqr
    )
    VALUES (?,?,?,?,?,?,?,?,?,?)
    `,
    [
      name,
      durationDays,
      price,
      description,
      features,
      accessCourses ? 1 : 0,
      accessAiTools ? 1 : 0,
      accessDownloads ? 1 : 0,
      khqr ?? "/paymentQR/khmer_qr.jpg",
      usdqr ?? "none",
    ]
  );

  return Response.json({ success: true, id: result.insertId });
}
