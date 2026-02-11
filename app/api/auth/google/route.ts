import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type GoogleTokenInfo = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string;
  given_name?: string;
  family_name?: string;
};

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  role: string;
  is_active: number;
  deleted_at: string | Date | null;
  ban_until?: string | Date | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toSafeUsernameBase(email: string): string {
  const local = email.split("@")[0]?.toLowerCase() ?? "user";
  const cleaned = local.replace(/[^a-z0-9._]/g, "").slice(0, 20);
  return cleaned || "user";
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

async function ensureUniqueUsername(email: string): Promise<string> {
  const base = toSafeUsernameBase(email);
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE username = ? LIMIT 1`,
      [candidate]
    );
    if (rows.length === 0) return candidate;
  }
  return `user${Date.now()}`;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.json().catch(() => null);
    const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const credential = normalizeString(body.credential);
    const deviceId = normalizeString(body.deviceId);
    const deviceName = normalizeString(body.deviceName);

    if (!credential) {
      return Response.json({ error: "Google credential is required" }, { status: 400 });
    }

    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!tokenInfoRes.ok) {
      return Response.json({ error: "Invalid Google credential" }, { status: 401 });
    }
    const tokenInfo = (await tokenInfoRes.json()) as GoogleTokenInfo;

    const email = normalizeString(tokenInfo.email)?.toLowerCase();
    const googleSub = normalizeString(tokenInfo.sub);
    const emailVerified = tokenInfo.email_verified === "true";
    const expectedAud = normalizeString(
      process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    );
    if (!expectedAud) {
      return Response.json(
        { error: "Google login is not configured (missing GOOGLE_CLIENT_ID)." },
        { status: 500 }
      );
    }
    if (!email || !googleSub || !emailVerified || tokenInfo.aud !== expectedAud) {
      return Response.json({ error: "Google account verification failed" }, { status: 401 });
    }

    const usersHasBanUntil = await hasColumn("users", "ban_until");
    const usersHasBannedAt = await hasColumn("users", "banned_at");
    const usersHasBanReason = await hasColumn("users", "ban_reason");
    const usersHasUpdatedAt = await hasColumn("users", "updated_at");
    const usersHasEmailVerifiedAt = await hasColumn("users", "email_verified_at");
    const hasUserIdentities = await hasTable("user_identities");
    const hasLoginDevicesTable = await hasTable("user_login_devices");
    const hasLoginSettingsTable = await hasTable("user_login_settings");

    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, role, is_active, deleted_at${
        usersHasBanUntil ? ", ban_until" : ", NULL AS ban_until"
      } FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    let userId = 0;
    let role: "user" | "admin" = "user";
    if (rows.length > 0) {
      const user = rows[0];
      if (user.deleted_at) {
        return Response.json(
          { error: "This email belongs to a deleted account." },
          { status: 403 }
        );
      }
      if (Number(user.is_active) !== 1) {
        if (usersHasBanUntil && user.ban_until) {
          const banUntilDate = new Date(user.ban_until);
          if (Number.isNaN(banUntilDate.getTime()) || banUntilDate.getTime() > Date.now()) {
            return Response.json(
              { error: "This account is banned.", code: "ACCOUNT_BANNED" },
              { status: 403 }
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
          return Response.json(
            { error: "This account is banned.", code: "ACCOUNT_BANNED" },
            { status: 403 }
          );
        }
      }
      userId = Number(user.id);
      role = user.role === "admin" ? "admin" : "user";

      const firstName = normalizeString(tokenInfo.given_name);
      const lastName = normalizeString(tokenInfo.family_name);
      if (usersHasEmailVerifiedAt) {
        await db.query(
          `
          UPDATE users
          SET
            first_name = COALESCE(first_name, ?),
            last_name = COALESCE(last_name, ?),
            email_verified_at = COALESCE(email_verified_at, NOW()),
            is_active = 1
          WHERE id = ?
          `,
          [firstName, lastName, userId]
        );
      } else {
        await db.query(
          `
          UPDATE users
          SET
            first_name = COALESCE(first_name, ?),
            last_name = COALESCE(last_name, ?),
            is_active = 1
          WHERE id = ?
          `,
          [firstName, lastName, userId]
        );
      }
    } else {
      const firstName = normalizeString(tokenInfo.given_name);
      const lastName = normalizeString(tokenInfo.family_name);
      const username = await ensureUniqueUsername(email);
      const [insertResult] = usersHasEmailVerifiedAt
        ? await db.query<ResultSetHeader>(
            `
            INSERT INTO users (
              email, password_hash, role, is_active,
              first_name, last_name, username, email_verified_at
            )
            VALUES (?, NULL, 'user', 1, ?, ?, ?, NOW())
            `,
            [email, firstName, lastName, username]
          )
        : await db.query<ResultSetHeader>(
            `
            INSERT INTO users (
              email, password_hash, role, is_active,
              first_name, last_name, username
            )
            VALUES (?, NULL, 'user', 1, ?, ?, ?)
            `,
            [email, firstName, lastName, username]
          );
      userId = Number(insertResult.insertId);
      role = "user";
    }

    if (hasUserIdentities) {
      await db.query(
        `
        INSERT INTO user_identities (user_id, provider, provider_user_id, provider_email)
        VALUES (?, 'google', ?, ?)
        ON DUPLICATE KEY UPDATE
          user_id = VALUES(user_id),
          provider_email = VALUES(provider_email)
        `,
        [userId, googleSub, email]
      );
    }

    let loginDeviceRowId: number | null = null;
    if (hasLoginDevicesTable && hasLoginSettingsTable) {
      if (!deviceId) {
        return Response.json(
          { error: "Device ID is required for login.", code: "LOGIN_DEVICE_REQUIRED" },
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
        [userId]
      );
      if (settingsRows.length === 0) {
        await db.query(
          `
          INSERT INTO user_login_settings (user_id, max_devices)
          VALUES (?, 10)
          `,
          [userId]
        );
      }
      const maxDevices = Math.max(1, Number(settingsRows[0]?.max_devices ?? 10) || 10);

      const [existingRows] = await db.query<RowDataPacket[]>(
        `
        SELECT id
        FROM user_login_devices
        WHERE user_id = ? AND device_id = ?
        LIMIT 1
        `,
        [userId, deviceId]
      );
      if (existingRows.length > 0) {
        loginDeviceRowId = Number(existingRows[0]?.id ?? 0) || null;
        await db.query(
          `
          UPDATE user_login_devices
          SET last_seen_at = NOW(), device_name = COALESCE(?, device_name)
          WHERE user_id = ? AND device_id = ?
          `,
          [deviceName, userId, deviceId]
        );
      } else {
        const [countRows] = await db.query<RowDataPacket[]>(
          `
          SELECT COUNT(*) AS total
          FROM user_login_devices
          WHERE user_id = ?
          `,
          [userId]
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
        const [insertDevice] = await db.query<ResultSetHeader>(
          `
          INSERT INTO user_login_devices (user_id, device_id, device_name, first_seen_at, last_seen_at)
          VALUES (?, ?, ?, NOW(), NOW())
          `,
          [userId, deviceId, deviceName]
        );
        loginDeviceRowId = Number(insertDevice.insertId) || null;
      }
    }

    const token = jwt.sign(
      { userId, role, loginDeviceId: loginDeviceRowId ?? undefined },
      process.env.JWT_SECRET ?? "dev_secret",
      { expiresIn: "7d" }
    );

    return new Response(
      JSON.stringify({ success: true, user: { id: userId, email, role } }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
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
