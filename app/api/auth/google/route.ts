import { db } from "@/lib/db";
import { buildSessionCookie, getJwtSecret } from "@/lib/security";
import { normalizeAppRole, type AppRole } from "@/lib/roles";
import { getSiteUrl } from "@/app/lib/siteUrl";
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

type ParsedGoogleRequest = {
  credential: string | null;
  deviceId: string | null;
  deviceName: string | null;
  returnPath: string | null;
  csrfToken: string | null;
  redirectFlow: boolean;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function sanitizePath(value: string | null, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function parseCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  const prefix = `${key}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return null;
}

function getPublicOrigin(req: Request): string {
  const forwardedHost = normalizeString(req.headers.get("x-forwarded-host"));
  const forwardedProto = normalizeString(req.headers.get("x-forwarded-proto"));
  if (forwardedHost) {
    return getSiteUrl(`${forwardedProto === "http" ? "http" : "https"}://${forwardedHost}`);
  }

  const origin = normalizeString(req.headers.get("origin"));
  if (origin) {
    return getSiteUrl(origin);
  }

  const host = normalizeString(req.headers.get("host"));
  if (host) {
    const proto =
      forwardedProto === "http" || host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https";
    return getSiteUrl(`${proto}://${host}`);
  }

  return getSiteUrl();
}

function buildPublicUrl(req: Request, path: string | null, fallback: string): URL {
  return new URL(sanitizePath(path, fallback), `${getPublicOrigin(req)}/`);
}

function decodeButtonState(value: string | null): {
  deviceId: string | null;
  deviceName: string | null;
  returnPath: string | null;
} {
  if (!value) {
    return { deviceId: null, deviceName: null, returnPath: null };
  }

  try {
    const decoded = JSON.parse(decodeURIComponent(value)) as Record<string, unknown>;
    return {
      deviceId: normalizeString(decoded.deviceId),
      deviceName: normalizeString(decoded.deviceName),
      returnPath: normalizeString(decoded.returnPath),
    };
  } catch {
    return { deviceId: null, deviceName: null, returnPath: null };
  }
}

async function parseGoogleRequest(req: Request): Promise<ParsedGoogleRequest> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const raw = await req.json().catch(() => null);
    const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
      credential: normalizeString(body.credential),
      deviceId: normalizeString(body.deviceId),
      deviceName: normalizeString(body.deviceName),
      returnPath: null,
      csrfToken: null,
      redirectFlow: false,
    };
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData().catch(() => null);
    const credential = normalizeString(form?.get("credential"));
    const state = decodeButtonState(normalizeString(form?.get("state")));
    return {
      credential,
      deviceId: state.deviceId,
      deviceName: state.deviceName,
      returnPath: state.returnPath,
      csrfToken: normalizeString(form?.get("g_csrf_token")),
      redirectFlow: true,
    };
  }

  return {
    credential: null,
    deviceId: null,
    deviceName: null,
    returnPath: null,
    csrfToken: null,
    redirectFlow: false,
  };
}

function jsonError(
  redirectFlow: boolean,
  req: Request,
  returnPath: string | null,
  error: string,
  status: number,
  extra: Record<string, unknown> = {}
): Response {
  if (!redirectFlow) {
    return Response.json({ error, ...extra }, { status });
  }

  const target = buildPublicUrl(req, returnPath, "/login");
  target.searchParams.set("googleError", error);
  return new Response(null, {
    status: 303,
    headers: {
      Location: target.toString(),
    },
  });
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
    const { credential, deviceId, deviceName, returnPath, csrfToken, redirectFlow } =
      await parseGoogleRequest(req);

    if (redirectFlow) {
      const csrfCookie = parseCookieValue(req.headers.get("cookie"), "g_csrf_token");
      if (!csrfCookie || !csrfToken || csrfCookie !== csrfToken) {
        return jsonError(redirectFlow, req, returnPath, "Google sign-in expired. Please try again.", 400);
      }
    }

    if (!credential) {
      return jsonError(redirectFlow, req, returnPath, "Google credential is required", 400);
    }

    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!tokenInfoRes.ok) {
      return jsonError(redirectFlow, req, returnPath, "Invalid Google credential", 401);
    }
    const tokenInfo = (await tokenInfoRes.json()) as GoogleTokenInfo;

    const email = normalizeString(tokenInfo.email)?.toLowerCase();
    const googleSub = normalizeString(tokenInfo.sub);
    const emailVerified = tokenInfo.email_verified === "true";
    const expectedAud = normalizeString(
      process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    );
    if (!expectedAud) {
      return jsonError(
        redirectFlow,
        req,
        returnPath,
        "Google login is not configured (missing GOOGLE_CLIENT_ID).",
        500
      );
    }
    if (!email || !googleSub || !emailVerified || tokenInfo.aud !== expectedAud) {
      return jsonError(redirectFlow, req, returnPath, "Google account verification failed", 401);
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
    let role: AppRole = "user";
    if (rows.length > 0) {
      const user = rows[0];
      if (user.deleted_at) {
        return jsonError(redirectFlow, req, returnPath, "This email belongs to a deleted account.", 403);
      }
      if (Number(user.is_active) !== 1) {
        if (usersHasBanUntil && user.ban_until) {
          const banUntilDate = new Date(user.ban_until);
          if (Number.isNaN(banUntilDate.getTime()) || banUntilDate.getTime() > Date.now()) {
            return jsonError(
              redirectFlow,
              req,
              returnPath,
              "This account is banned.",
              403,
              { code: "ACCOUNT_BANNED" }
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
          return jsonError(
            redirectFlow,
            req,
            returnPath,
            "This account is banned.",
            403,
            { code: "ACCOUNT_BANNED" }
          );
        }
      }
      userId = Number(user.id);
      role = normalizeAppRole(user.role);

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
        return jsonError(
          redirectFlow,
          req,
          returnPath,
          "Device ID is required for login.",
          400,
          { code: "LOGIN_DEVICE_REQUIRED" }
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
          return jsonError(
            redirectFlow,
            req,
            returnPath,
            `Login device limit reached (${maxDevices}).`,
            403,
            {
              code: "ACCOUNT_LOGIN_DEVICE_LIMIT",
              maxDevices,
            }
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

    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      { userId, role, loginDeviceId: loginDeviceRowId ?? undefined },
      jwtSecret,
      { expiresIn: "7d" }
    );

    if (redirectFlow) {
      const target = buildPublicUrl(req, returnPath, "/");
      return new Response(null, {
        status: 303,
        headers: {
          Location: target.toString(),
          "Set-Cookie": buildSessionCookie(token),
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, user: { id: userId, email, role } }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": buildSessionCookie(token),
        },
      }
    );
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err);
    return Response.json(
      { error: "Server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
