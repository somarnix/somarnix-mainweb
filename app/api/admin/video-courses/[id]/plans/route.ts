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
  device_count: number;
  max_devices: number;
  is_unlimited_device: number;
  khqr: string | null;
  usdqr: string | null;
  is_active: number;
};

export async function GET(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  try {
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
      SELECT
        p.id,
        p.course_id,
        p.name,
        p.access_type,
        p.duration_days,
        p.price,
        COALESCE((
          SELECT COUNT(DISTINCT CONCAT(d.user_id, ':', d.device_id))
          FROM video_course_device_access d
          JOIN video_course_purchases vcp
            ON vcp.user_id = d.user_id
           AND vcp.course_id = d.course_id
          WHERE vcp.course_id = p.course_id
            AND vcp.plan_id = p.id
            AND vcp.status = 'active'
        ), 0) AS device_count,
        p.max_devices,
        p.is_unlimited_device,
        p.khqr,
        p.usdqr,
        p.is_active
      FROM video_course_plans p
      WHERE p.course_id = ?
      ORDER BY id ASC
      `,
      [courseId]
    );

    return Response.json({ plans: rows });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to load plans",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  try {
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
    const isUnlimitedDeviceRaw = data.is_unlimited_device;
    const isUnlimitedDevice =
      isUnlimitedDeviceRaw === true ||
      isUnlimitedDeviceRaw === 1 ||
      isUnlimitedDeviceRaw === "1";
    const maxDevicesRaw =
      typeof data.max_devices === "number" ? data.max_devices : Number(data.max_devices);
    const maxDevices = isUnlimitedDevice ? 9999 : Math.floor(maxDevicesRaw);
    const khqr = typeof data.khqr === "string" ? data.khqr.trim() : "";
    const usdqr = typeof data.usdqr === "string" ? data.usdqr.trim() : "none";

    if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
    if (!Number.isFinite(price) || price < 0) {
      return Response.json({ error: "Invalid price" }, { status: 400 });
    }
    if (accessType === "months" && (!Number.isFinite(durationDays) || durationDays <= 0)) {
      return Response.json({ error: "Invalid duration_days" }, { status: 400 });
    }
    if (!isUnlimitedDevice && (!Number.isFinite(maxDevices) || maxDevices <= 0)) {
      return Response.json({ error: "Invalid max_devices" }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `
      INSERT INTO video_course_plans (
        course_id,
        name,
        access_type,
        duration_days,
        price,
        max_devices,
        is_unlimited_device,
        khqr,
        usdqr
      )
      VALUES (?,?,?,?,?,?,?,?,?)
      `,
      [
        courseId,
        name,
        accessType,
        accessType === "months" && Number.isFinite(durationDays) ? durationDays : null,
        price,
        maxDevices,
        isUnlimitedDevice ? 1 : 0,
        khqr || "/paymentQR/khmer_qr.jpg",
        usdqr || "none",
      ]
    );

    return Response.json({ success: true, id: result.insertId });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to add plan",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
