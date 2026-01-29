import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

export const runtime = "nodejs";

export async function PUT(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const planId = Number(params?.id);
  if (!Number.isFinite(planId) || planId <= 0) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : null;
  const durationDays =
    typeof data.duration_days === "number" ? data.duration_days : Number(data.duration_days);
  const price = typeof data.price === "number" ? data.price : Number(data.price);
  const description =
    typeof data.description === "string" ? data.description.trim() : null;
  const features = typeof data.features === "string" ? data.features.trim() : null;
  const accessCourses =
    typeof data.access_courses === "number"
      ? data.access_courses
      : data.access_courses == null
        ? null
        : data.access_courses
          ? 1
          : 0;
  const accessAiTools =
    typeof data.access_ai_tools === "number"
      ? data.access_ai_tools
      : data.access_ai_tools == null
        ? null
        : data.access_ai_tools
          ? 1
          : 0;
  const accessDownloads =
    typeof data.access_downloads === "number"
      ? data.access_downloads
      : data.access_downloads == null
        ? null
        : data.access_downloads
          ? 1
          : 0;
  const khqr =
    typeof data.khqr === "string" && data.khqr.trim() ? data.khqr.trim() : null;
  const usdqr =
    typeof data.usdqr === "string" && data.usdqr.trim() ? data.usdqr.trim() : null;
  const isActive =
    typeof data.is_active === "number" ? (data.is_active ? 1 : 0) : null;

  const [result] = await db.query<ResultSetHeader>(
    `
    UPDATE video_subscription_plans
    SET
      name = COALESCE(?, name),
      duration_days = COALESCE(?, duration_days),
      price = COALESCE(?, price),
      description = COALESCE(?, description),
      features = COALESCE(?, features),
      access_courses = COALESCE(?, access_courses),
      access_ai_tools = COALESCE(?, access_ai_tools),
      access_downloads = COALESCE(?, access_downloads),
      khqr = COALESCE(?, khqr),
      usdqr = COALESCE(?, usdqr),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
    `,
    [
      name,
      Number.isFinite(durationDays) ? durationDays : null,
      Number.isFinite(price) ? price : null,
      description,
      features,
      accessCourses,
      accessAiTools,
      accessDownloads,
      khqr,
      usdqr,
      isActive,
      planId,
    ]
  );

  if (result.affectedRows === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const planId = Number(params?.id);
  if (!Number.isFinite(planId) || planId <= 0) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM video_subscription_plans WHERE id = ?",
    [planId]
  );

  if (result.affectedRows === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
