import crypto from "crypto";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getMailer } from "@/lib/mailer";
import { clearSessionCookies } from "@/lib/security";
import {
  getSensitiveActionEligibility,
  ensureTrustedDeviceSchema,
  getLoginDeviceByRowId,
  hasTable,
  normalizeString,
  registerSensitiveActionViolation,
} from "@/lib/trusted-devices";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type UserRow = RowDataPacket & {
  email: string;
};

type DeviceRow = RowDataPacket & {
  device_id: string;
};

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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

    if (!deviceId) {
      return Response.json({ error: "Device ID is required" }, { status: 400 });
    }
    if (currentDeviceId && currentDeviceId === deviceId) {
      return Response.json({ error: "Use normal logout for current device" }, { status: 400 });
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

    const [deviceRows] = await db.query<DeviceRow[]>(
      `
      SELECT device_id
      FROM user_login_devices
      WHERE user_id = ? AND device_id = ?
      LIMIT 1
      `,
      [auth.userId, deviceId]
    );
    if (deviceRows.length === 0) {
      return Response.json({ error: "Device not found" }, { status: 404 });
    }

    const [userRows] = await db.query<UserRow[]>(
      "SELECT email FROM users WHERE id = ? LIMIT 1",
      [auth.userId]
    );
    if (userRows.length === 0 || !userRows[0].email) {
      return Response.json({ error: "User email not found" }, { status: 404 });
    }

    const code = generateCode();
    const codeHash = sha256Hex(code);

    await db.query<ResultSetHeader>(
      `
      UPDATE user_device_logout_codes
      SET used_at = NOW()
      WHERE user_id = ? AND device_id = ? AND used_at IS NULL
      `,
      [auth.userId, deviceId]
    );

    await db.query<ResultSetHeader>(
      `
      INSERT INTO user_device_logout_codes (user_id, device_id, code_hash, expires_at)
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
      `,
      [auth.userId, deviceId, codeHash]
    );

    const hasSmtpConfig =
      !!(process.env.SMTP_HOST ?? "").trim() &&
      !!(process.env.SMTP_USER ?? "").trim() &&
      !!(process.env.SMTP_PASS ?? "").trim();
    if (!hasSmtpConfig) {
      return Response.json(
        {
          error: "Email service is not configured",
          detail: "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment.",
        },
        { status: 500 }
      );
    }

    const mailer = getMailer();
    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: userRows[0].email,
      subject: "Your device logout verification code",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    return Response.json({ success: true, expiresInMinutes: 10 });
  } catch (err) {
    return Response.json(
      { error: "Failed to send verification code", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
