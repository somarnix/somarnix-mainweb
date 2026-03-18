import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ensureSystemNotificationsSchema,
  seedDefaultSystemNotifications,
  type SystemNotificationIcon,
} from "@/lib/system-notifications";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type NotificationRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  user_email: string | null;
  category: string;
  icon_key: string;
  title: string;
  description: string;
  link_url: string | null;
  dedupe_key: string | null;
  created_at: string | null;
  updated_at: string | null;
  read_count: number;
};

type UserOptionRow = RowDataPacket & {
  id: number;
  email: string;
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

export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureSystemNotificationsSchema();
    await seedDefaultSystemNotifications();

    const [rows] = await db.query<NotificationRow[]>(
      `
      SELECT
        sn.id,
        sn.user_id,
        u.email AS user_email,
        sn.category,
        sn.icon_key,
        sn.title,
        sn.description,
        sn.link_url,
        sn.dedupe_key,
        sn.created_at,
        sn.updated_at,
        CASE
          WHEN sn.user_id IS NULL THEN (
            SELECT COUNT(*)
            FROM system_notification_reads sr
            WHERE sr.notification_id = sn.id
          )
          WHEN sn.is_read = 1 THEN 1
          ELSE 0
        END AS read_count
      FROM system_notifications sn
      LEFT JOIN users u ON u.id = sn.user_id
      ORDER BY sn.created_at DESC, sn.id DESC
      LIMIT 300
      `
    );

    const [userRows] = await db.query<UserOptionRow[]>(
      `
      SELECT id, email
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY email ASC
      LIMIT 200
      `
    );

    const notifications = rows.map((row) => ({
      id: Number(row.id),
      userId: row.user_id === null ? null : Number(row.user_id),
      userEmail: row.user_email ? String(row.user_email) : null,
      scope: row.user_id === null ? "global" : "user",
      category: String(row.category || "general"),
      icon: normalizeIcon(row.icon_key),
      title: String(row.title || ""),
      description: String(row.description || ""),
      linkUrl: row.link_url ? String(row.link_url) : null,
      dedupeKey: row.dedupe_key ? String(row.dedupe_key) : null,
      createdAt: row.created_at ? String(row.created_at) : null,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
      readCount: Number(row.read_count ?? 0),
      isSeeded:
        typeof row.dedupe_key === "string" && row.dedupe_key.startsWith("global:"),
    }));

    const stats = {
      total: notifications.length,
      global: notifications.filter((item) => item.scope === "global").length,
      targeted: notifications.filter((item) => item.scope === "user").length,
      seeded: notifications.filter((item) => item.isSeeded).length,
      createdToday: notifications.filter((item) => {
        if (!item.createdAt) return false;
        const created = new Date(item.createdAt);
        if (Number.isNaN(created.getTime())) return false;
        const now = new Date();
        return (
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth() &&
          created.getDate() === now.getDate()
        );
      }).length,
    };

    return Response.json({
      notifications,
      stats,
      users: userRows.map((row) => ({
        id: Number(row.id),
        email: String(row.email),
      })),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureSystemNotificationsSchema();
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

      const [userRows] = await db.query<UserOptionRow[]>(
        `SELECT id, email FROM users WHERE email = ? LIMIT 1`,
        [recipientEmail]
      );
      if (userRows.length === 0) {
        return Response.json({ error: "Recipient not found" }, { status: 404 });
      }
      userId = Number(userRows[0].id);
    }

    const [result] = await db.query<ResultSetHeader>(
      `
      INSERT INTO system_notifications (
        user_id,
        category,
        icon_key,
        title,
        description,
        link_url,
        dedupe_key
      )
      VALUES (?, ?, ?, ?, ?, ?, NULL)
      `,
      [userId, category, icon, title, description, linkUrl]
    );

    return Response.json({ success: true, id: result.insertId });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
