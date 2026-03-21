import bcrypt from "bcryptjs";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clearSessionCookies } from "@/lib/security";
import {
  createSensitiveActionCode,
  ensureTrustedDeviceSchema,
  getLoginDeviceByRowId,
  getSensitiveActionEligibility,
  hasColumn,
  normalizeSixDigitCode,
  normalizeString,
  registerSensitiveActionViolation,
  verifySensitiveActionCode,
} from "@/lib/trusted-devices";

type UserRow = RowDataPacket & {
  email: string;
  password_hash: string | null;
};

function securityBlockedResponse(input: {
  error: string;
  suspended?: boolean;
  suspendedUntil?: string | null;
}): Response {
  const res = Response.json(
    {
      error: input.error,
      forceLogout: true,
      suspended: input.suspended === true,
      suspendedUntil: input.suspendedUntil ?? null,
    },
    { status: 403 }
  );
  for (const cookie of clearSessionCookies()) {
    res.headers.append("Set-Cookie", cookie);
  }
  return res;
}

async function getVerifiedCurrentDevice(userId: number, loginDeviceId?: number) {
  if (typeof loginDeviceId !== "number" || !Number.isFinite(loginDeviceId)) {
    return null;
  }
  await ensureTrustedDeviceSchema();
  return getLoginDeviceByRowId(userId, loginDeviceId);
}

export async function POST(req: Request): Promise<Response> {
  const auth = await getAuthUser(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await req.json().catch(() => null);
    const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const mode = normalizeString(body.mode) || "confirm";

    const currentDevice = await getVerifiedCurrentDevice(auth.userId, auth.loginDeviceId);
    const eligibility = getSensitiveActionEligibility(currentDevice);
    if (!eligibility.ok) {
      const violation = await registerSensitiveActionViolation({
        userId: auth.userId,
        deviceId: currentDevice?.device_id || "unknown",
        actionKey: "delete_account",
        reason: eligibility.error,
      });
      return securityBlockedResponse({
        error: eligibility.error,
        suspended: violation.suspended,
        suspendedUntil: violation.suspendedUntil,
      });
    }

    const [userRows] = await db.query<UserRow[]>(
      `
      SELECT email, password_hash
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [auth.userId]
    );
    if (userRows.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRows[0];
    if (!user.email) {
      return Response.json({ error: "User email not found" }, { status: 404 });
    }

    if (mode === "send_code") {
      await createSensitiveActionCode({
        userId: auth.userId,
        email: user.email,
        deviceId: currentDevice!.device_id,
        actionKey: "delete_account",
        subject: "Your delete-account verification code",
        text: "Use this code to confirm account deletion from your trusted device.",
      });
      return Response.json({
        success: true,
        expiresInMinutes: 10,
        requiresPassword: Boolean(user.password_hash),
      });
    }

    const confirmText = normalizeString(body.confirmText);
    const currentPassword = normalizeString(body.currentPassword);
    const code = normalizeSixDigitCode(body.code);
    const requiresPassword = Boolean(user.password_hash);

    if (confirmText !== "DELETE") {
      return Response.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });
    }
    if (!code) {
      return Response.json(
        { error: "A 6-digit verification code is required." },
        { status: 400 }
      );
    }
    if (requiresPassword && !currentPassword) {
      return Response.json(
        { error: "Current password and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    if (requiresPassword) {
      const passwordToCheck = currentPassword;
      if (!passwordToCheck) {
        return Response.json(
          { error: "Current password and 6-digit verification code are required." },
          { status: 400 }
        );
      }
      const passwordHash = user.password_hash;
      if (!passwordHash) {
        return Response.json({ error: "Current password is required for this account." }, { status: 400 });
      }
      const passwordOk = await bcrypt.compare(passwordToCheck, passwordHash);
      if (!passwordOk) {
        return Response.json({ error: "Current password is incorrect." }, { status: 401 });
      }
    }

    const codeResult = await verifySensitiveActionCode({
      userId: auth.userId,
      deviceId: currentDevice!.device_id,
      actionKey: "delete_account",
      code,
    });
    if (!codeResult.ok) {
      return Response.json({ error: codeResult.error }, { status: 400 });
    }

    const hasUpdatedAt = await hasColumn("users", "updated_at");
    const deleteSql = hasUpdatedAt
      ? `UPDATE users SET deleted_at = NOW(), is_active = 0, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`
      : `UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = ? AND deleted_at IS NULL`;

    await db.query<ResultSetHeader>(deleteSql, [auth.userId]);
    await db.query<ResultSetHeader>(
      `DELETE FROM user_login_devices WHERE user_id = ?`,
      [auth.userId]
    );

    const res = Response.json({ success: true });
    for (const cookie of clearSessionCookies()) {
      res.headers.append("Set-Cookie", cookie);
    }
    return res;
  } catch (err) {
    return Response.json(
      {
        error: "Delete account failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
