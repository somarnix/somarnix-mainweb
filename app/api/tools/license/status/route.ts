import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { verifyToolLicenseToken } from "@/lib/tool-license";
import type { ResultSetHeader } from "mysql2";

type LicenseRow = RowDataPacket & {
  id: number;
  status: "active" | "revoked" | "expired";
  expires_at: Date | string | null;
  max_devices: number;
};

type ActivationCountRow = RowDataPacket & {
  total: number;
};

function parseBearer(req: Request): string {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
  return authHeader.slice(7).trim();
}

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(req: Request) {
  const auth = await getAuthUser(req);

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  const deviceId = (url.searchParams.get("deviceId") || "").trim();
  const token = parseBearer(req);
  if (!slug || !deviceId || !token) {
    return NextResponse.json(
      { valid: false, reason: "slug, deviceId and token required" },
      { status: 400 }
    );
  }

  const payload = verifyToolLicenseToken(token);
  if (!payload) {
    return NextResponse.json({ valid: false, reason: "invalid_token" }, { status: 403 });
  }
  if (
    (auth && payload.userId !== auth.userId) ||
    payload.slug !== slug ||
    payload.deviceId !== deviceId
  ) {
    return NextResponse.json({ valid: false, reason: "token_mismatch" }, { status: 403 });
  }

  const [rows] = await db.query<LicenseRow[]>(
    `
    SELECT id, status, expires_at, max_devices
    FROM tool_license_keys
    WHERE id = ?
    LIMIT 1
    `,
    [payload.licenseId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ valid: false, reason: "license_not_found" }, { status: 403 });
  }
  const license = rows[0];
  if (license.status !== "active") {
    return NextResponse.json({ valid: false, reason: `license_${license.status}` }, { status: 403 });
  }
  const expiresAt = toDate(license.expires_at);
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ valid: false, reason: "license_expired" }, { status: 403 });
  }

  await db.query<ResultSetHeader>(
    `
    INSERT INTO tool_license_activations (license_id, device_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP
    `,
    [payload.licenseId, deviceId]
  );

  const [countRows] = await db.query<ActivationCountRow[]>(
    `
    SELECT COUNT(*) AS total
    FROM tool_license_activations
    WHERE license_id = ?
    `,
    [payload.licenseId]
  );
  const deviceCount = Number(countRows[0]?.total ?? 0);
  const maxDevices = Math.max(1, Number(license.max_devices || 1));

  return NextResponse.json({
    valid: true,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    maxDevices,
    deviceCount,
  });
}
