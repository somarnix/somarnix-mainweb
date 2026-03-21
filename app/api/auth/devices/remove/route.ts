import crypto from "crypto";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { clearSessionCookies } from "@/lib/security";
import {
  getSensitiveActionEligibility,
  ensureTrustedDeviceSchema,
  getLoginDeviceByRowId,
  hasTable,
  normalizeSixDigitCode,
  normalizeString,
  registerSensitiveActionViolation,
} from "@/lib/trusted-devices";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type CodeRow = RowDataPacket & {
  id: number;
  code_hash: string;
  expires_at: string | Date;
  used_at: string | Date | null;
};

type PasswordRow = RowDataPacket & {
  password_hash: string | null;
};

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function blockedSecurityResponse(input: {
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

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => null);
    const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const deviceId = normalizeString(body.deviceId);
    const currentDeviceId = normalizeString(body.currentDeviceId);
    const code = normalizeSixDigitCode(body.code);
    const currentPassword = normalizeString(body.currentPassword);

    if (!deviceId || !code || !currentPassword) {
      return Response.json({ error: "Device ID, password, and code are required" }, { status: 400 });
    }

    const hasLoginDevices = await hasTable("user_login_devices");
    const hasOtpTable = await hasTable("user_device_logout_codes");
    if (!hasLoginDevices || !hasOtpTable) {
      return Response.json(
        { error: "Required tables missing. Run sql/2026-02-11-video-course-access-sync.sql" },
        { status: 500 }
      );
    }
    await ensureTrustedDeviceSchema();

    const currentDevice =
      typeof auth.loginDeviceId === "number" && Number.isFinite(auth.loginDeviceId)
        ? await getLoginDeviceByRowId(auth.userId, auth.loginDeviceId)
        : null;
    if (!currentDevice) {
      return Response.json({ error: "Current login device not found. Please sign in again." }, { status: 401 });
    }
    if (currentDevice.device_id === deviceId || (currentDeviceId && currentDeviceId === deviceId)) {
      return Response.json({ error: "Use normal logout for current device" }, { status: 400 });
    }
    const eligibility = getSensitiveActionEligibility(currentDevice);
    if (!eligibility.ok) {
      const violation = await registerSensitiveActionViolation({
        userId: auth.userId,
        deviceId: currentDevice.device_id,
        actionKey: "remove_device",
        reason: eligibility.error,
      });
      return blockedSecurityResponse({
        error: eligibility.error,
        suspended: violation.suspended,
        suspendedUntil: violation.suspendedUntil,
      });
    }

    const [passwordRows] = await db.query<PasswordRow[]>(
      `
      SELECT password_hash
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [auth.userId]
    );
    if (passwordRows.length === 0 || !passwordRows[0].password_hash) {
      return Response.json({ error: "Password re-check is not available for this account." }, { status: 400 });
    }

    const passwordOk = await bcrypt.compare(currentPassword, passwordRows[0].password_hash);
    if (!passwordOk) {
      return Response.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const [codeRows] = await db.query<CodeRow[]>(
      `
      SELECT id, code_hash, expires_at, used_at
      FROM user_device_logout_codes
      WHERE user_id = ? AND device_id = ? AND used_at IS NULL
      ORDER BY id DESC
      LIMIT 1
      `,
      [auth.userId, deviceId]
    );

    if (codeRows.length === 0) {
      return Response.json({ error: "No active verification code. Request a new code." }, { status: 400 });
    }

    const codeRow = codeRows[0];
    const expiresAtMs = new Date(codeRow.expires_at).getTime();
    if (Number.isNaN(expiresAtMs) || expiresAtMs < Date.now()) {
      return Response.json({ error: "Verification code expired. Request a new code." }, { status: 400 });
    }

    if (codeRow.code_hash !== sha256Hex(code)) {
      return Response.json({ error: "Invalid verification code." }, { status: 400 });
    }

    await db.query<ResultSetHeader>(
      `UPDATE user_device_logout_codes SET used_at = NOW() WHERE id = ?`,
      [codeRow.id]
    );

    const [deleteResult] = await db.query<ResultSetHeader>(
      `
      DELETE FROM user_login_devices
      WHERE user_id = ? AND device_id = ?
      `,
      [auth.userId, deviceId]
    );

    return Response.json({ success: true, removed: deleteResult.affectedRows > 0 });
  } catch (err) {
    return Response.json(
      { error: "Failed to remove device", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
