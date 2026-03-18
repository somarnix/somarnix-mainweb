import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureSystemNotificationsSchema, type SystemNotificationIcon } from "@/lib/system-notifications";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type NotificationOwnerRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  dedupe_key: string | null;
};

type UserRow = RowDataPacket & {
  id: number;
};

function normalizeIcon(value: unknown): SystemNotificationIcon {
  if (value === "account" || value === "product" || value === "update") return value;
  return "security";
}

function cleanString(value: unknown, max = 255): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanNullableString(value: unknown, max = 255): string | null {
  const cleaned = cleanString(value, max);
  return cleaned || null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureSystemNotificationsSchema();
    const { id } = await ctx.params;
    const notificationId = Number(id);
    if (!Number.isFinite(notificationId) || notificationId <= 0) {
      return Response.json({ error: "Invalid notification id" }, { status: 400 });
    }

    const [existingRows] = await db.query<NotificationOwnerRow[]>(
      `SELECT id, user_id, dedupe_key FROM system_notifications WHERE id = ? LIMIT 1`,
      [notificationId]
    );
    const existing = existingRows[0];
    if (!existing) {
      return Response.json({ error: "Notification not found" }, { status: 404 });
    }

    const raw = await req.json().catch(() => ({}));
    const body =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

    const scope = body.scope === "user" ? "user" : "global";
    const category = cleanString(body.category, 64) || "general";
    const icon = normalizeIcon(body.icon);
    const title = cleanString(body.title, 255);
    const description = cleanString(body.description, 5000);
    const linkUrl = cleanNullableString(body.linkUrl, 255);
    const recipientEmail = cleanNullableString(body.recipientEmail, 255);

    if (!title || !description) {
      return Response.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    let userId: number | null = null;
    if (scope === "user") {
      if (!recipientEmail) {
        return Response.json(
          { error: "Recipient email is required for user notifications" },
          { status: 400 }
        );
      }

      const [userRows] = await db.query<UserRow[]>(
        `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
          AND deleted_at IS NULL
        LIMIT 1
        `,
        [recipientEmail]
      );
      if (userRows.length === 0) {
        return Response.json({ error: "Recipient not found" }, { status: 404 });
      }
      userId = Number(userRows[0].id);
    }

    await db.query<ResultSetHeader>(
      `
      UPDATE system_notifications
      SET
        user_id = ?,
        category = ?,
        icon_key = ?,
        title = ?,
        description = ?,
        link_url = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [userId, category, icon, title, description, linkUrl, notificationId]
    );

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureSystemNotificationsSchema();
    const { id } = await ctx.params;
    const notificationId = Number(id);
    if (!Number.isFinite(notificationId) || notificationId <= 0) {
      return Response.json({ error: "Invalid notification id" }, { status: 400 });
    }

    const [existingRows] = await db.query<NotificationOwnerRow[]>(
      `SELECT id, user_id, dedupe_key FROM system_notifications WHERE id = ? LIMIT 1`,
      [notificationId]
    );
    const existing = existingRows[0];
    if (!existing) {
      return Response.json({ error: "Notification not found" }, { status: 404 });
    }

    if (typeof existing.dedupe_key === "string" && existing.dedupe_key.startsWith("global:")) {
      return Response.json(
        { error: "Default seeded notifications cannot be deleted" },
        { status: 400 }
      );
    }

    await db.query<ResultSetHeader>(
      `DELETE FROM system_notifications WHERE id = ?`,
      [notificationId]
    );

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
