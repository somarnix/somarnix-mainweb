import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "./db";
import { getJwtSecret } from "./security";
import { cookies } from "next/headers";
import {
  ensureTrustedDeviceSchema,
  getLoginDeviceByRowId,
  hasTable,
} from "./trusted-devices";
import type { RowDataPacket } from "mysql2";

export type AuthUser = {
  id?: number;
  userId: number;
  role: "user" | "admin";
  loginDeviceId?: number;
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

type LoginDeviceIdRow = RowDataPacket & {
  id: number;
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

function getCookieValues(cookieHeader: string, name: string): string[] {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
    .map((part) => part.slice(name.length + 1))
    .filter((value) => value.length > 0);
}

async function resolveSessionLoginDeviceId(
  userId: number,
  rawLoginDeviceId: unknown
): Promise<number | undefined | null> {
  const [deviceRows] = await db.query<LoginDeviceIdRow[]>(
    `
    SELECT id
    FROM user_login_devices
    WHERE user_id = ?
    ORDER BY last_seen_at DESC, id DESC
    LIMIT 2
    `,
    [userId]
  );

  const loginDeviceId = Number(rawLoginDeviceId ?? 0);
  if (Number.isFinite(loginDeviceId) && loginDeviceId > 0) {
    const deviceRow = await getLoginDeviceByRowId(userId, loginDeviceId);
    if (deviceRow) {
      return loginDeviceId;
    }

    if (deviceRows.length <= 1) {
      return Number(deviceRows[0]?.id ?? 0) || undefined;
    }

    return null;
  }

  if (deviceRows.length <= 1) {
    return Number(deviceRows[0]?.id ?? 0) || undefined;
  }

  return null;
}

async function getAuthUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const jwtSecret = getJwtSecret();
    const decoded = jwt.verify(
      token,
      jwtSecret
    );

    if (typeof decoded !== "object" || decoded === null) {
      console.log("[getAuthUserFromToken] Decoded token is not an object");
      return null;
    }

    const payload = decoded as TokenPayload;

    if (!payload.userId) {
      console.log("[getAuthUserFromToken] No userId in token");
      return null;
    }

    const userId = Number(payload.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      console.log("[getAuthUserFromToken] Invalid userId:", userId);
      return null;
    }

    let resolvedLoginDeviceId: number | undefined;

    const hasLoginDevices = await hasTable("user_login_devices");
    if (hasLoginDevices) {
      await ensureTrustedDeviceSchema();
      const nextLoginDeviceId = await resolveSessionLoginDeviceId(
        userId,
        payload.loginDeviceId
      );
      if (nextLoginDeviceId === null) {
        return null;
      }
      resolvedLoginDeviceId = nextLoginDeviceId;
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
      [userId]
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

    const authUser: AuthUser = {
      userId: Number(user.id),
      role: user.role === "admin" ? "admin" : "user",
      loginDeviceId: resolvedLoginDeviceId,
    };
    return authUser;
  } catch (err) {
    console.log("[getAuthUserFromToken] Error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const tokenCandidates: string[] = [];

  // Always read from the request cookie header first (works in route handlers)
  const cookieHeader = req.headers.get("cookie") ?? "";
  const headerTokens = getCookieValues(cookieHeader, "token");
  if (headerTokens.length > 0) {
    console.log("[getAuthUser] Found token(s) in cookie header:", headerTokens.length);
  }
  tokenCandidates.push(...headerTokens);

  // Also try the Next.js cookies() API (works in server components/actions)
  try {
    const cookieStore = await cookies();
    const fromStore = cookieStore.getAll("token").map((cookie) => cookie.value);
    if (fromStore.length > 0) {
      console.log("[getAuthUser] Found token(s) in cookies():", fromStore.length);
    }
    tokenCandidates.push(...fromStore);
  } catch (err) {
    // cookies() is not available outside of Next.js server context
    console.log("[getAuthUser] cookies() not available:", err instanceof Error ? err.message : String(err));
  }

  const uniqueTokens = Array.from(
    new Set(tokenCandidates.map((token) => token.trim()).filter(Boolean))
  );

  console.log("[getAuthUser] Total unique tokens:", uniqueTokens.length);

  for (const token of uniqueTokens) {
    const authUser = await getAuthUserFromToken(token);
    if (authUser) {
      console.log("[getAuthUser] Authenticated user:", authUser.userId);
      return authUser;
    }
  }

  console.log("[getAuthUser] No valid token found");
  return null;
}
