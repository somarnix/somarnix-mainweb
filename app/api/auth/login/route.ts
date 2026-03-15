import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  checkLoginRateLimit,
  clearLoginAttemptLimits,
  getRequestIp,
  recordFailedLoginAttempt,
} from "@/lib/login-rate-limit";
import { buildSessionCookie, getJwtSecret } from "@/lib/security";
import {
  createOrRefreshLoginVerificationCode,
  ensureLoginSettingsRow,
  ensureTrustedDeviceSchema,
  getLoginDeviceByUserAndDeviceId,
  hasColumn,
  hasTable,
  isFutureDate,
  normalizeSixDigitCode,
  normalizeString,
  TRUSTED_DEVICE_DAYS,
  DEVICE_ACTION_LOCK_HOURS,
  verifyLoginVerificationCode,
} from "@/lib/trusted-devices";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  is_active: number;
  deleted_at: string | null;
  ban_until?: string | Date | null;
  email_verified_at?: string | Date | null;
}

interface LoginBody {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  verificationCode?: string;
  trustDevice?: boolean;
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
    const verificationCode = normalizeSixDigitCode(body.verificationCode);
    const trustDevice = body.trustDevice === true;
    const ipAddress = getRequestIp(req);

    if (!email || !password) {
      return Response.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const rateLimit = await checkLoginRateLimit(email, ipAddress);
    if (rateLimit.blocked) {
      return Response.json(
        {
          error: rateLimit.error,
          code: "LOGIN_RATE_LIMITED",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
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
      await recordFailedLoginAttempt(email, ipAddress);
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

    const ok = await bcrypt.compare(password, user.password_hash ?? "");
    if (!ok) {
      await recordFailedLoginAttempt(email, ipAddress);
      return Response.json({ error: "Invalid login" }, { status: 401 });
    }

    await clearLoginAttemptLimits(email, ipAddress);

    const hasLoginSettingsTable = await hasTable("user_login_settings");
    let loginDeviceRowId: number | null = null;
    if (hasLoginSettingsTable && hasLoginDevicesTable) {
      await ensureTrustedDeviceSchema();
      if (!deviceId) {
        return Response.json(
          {
            error: "Device ID is required for login.",
            code: "LOGIN_DEVICE_REQUIRED",
          },
          { status: 400 }
        );
      }

      const maxDevices = await ensureLoginSettingsRow(user.id);
      const existingDevice = await getLoginDeviceByUserAndDeviceId(user.id, deviceId);

      if (!existingDevice) {
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
      }

      const isTrusted = existingDevice ? isFutureDate(existingDevice.trusted_until) : false;
      if (!isTrusted) {
        if (!verificationCode) {
          try {
            await createOrRefreshLoginVerificationCode(user.id, user.email, deviceId);
          } catch (error) {
            return Response.json(
              {
                error: "Two-factor verification could not be started.",
                detail: error instanceof Error ? error.message : String(error),
              },
              { status: 500 }
            );
          }

          return Response.json(
            {
              error: "Verification code required for this device.",
              code: "LOGIN_2FA_REQUIRED",
              expiresInMinutes: 10,
            },
            { status: 403 }
          );
        }

        const verification = await verifyLoginVerificationCode(user.id, deviceId, verificationCode);
        if (!verification.ok) {
          return Response.json(
            {
              error: verification.error,
              code: "LOGIN_2FA_REQUIRED",
              expiresInMinutes: 10,
            },
            { status: 403 }
          );
        }
      }

      const trustSql = trustDevice && !isTrusted
        ? `DATE_ADD(NOW(), INTERVAL ${TRUSTED_DEVICE_DAYS} DAY)`
        : "trusted_until";
      const trustGrantedSql = trustDevice && !isTrusted ? "NOW()" : "trust_granted_at";

      if (existingDevice) {
        loginDeviceRowId = Number(existingDevice.id ?? 0) || null;
        await db.query(
          `
          UPDATE user_login_devices
          SET
            last_seen_at = NOW(),
            device_name = COALESCE(?, device_name),
            trusted_until = ${trustSql},
            trust_granted_at = ${trustGrantedSql},
            device_action_locked_until = CASE
              WHEN ? THEN DATE_ADD(NOW(), INTERVAL ${DEVICE_ACTION_LOCK_HOURS} HOUR)
              ELSE device_action_locked_until
            END
          WHERE user_id = ? AND device_id = ?
          `,
          [
            deviceName,
            !isTrusted,
            user.id,
            deviceId,
          ]
        );
      } else {
        const [insertResult] = await db.query<ResultSetHeader>(
          `
          INSERT INTO user_login_devices (
            user_id,
            device_id,
            device_name,
            first_seen_at,
            last_seen_at,
            trusted_until,
            trust_granted_at,
            device_action_locked_until
          )
          VALUES (
            ?, ?, ?, NOW(), NOW(),
            ${trustDevice ? `DATE_ADD(NOW(), INTERVAL ${TRUSTED_DEVICE_DAYS} DAY)` : "NULL"},
            ${trustDevice ? "NOW()" : "NULL"},
            DATE_ADD(NOW(), INTERVAL ${DEVICE_ACTION_LOCK_HOURS} HOUR)
          )
          `,
          trustDevice
            ? [user.id, deviceId, deviceName]
            : [user.id, deviceId, deviceName]
        );
        loginDeviceRowId = Number(insertResult?.insertId ?? 0) || null;
      }
    }

    // JWT valid for 7 days
    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      { userId: user.id, role: user.role, loginDeviceId: loginDeviceRowId ?? undefined },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": buildSessionCookie(token),
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
