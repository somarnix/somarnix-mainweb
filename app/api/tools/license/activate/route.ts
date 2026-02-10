import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { signOfflineToolLicensePayload, signToolLicenseToken } from "@/lib/tool-license";

type ProductRow = RowDataPacket & {
  id: number;
  slug: string;
};

type PurchaseRow = RowDataPacket & {
  has_purchase: number;
};

type LicenseRow = RowDataPacket & {
  id: number;
  user_id: number;
  product_id: number;
  license_key: string;
  max_devices: number;
  status: "active" | "revoked" | "expired";
  expires_at: Date | string | null;
};

type ActivationCountRow = RowDataPacket & {
  total: number;
};

type FailedAttemptRow = RowDataPacket & {
  id: number;
  try_count: number;
  blocked_until: Date | string | null;
};

let hasFailedAttemptsTableCache: boolean | null = null;

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip") || "unknown";
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function hasFailedAttemptsTable(): Promise<boolean> {
  if (hasFailedAttemptsTableCache !== null) return hasFailedAttemptsTableCache;
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'license_failed_attempts'
    LIMIT 1
    `
  );
  hasFailedAttemptsTableCache = rows.length > 0;
  return hasFailedAttemptsTableCache;
}

async function readFailedAttempt(ip: string, licenseKey: string): Promise<FailedAttemptRow | null> {
  if (!(await hasFailedAttemptsTable())) return null;
  const keyHash = sha256(licenseKey);
  const [rows] = await db.query<FailedAttemptRow[]>(
    `
    SELECT id, try_count, blocked_until
    FROM license_failed_attempts
    WHERE ip = ? AND license_key_hash = ?
    LIMIT 1
    `,
    [ip, keyHash]
  );
  return rows[0] ?? null;
}

async function registerFailedAttempt(ip: string, licenseKey: string): Promise<void> {
  if (!(await hasFailedAttemptsTable())) return;
  const keyHash = sha256(licenseKey);
  await db.query<ResultSetHeader>(
    `
    INSERT INTO license_failed_attempts (ip, license_key_hash, try_count, last_try_at, blocked_until)
    VALUES (?, ?, 1, NOW(), NULL)
    ON DUPLICATE KEY UPDATE
      try_count = try_count + 1,
      last_try_at = NOW(),
      blocked_until = CASE
        WHEN try_count + 1 >= 10 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
        ELSE blocked_until
      END
    `,
    [ip, keyHash]
  );
}

async function clearFailedAttempt(ip: string, licenseKey: string): Promise<void> {
  if (!(await hasFailedAttemptsTable())) return;
  const keyHash = sha256(licenseKey);
  await db.query<ResultSetHeader>(
    `DELETE FROM license_failed_attempts WHERE ip = ? AND license_key_hash = ?`,
    [ip, keyHash]
  );
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      slug?: string;
      licenseKey?: string;
      machineId?: string;
      deviceId?: string;
    };

    const slug = (body.slug || "").trim();
    const licenseKey = (body.licenseKey || "").trim();
    const deviceId = (body.deviceId || "").trim();
    const ip = getClientIp(req);

    if (!slug || !licenseKey || !deviceId) {
      return NextResponse.json(
        { error: "slug, licenseKey and deviceId are required" },
        { status: 400 }
      );
    }

    const failedAttempt = await readFailedAttempt(ip, licenseKey);
    const blockedUntil = toDate(failedAttempt?.blocked_until ?? null);
    if (blockedUntil && blockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later.", blockedUntil: blockedUntil.toISOString() },
        { status: 429 }
      );
    }

    const [products] = await db.query<ProductRow[]>(
      `
      SELECT p.id, p.slug
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      WHERE p.slug = ? AND c.name = 'tools' AND p.is_active = 1
      LIMIT 1
      `,
      [slug]
    );
    if (products.length === 0) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    const product = products[0];

    const [purchases] = await db.query<PurchaseRow[]>(
      `
      SELECT COUNT(*) AS has_purchase
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ?
        AND oi.product_id = ?
        AND o.state IN ('approved','completed')
        AND o.result <> 'failed'
      `,
      [auth.userId, product.id]
    );
    if (Number(purchases[0]?.has_purchase ?? 0) <= 0) {
      await registerFailedAttempt(ip, licenseKey);
      return NextResponse.json({ error: "Tool not purchased" }, { status: 403 });
    }

    const [licenses] = await db.query<LicenseRow[]>(
      `
      SELECT *
      FROM tool_license_keys
      WHERE product_id = ? AND user_id = ? AND license_key = ?
      LIMIT 1
      `,
      [product.id, auth.userId, licenseKey]
    );
    if (licenses.length === 0) {
      await registerFailedAttempt(ip, licenseKey);
      return NextResponse.json({ error: "Invalid license key" }, { status: 403 });
    }
    const license = licenses[0];

    if (license.status !== "active") {
      await registerFailedAttempt(ip, licenseKey);
      return NextResponse.json({ error: `License is ${license.status}` }, { status: 403 });
    }

    const expiresAt = toDate(license.expires_at);
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      await db.query<ResultSetHeader>(
        `UPDATE tool_license_keys SET status='expired' WHERE id=?`,
        [license.id]
      );
      await registerFailedAttempt(ip, licenseKey);
      return NextResponse.json({ error: "License expired" }, { status: 403 });
    }

    const [existingActivation] = await db.query<RowDataPacket[]>(
      `
      SELECT id
      FROM tool_license_activations
      WHERE license_id = ? AND device_id = ?
      LIMIT 1
      `,
      [license.id, deviceId]
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
        await registerFailedAttempt(ip, licenseKey);
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
        [license.id, deviceId]
      );
    } else {
      await db.query<ResultSetHeader>(
        `
        UPDATE tool_license_activations
        SET last_seen_at = NOW()
        WHERE license_id = ? AND device_id = ?
        `,
        [license.id, deviceId]
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
        userId: auth.userId,
        productId: product.id,
        licenseId: license.id,
        slug: product.slug,
        deviceId,
      },
      expiresAt,
      randomUUID()
    );
    await clearFailedAttempt(ip, licenseKey);

    const nextCheckAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const boundedNextCheck =
      expiresAt && expiresAt.getTime() < nextCheckAt.getTime() ? expiresAt : nextCheckAt;
    const offlinePayload = {
      licenseId: license.id,
      userId: auth.userId,
      productId: product.id,
      slug: product.slug,
      machineId: deviceId,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      nextCheckAt: boundedNextCheck.toISOString(),
    };
    const signature = signOfflineToolLicensePayload(offlinePayload);

    return NextResponse.json({
      ok: true,
      token,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      machineId: deviceId,
      maxDevices,
      deviceCount,
      offlinePayload,
      signature,
      nextCheckAt: boundedNextCheck.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
