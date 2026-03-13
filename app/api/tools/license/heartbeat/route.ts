import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { signToolLicenseToken, verifyToolLicenseToken } from "@/lib/tool-license";

type LicenseRow = RowDataPacket & {
  id: number;
  status: "active" | "revoked" | "expired";
  expires_at: Date | string | null;
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

export async function POST(req: Request) {
  const auth = await getAuthUser(req);

  const token = parseBearer(req);
  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    deviceId?: string;
  };

  const slug = String(body.slug || "").trim();
  const deviceId = String(body.deviceId || "").trim();

  if (!slug || !deviceId || !token) {
    return NextResponse.json(
      { ok: false, reason: "slug, deviceId and token required" },
      { status: 400 }
    );
  }

  const payload = verifyToolLicenseToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false, reason: "invalid_token" }, { status: 403 });
  }
  if (
    (auth && payload.userId !== auth.userId) ||
    payload.slug !== slug ||
    payload.deviceId !== deviceId
  ) {
    return NextResponse.json({ ok: false, reason: "token_mismatch" }, { status: 403 });
  }

  const [rows] = await db.query<LicenseRow[]>(
    `
    SELECT id, status, expires_at
    FROM tool_license_keys
    WHERE id = ?
    LIMIT 1
    `,
    [payload.licenseId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, reason: "license_not_found" }, { status: 403 });
  }

  const license = rows[0];
  if (license.status !== "active") {
    return NextResponse.json(
      { ok: false, reason: `license_${license.status}` },
      { status: 403 }
    );
  }

  const expiresAt = toDate(license.expires_at);
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    await db.query<ResultSetHeader>(
      `UPDATE tool_license_keys SET status='expired' WHERE id = ?`,
      [license.id]
    );
    return NextResponse.json({ ok: false, reason: "license_expired" }, { status: 403 });
  }

  await db.query<ResultSetHeader>(
    `
    INSERT INTO tool_license_activations (license_id, device_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP
    `,
    [payload.licenseId, deviceId]
  );

  const nextCheckAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const boundedNextCheck =
    expiresAt && expiresAt.getTime() < nextCheckAt.getTime() ? expiresAt : nextCheckAt;
  const refreshedToken = signToolLicenseToken(
    {
      userId: payload.userId,
      productId: payload.productId,
      licenseId: payload.licenseId,
      slug: payload.slug,
      deviceId,
    },
    expiresAt,
    randomUUID()
  );

  return NextResponse.json({
    ok: true,
    status: "active",
    token: refreshedToken,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    nextCheckAt: boundedNextCheck.toISOString(),
  });
}
