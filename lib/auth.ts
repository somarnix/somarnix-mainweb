import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "./db";
import type { RowDataPacket } from "mysql2";

export type AuthUser = {
  id?: number;
  userId: number;
  role: "user" | "admin";
};

type TokenPayload = JwtPayload & {
  userId: number;
  role: "user" | "admin";
  loginDeviceId?: number;
};

type DbUserRow = RowDataPacket & {
  id: number;
  role: "user" | "admin";
  is_active: number;
  deleted_at: string | Date | null;
  ban_until?: string | Date | null;
};

async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [table, column]
  );
  return rows.length > 0;
}

async function hasTable(table: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ?
    LIMIT 1
    `,
    [table]
  );
  return rows.length > 0;
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie
    .split("; ")
    .find((c) => c.startsWith("token="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "dev_secret"
    );

    if (typeof decoded !== "object" || decoded === null) {
      return null;
    }

    const payload = decoded as TokenPayload;

    if (!payload.userId) {
      return null;
    }

    const hasLoginDevices = await hasTable("user_login_devices");
    if (hasLoginDevices) {
      const loginDeviceId = Number(payload.loginDeviceId ?? 0);
      if (!Number.isFinite(loginDeviceId) || loginDeviceId <= 0) {
        return null;
      }
      const [deviceRows] = await db.query<RowDataPacket[]>(
        `
        SELECT id
        FROM user_login_devices
        WHERE id = ? AND user_id = ?
        LIMIT 1
        `,
        [loginDeviceId, Number(payload.userId)]
      );
      if (deviceRows.length === 0) {
        return null;
      }
    }

    const usersHasBanUntil = await hasColumn("users", "ban_until");
    const usersHasBannedAt = await hasColumn("users", "banned_at");
    const usersHasBanReason = await hasColumn("users", "ban_reason");
    const usersHasUpdatedAt = await hasColumn("users", "updated_at");

    const [rows] = await db.query<DbUserRow[]>(
      `
      SELECT id, role, is_active, deleted_at${
        usersHasBanUntil ? ", ban_until" : ", NULL AS ban_until"
      }
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [Number(payload.userId)]
    );

    if (rows.length === 0) return null;

    const user = rows[0];
    if (user.deleted_at) return null;

    if (Number(user.is_active) !== 1) {
      if (usersHasBanUntil && user.ban_until) {
        const banUntilDate = new Date(user.ban_until);
        if (!Number.isNaN(banUntilDate.getTime()) && banUntilDate.getTime() <= Date.now()) {
          const clearParts: string[] = ["is_active = 1", "ban_until = NULL"];
          if (usersHasBannedAt) clearParts.push("banned_at = NULL");
          if (usersHasBanReason) clearParts.push("ban_reason = NULL");
          if (usersHasUpdatedAt) clearParts.push("updated_at = NOW()");
          await db.query(
            `
            UPDATE users
            SET ${clearParts.join(", ")}
            WHERE id = ?
            `,
            [user.id]
          );
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    const authUser = {
      userId: Number(user.id),
      role: user.role === "admin" ? "admin" : "user",
    };
    return authUser;
  } catch {
    return null;
  }
}
