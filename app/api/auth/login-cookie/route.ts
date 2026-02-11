import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string | null;
  role: string;
  is_active: number; // usually 0/1
  deleted_at: string | null;
  ban_until?: string | Date | null;
  email_verified_at?: string | Date | null;
}

interface LoginBody {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

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

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.json().catch(() => null);
    const body: Partial<LoginBody> =
      raw && typeof raw === "object" ? (raw as LoginBody) : {};

    const email = normalizeString(body.email);
    const password = normalizeString(body.password);
    const deviceId = normalizeString(body.deviceId);
    const deviceName = normalizeString(body.deviceName);

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const usersHasBanUntil = await hasColumn("users", "ban_until");
    const usersHasEmailVerifiedAt = await hasColumn("users", "email_verified_at");
    const usersHasBannedAt = await hasColumn("users", "banned_at");
    const usersHasBanReason = await hasColumn("users", "ban_reason");
    const usersHasUpdatedAt = await hasColumn("users", "updated_at");
    const hasLoginDevicesTable = await hasTable("user_login_devices");
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, password_hash, role, is_active, deleted_at${
        usersHasBanUntil ? ", ban_until" : ", NULL AS ban_until"
      }${
        usersHasEmailVerifiedAt ? ", email_verified_at" : ", NULL AS email_verified_at"
      } FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Invalid login" }, { status: 401 });
    }

    const user = rows[0];

    if (user.deleted_at) {
      return Response.json(
        {
          error: "This account was deleted. Please create a new account.",
          code: "ACCOUNT_DELETED",
        },
        { status: 403 }
      );
    }

    if (usersHasEmailVerifiedAt && !user.email_verified_at) {
      return Response.json(
        {
          error: "Email not verified. Please verify your email before login.",
          code: "ACCOUNT_EMAIL_NOT_VERIFIED",
          email: user.email,
        },
        { status: 403 }
      );
    }

    if (user.is_active === 0) {
      if (usersHasBanUntil && user.ban_until) {
        const banUntilDate = new Date(user.ban_until);
        if (!Number.isNaN(banUntilDate.getTime()) && banUntilDate.getTime() <= Date.now()) {
          if (hasLoginDevicesTable) {
            await db.query(
              `DELETE FROM user_login_devices WHERE user_id = ?`,
              [user.id]
            );
          }
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
          const diffMs = banUntilDate.getTime() - Date.now();
          const banDaysLeft = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
          return Response.json(
            {
              error: "This account is banned temporarily.",
              code: "ACCOUNT_BANNED_UNTIL",
              banUntil: banUntilDate.toISOString(),
              banDaysLeft,
            },
            { status: 403 }
          );
        }
      } else {
        return Response.json(
          {
            error: "This account is banned permanently.",
            code: "ACCOUNT_BANNED",
          },
          { status: 403 }
        );
      }
    }

    if (!user.password_hash) {
      return Response.json(
        {
          error: "This account uses Google login. Please continue with Google.",
          code: "ACCOUNT_PASSWORD_NOT_SET",
        },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return Response.json({ error: "Invalid login" }, { status: 401 });
    }

    const hasLoginSettingsTable = await hasTable("user_login_settings");
    let loginDeviceRowId: number | null = null;
    if (hasLoginSettingsTable && hasLoginDevicesTable) {
      if (!deviceId) {
        return Response.json(
          {
            error: "Device ID is required for login.",
            code: "LOGIN_DEVICE_REQUIRED",
          },
          { status: 400 }
        );
      }

      const [settingsRows] = await db.query<RowDataPacket[]>(
        `
        SELECT max_devices
        FROM user_login_settings
        WHERE user_id = ?
        LIMIT 1
        `,
        [user.id]
      );

      if (settingsRows.length === 0) {
        await db.query(
          `
          INSERT INTO user_login_settings (user_id, max_devices)
          VALUES (?, 10)
          `,
          [user.id]
        );
      }

      const maxDevices = Math.max(
        1,
        Number(settingsRows[0]?.max_devices ?? 10) || 10
      );

      const [existingRows] = await db.query<RowDataPacket[]>(
        `
        SELECT id
        FROM user_login_devices
        WHERE user_id = ? AND device_id = ?
        LIMIT 1
        `,
        [user.id, deviceId]
      );

      if (existingRows.length > 0) {
        loginDeviceRowId = Number(existingRows[0]?.id ?? 0) || null;
        await db.query(
          `
          UPDATE user_login_devices
          SET last_seen_at = NOW(), device_name = COALESCE(?, device_name)
          WHERE user_id = ? AND device_id = ?
          `,
          [deviceName, user.id, deviceId]
        );
      } else {
        const [countRows] = await db.query<RowDataPacket[]>(
          `
          SELECT COUNT(*) AS total
          FROM user_login_devices
          WHERE user_id = ?
          `,
          [user.id]
        );
        const totalDevices = Number(countRows[0]?.total ?? 0);
        if (totalDevices >= maxDevices) {
          return Response.json(
            {
              error: `Login device limit reached (${maxDevices}).`,
              code: "ACCOUNT_LOGIN_DEVICE_LIMIT",
              maxDevices,
            },
            { status: 403 }
          );
        }

        const [insertResult] = await db.query<ResultSetHeader>(
          `
          INSERT INTO user_login_devices (user_id, device_id, device_name, first_seen_at, last_seen_at)
          VALUES (?, ?, ?, NOW(), NOW())
          `,
          [user.id, deviceId, deviceName]
        );
        loginDeviceRowId = Number(insertResult?.insertId ?? 0) || null;
      }
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, loginDeviceId: loginDeviceRowId ?? undefined },
      process.env.JWT_SECRET ?? "dev_secret",
      { expiresIn: "7d" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: user.id, email: user.email, role: user.role },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // httpOnly cookie (safe)
          "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
            7 * 24 * 60 * 60
          }`,
        },
      }
    );
  } catch (err) {
    return Response.json(
      {
        error: "Server error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
