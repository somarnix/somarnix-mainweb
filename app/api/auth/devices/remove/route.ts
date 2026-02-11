import crypto from "crypto";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type CodeRow = RowDataPacket & {
  id: number;
  code_hash: string;
  expires_at: string | Date;
  used_at: string | Date | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
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
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => null);
    const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const deviceId = normalizeString(body.deviceId);
    const currentDeviceId = normalizeString(body.currentDeviceId);
    const codeRaw = normalizeString(body.code);
    const code = codeRaw ? codeRaw.replace(/\s+/g, "") : null;

    if (!deviceId || !code) {
      return Response.json({ error: "Device ID and code are required" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return Response.json({ error: "Code must be 6 digits" }, { status: 400 });
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

