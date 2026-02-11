import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id?: string; planId?: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await ctx.params;
    const courseId = Number(params?.id);
    const planId = Number(params?.planId);
    if (!Number.isFinite(courseId) || courseId <= 0 || !Number.isFinite(planId) || planId <= 0) {
      return Response.json({ error: "Invalid ids" }, { status: 400 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const sets: string[] = [];
    const values: Array<string | number | null> = [];

    if ("name" in data) {
      const name = typeof data.name === "string" ? data.name.trim() : "";
      if (!name) return Response.json({ error: "Invalid name" }, { status: 400 });
      sets.push("name = ?");
      values.push(name);
    }

  if ("access_type" in data) {
    const accessType =
      typeof data.access_type === "string" && ["lifetime", "months"].includes(data.access_type)
        ? data.access_type
        : null;
    if (!accessType) return Response.json({ error: "Invalid access_type" }, { status: 400 });
    sets.push("access_type = ?");
    values.push(accessType);
  }

  if ("duration_days" in data) {
    if (data.duration_days === null) {
      sets.push("duration_days = NULL");
    } else {
      const durationDays =
        typeof data.duration_days === "number" ? data.duration_days : Number(data.duration_days);
      if (!Number.isFinite(durationDays) || durationDays <= 0) {
        return Response.json({ error: "Invalid duration_days" }, { status: 400 });
      }
      sets.push("duration_days = ?");
      values.push(Math.floor(durationDays));
    }
  }

  if ("price" in data) {
    const price = typeof data.price === "number" ? data.price : Number(data.price);
    if (!Number.isFinite(price) || price < 0) {
      return Response.json({ error: "Invalid price" }, { status: 400 });
    }
    sets.push("price = ?");
    values.push(price);
  }

  if ("khqr" in data) {
    const khqr = typeof data.khqr === "string" ? data.khqr.trim() : "";
    sets.push("khqr = ?");
    values.push(khqr || "/paymentQR/khmer_qr.jpg");
  }

  if ("usdqr" in data) {
    const usdqr = typeof data.usdqr === "string" ? data.usdqr.trim() : "";
    sets.push("usdqr = ?");
    values.push(usdqr || "none");
  }

  if ("max_devices" in data || "is_unlimited_device" in data) {
    const isUnlimitedRaw = data.is_unlimited_device;
    const isUnlimited =
      isUnlimitedRaw === true ||
      isUnlimitedRaw === 1 ||
      isUnlimitedRaw === "1";
    if ("is_unlimited_device" in data) {
      sets.push("is_unlimited_device = ?");
      values.push(isUnlimited ? 1 : 0);
    }

    if ("max_devices" in data || isUnlimited) {
      if (isUnlimited) {
        sets.push("max_devices = ?");
        values.push(9999);
      } else {
        const maxDevices =
          typeof data.max_devices === "number" ? data.max_devices : Number(data.max_devices);
        if (!Number.isFinite(maxDevices) || maxDevices <= 0) {
          return Response.json({ error: "Invalid max_devices" }, { status: 400 });
        }
        sets.push("max_devices = ?");
        values.push(Math.floor(maxDevices));
      }
    }
  }

    if ("is_active" in data) {
      const isActiveRaw = data.is_active;
      const isActive =
        isActiveRaw === true || isActiveRaw === 1 || isActiveRaw === "1"
          ? 1
          : isActiveRaw === false || isActiveRaw === 0 || isActiveRaw === "0"
            ? 0
            : null;
      if (isActive === null) return Response.json({ error: "Invalid is_active" }, { status: 400 });
      sets.push("is_active = ?");
      values.push(isActive);
    }

    if (sets.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `
      UPDATE video_course_plans
      SET
        ${sets.join(", ")}
      WHERE id = ? AND course_id = ?
      `,
      [
        ...values,
        planId,
        courseId,
      ]
    );

    if (result.affectedRows === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to update plan",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id?: string; planId?: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await ctx.params;
    const courseId = Number(params?.id);
    const planId = Number(params?.planId);
    if (!Number.isFinite(courseId) || courseId <= 0 || !Number.isFinite(planId) || planId <= 0) {
      return Response.json({ error: "Invalid ids" }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      "DELETE FROM video_course_plans WHERE id = ? AND course_id = ?",
      [planId, courseId]
    );

    if (result.affectedRows === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to delete plan",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
