import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import {
  signOfflineToolLicensePayload,
  signToolLicenseToken,
} from "@/lib/tool-license";

type LicenseRow = RowDataPacket & {
  id: number;
  user_id: number;
  product_id: number;
  product_slug: string;
  max_devices: number;
  status: "active" | "revoked" | "expired";
  expires_at: Date | string | null;
};

type ActivationCountRow = RowDataPacket & {
  total: number;
};

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    licenseId?: number | string;
    machineId?: string;
    deviceId?: string;
  };
  const licenseId = Number(body.licenseId);
  const machineId = String(body.deviceId || body.machineId || "").trim();

  if (!Number.isFinite(licenseId) || licenseId <= 0 || !machineId) {
    return NextResponse.json(
      { error: "licenseId and machineId are required" },
      { status: 400 }
    );
  }

  const [rows] = await db.query<LicenseRow[]>(
    `
    SELECT
      lk.id,
      lk.user_id,
      lk.product_id,
      p.slug AS product_slug,
      lk.max_devices,
      lk.status,
      lk.expires_at
    FROM tool_license_keys lk
    JOIN products p ON p.id = lk.product_id
    WHERE lk.id = ?
    LIMIT 1
    `,
    [licenseId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }

  const license = rows[0];
  if (license.status !== "active") {
    return NextResponse.json(
      { error: `License is ${license.status}` },
      { status: 403 }
    );
  }

  const expiresAt = toDate(license.expires_at);
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    await db.query<ResultSetHeader>(
      `UPDATE tool_license_keys SET status='expired' WHERE id=?`,
      [license.id]
    );
    return NextResponse.json({ error: "License expired" }, { status: 403 });
  }

  const [existingActivation] = await db.query<RowDataPacket[]>(
    `
    SELECT id
    FROM tool_license_activations
    WHERE license_id = ? AND device_id = ?
    LIMIT 1
    `,
    [license.id, machineId]
  );

  if (existingActivation.length === 0) {
    const [countRows] = await db.query<ActivationCountRow[]>(
      `
      SELECT COUNT(*) AS total
      FROM tool_license_activations
      WHERE license_id = ?
      `,
      [license.id]
    );
    const currentTotal = Number(countRows[0]?.total ?? 0);
    const maxDevices = Math.max(1, Number(license.max_devices || 1));
    if (currentTotal >= maxDevices) {
      return NextResponse.json(
        { error: "Device limit reached for this license" },
        { status: 403 }
      );
    }
    await db.query<ResultSetHeader>(
      `
      INSERT INTO tool_license_activations (license_id, device_id)
      VALUES (?, ?)
      `,
      [license.id, machineId]
    );
  } else {
    await db.query<ResultSetHeader>(
      `
      UPDATE tool_license_activations
      SET last_seen_at = NOW()
      WHERE license_id = ? AND device_id = ?
      `,
      [license.id, machineId]
    );
  }

  const [deviceCountRows] = await db.query<ActivationCountRow[]>(
    `
    SELECT COUNT(*) AS total
    FROM tool_license_activations
    WHERE license_id = ?
    `,
    [license.id]
  );
  const deviceCount = Number(deviceCountRows[0]?.total ?? 0);
  const maxDevices = Math.max(1, Number(license.max_devices || 1));

  const token = signToolLicenseToken(
    {
      userId: license.user_id,
      productId: license.product_id,
      licenseId: license.id,
      slug: license.product_slug,
      deviceId: machineId,
    },
    expiresAt,
    randomUUID()
  );

  const nextCheckAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const boundedNextCheck =
    expiresAt && expiresAt.getTime() < nextCheckAt.getTime() ? expiresAt : nextCheckAt;
  const offlinePayload = {
    licenseId: license.id,
    userId: license.user_id,
    productId: license.product_id,
    slug: license.product_slug,
    machineId,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    nextCheckAt: boundedNextCheck.toISOString(),
  };
  const signature = signOfflineToolLicensePayload(offlinePayload);

  return NextResponse.json({
    ok: true,
    token,
    slug: license.product_slug,
    machineId,
    maxDevices,
    deviceCount,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    nextCheckAt: boundedNextCheck.toISOString(),
    offlinePayload,
    signature,
  });
}
