/**
 * Enhanced Tool License Utilities
 * 
 * Provides secure license validation, rate limiting, and device management
 * All validation is server-authoritative - never trust client-side checks
 */

import { createHash, randomBytes, createHmac } from "crypto";
import jwt from "jsonwebtoken";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { getJwtSecret } from "@/lib/security";

// ============================================
// TYPES
// ============================================

export type ToolLicenseTokenPayload = {
  userId: number;
  productId: number;
  licenseId: number;
  slug: string;
  deviceId: string;
  iat?: number;
  exp?: number;
  jti?: string;
};

export type OfflineToolLicensePayload = {
  licenseId: number;
  userId: number;
  productId: number;
  slug: string;
  machineId: string;
  expiresAt: string | null;
  nextCheckAt: string;
};

export type DeviceInfo = {
  platform: "windows" | "macos" | "linux" | "android" | "ios" | "web";
  platformVersion?: string;
  appVersion?: string;
  cpuCores?: number;
  totalMemory?: number;
  screenResolution?: string;
};

export type LicenseValidationResult = {
  valid: boolean;
  reason?: string;
  expiresAt?: string | null;
  maxDevices?: number;
  deviceCount?: number;
  licenseId?: number;
  userId?: number;
  productId?: number;
};

export type RateLimitCheck = {
  allowed: boolean;
  retryAfter?: number;
  blockedUntil?: string | null;
  requestCount?: number;
};

// ============================================
// SECRETS
// ============================================

function getToolLicenseSecret(): string {
  const secret = process.env.TOOL_LICENSE_SECRET?.trim() || getJwtSecret();
  if (secret.length < 32) {
    console.warn("[TOOL-LICENSE] Warning: TOOL_LICENSE_SECRET should be at least 32 characters");
  }
  return secret;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateLicenseKey(): string {
  const parts = Array(4)
    .fill(null)
    .map(() => randomBytes(4).toString("hex").toUpperCase());
  return `GSTCH-${parts.join("-")}`;
}

export function parseBearer(req: Request): string {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
  return authHeader.slice(7).trim();
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip") || "unknown";
}

export function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// ============================================
// JWT TOKEN OPERATIONS
// ============================================

export function signToolLicenseToken(
  payload: ToolLicenseTokenPayload,
  expiresAt?: Date | null,
  jwtId?: string
): string {
  const finalJwtId =
    jwtId ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${randomBytes(8).toString("hex")}`);

  const secret = getToolLicenseSecret();

  if (expiresAt && !Number.isNaN(expiresAt.getTime())) {
    const expiresIn = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    return jwt.sign(payload, secret, {
      expiresIn,
      jwtid: finalJwtId,
    });
  }

  return jwt.sign(payload, secret, { expiresIn: "24h", jwtid: finalJwtId });
}

export function verifyToolLicenseToken(token: string): ToolLicenseTokenPayload | null {
  try {
    const secret = getToolLicenseSecret();
    const decoded = jwt.verify(token, secret);

    if (!decoded || typeof decoded !== "object") return null;

    const payload = decoded as Partial<ToolLicenseTokenPayload>;

    if (
      !payload.userId ||
      !payload.productId ||
      !payload.licenseId ||
      !payload.slug ||
      !payload.deviceId
    ) {
      return null;
    }

    return {
      userId: Number(payload.userId),
      productId: Number(payload.productId),
      licenseId: Number(payload.licenseId),
      slug: String(payload.slug),
      deviceId: String(payload.deviceId),
      iat: payload.iat,
      exp: payload.exp,
      jti: payload.jti,
    };
  } catch {
    return null;
  }
}

export function signOfflineToolLicensePayload(payload: OfflineToolLicensePayload): string {
  const json = JSON.stringify(payload);
  const secret = getToolLicenseSecret();
  return createHmac("sha256", secret).update(json).digest("base64");
}

export function verifyOfflineToolLicensePayload(
  payload: OfflineToolLicensePayload,
  signature: string
): boolean {
  const expectedSignature = signOfflineToolLicensePayload(payload);
  return signature === expectedSignature;
}

// ============================================
// LICENSE VALIDATION
// ============================================

export async function validateLicenseKey(
  licenseKey: string,
  slug: string,
  deviceId: string,
  userId: number
): Promise<LicenseValidationResult> {
  const keyHash = sha256(licenseKey);

  try {
    // Get license and product info
    const [rows] = await db.query<
      RowDataPacket[] & {
        id: number;
        user_id: number;
        product_id: number;
        status: string;
        expires_at: Date | string | null;
        max_devices: number;
        has_purchase: number;
      }[]
    >(
      `
      SELECT 
        tlk.id, tlk.user_id, tlk.product_id, tlk.status, tlk.expires_at, tlk.max_devices,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.user_id = tlk.user_id 
              AND oi.product_id = tlk.product_id
              AND o.state IN ('approved', 'completed')
              AND o.result <> 'failed'
          ) THEN 1 ELSE 0
        END AS has_purchase
      FROM tool_license_keys tlk
      JOIN products p ON p.id = tlk.product_id
      JOIN product_categories c ON c.id = p.category_id
      WHERE tlk.license_key = ?
        AND p.slug = ?
        AND c.name = 'tools'
        AND p.is_active = 1
      LIMIT 1
      `,
      [licenseKey, slug]
    );

    if (rows.length === 0) {
      return { valid: false, reason: "invalid_license_key" };
    }

    const license = rows[0];

    // Check ownership
    if (license.user_id !== userId) {
      return { valid: false, reason: "license_not_owned" };
    }

    // Check purchase
    if (!license.has_purchase) {
      return { valid: false, reason: "no_purchase" };
    }

    // Check status
    if (license.status !== "active") {
      return { valid: false, reason: `license_${license.status}` };
    }

    // Check expiry
    const expiresAt = toDate(license.expires_at);
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      // Auto-expire the license
      await db.query<ResultSetHeader>(
        `UPDATE tool_license_keys SET status = 'expired' WHERE id = ?`,
        [license.id]
      );
      return { valid: false, reason: "license_expired" };
    }

    // Check device limit
    const [deviceRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM tool_license_activations WHERE license_id = ?`,
      [license.id]
    );
    const deviceCount = Number(deviceRows[0]?.total ?? 0);
    const maxDevices = Math.max(1, Number(license.max_devices || 1));

    if (deviceCount >= maxDevices) {
      // Check if this device is already activated
      const [existingDevice] = await db.query<RowDataPacket[]>(
        `SELECT id FROM tool_license_activations WHERE license_id = ? AND device_id = ? LIMIT 1`,
        [license.id, deviceId]
      );

      if (existingDevice.length === 0) {
        return { valid: false, reason: "device_limit_reached" };
      }
    }

    return {
      valid: true,
      expiresAt: expiresAt?.toISOString() || null,
      maxDevices,
      deviceCount,
      licenseId: license.id,
      userId: license.user_id,
      productId: license.product_id,
    };
  } catch (error) {
    console.error("[TOOL-LICENSE] validateLicenseKey error:", error);
    return { valid: false, reason: "server_error" };
  }
}

export async function validateToken(
  token: string,
  slug: string,
  deviceId: string
): Promise<LicenseValidationResult> {
  const payload = verifyToolLicenseToken(token);

  if (!payload) {
    return { valid: false, reason: "invalid_token" };
  }

  if (payload.slug !== slug || payload.deviceId !== deviceId) {
    return { valid: false, reason: "token_mismatch" };
  }

  // Check license still exists and is active
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT id, status, expires_at, max_devices, user_id, product_id
    FROM tool_license_keys
    WHERE id = ?
    LIMIT 1
    `,
    [payload.licenseId]
  );

  if (rows.length === 0) {
    return { valid: false, reason: "license_not_found" };
  }

  const license = rows[0];

  if (license.status !== "active") {
    return { valid: false, reason: `license_${license.status}` };
  }

  const expiresAt = toDate(license.expires_at);
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return { valid: false, reason: "license_expired" };
  }

  // Get device count
  const [countRows] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM tool_license_activations WHERE license_id = ?`,
    [payload.licenseId]
  );
  const deviceCount = Number(countRows[0]?.total ?? 0);
  const maxDevices = Math.max(1, Number(license.max_devices || 1));

  return {
    valid: true,
    expiresAt: expiresAt?.toISOString() || null,
    maxDevices,
    deviceCount,
    licenseId: license.id,
    userId: license.user_id,
    productId: license.product_id,
  };
}

// ============================================
// DEVICE MANAGEMENT
// ============================================

export async function registerDeviceActivation(
  licenseId: number,
  deviceId: string,
  deviceInfo?: DeviceInfo
): Promise<{ deviceCount: number; maxDevices: number }> {
  // Upsert activation
  await db.query<ResultSetHeader>(
    `
    INSERT INTO tool_license_activations (license_id, device_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP
    `,
    [licenseId, deviceId]
  );

  // Register fingerprint if provided
  if (deviceInfo) {
    await registerDeviceFingerprint(licenseId, deviceId, deviceInfo);
  }

  // Get counts
  const [licenseRows] = await db.query<RowDataPacket[]>(
    `SELECT max_devices FROM tool_license_keys WHERE id = ? LIMIT 1`,
    [licenseId]
  );
  const maxDevices = Math.max(1, Number(licenseRows[0]?.max_devices || 1));

  const [countRows] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM tool_license_activations WHERE license_id = ?`,
    [licenseId]
  );
  const deviceCount = Number(countRows[0]?.total ?? 0);

  return { deviceCount, maxDevices };
}

export async function removeDeviceActivation(
  licenseId: number,
  deviceId: string
): Promise<{ success: boolean; remainingDevices: number }> {
  const [result] = await db.query<ResultSetHeader>(
    `DELETE FROM tool_license_activations WHERE license_id = ? AND device_id = ?`,
    [licenseId, deviceId]
  );

  if (result.affectedRows === 0) {
    return { success: false, remainingDevices: 0 };
  }

  const [countRows] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM tool_license_activations WHERE license_id = ?`,
    [licenseId]
  );

  return {
    success: true,
    remainingDevices: Number(countRows[0]?.total ?? 0),
  };
}

async function registerDeviceFingerprint(
  licenseId: number,
  deviceId: string,
  deviceInfo: DeviceInfo
): Promise<void> {
  // Get user_id from license
  const [licenseRows] = await db.query<RowDataPacket[]>(
    `SELECT user_id FROM tool_license_keys WHERE id = ? LIMIT 1`,
    [licenseId]
  );

  if (licenseRows.length === 0) return;
  const userId = licenseRows[0].user_id;

  // Create fingerprint hash
  const fingerprintData = JSON.stringify({
    deviceId,
    platform: deviceInfo.platform,
    platformVersion: deviceInfo.platformVersion,
    cpuCores: deviceInfo.cpuCores,
    totalMemory: deviceInfo.totalMemory,
  });
  const fingerprintHash = sha256(fingerprintData);

  // Upsert fingerprint
  await db.query<ResultSetHeader>(
    `
    INSERT INTO device_fingerprints (
      user_id, device_id, fingerprint_hash, platform,
      platform_version, app_version, cpu_cores, total_memory_gb
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      last_seen_at = CURRENT_TIMESTAMP,
      platform_version = VALUES(platform_version),
      app_version = VALUES(app_version)
    `,
    [
      userId,
      deviceId,
      fingerprintHash,
      deviceInfo.platform,
      deviceInfo.platformVersion || null,
      deviceInfo.appVersion || null,
      deviceInfo.cpuCores || null,
      deviceInfo.totalMemory || null,
    ]
  );
}

// ============================================
// RATE LIMITING
// ============================================

export async function checkRateLimit(
  licenseKey: string,
  ip: string,
  deviceId: string,
  actionType: "validate" | "activate" | "download" | "heartbeat",
  maxRequests: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitCheck> {
  const keyHash = sha256(licenseKey);
  const now = new Date();

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT id, request_count, last_request_at, blocked_until, permanent_block
      FROM license_rate_limits
      WHERE license_key_hash = ?
        AND ip_address = ?
        AND device_id = ?
        AND action_type = ?
      LIMIT 1
      `,
      [keyHash, ip, deviceId, actionType]
    );

    // Check if permanently blocked
    if (rows.length > 0 && rows[0].permanent_block) {
      return {
        allowed: false,
        blockedUntil: "permanent",
      };
    }

    // Check if temporarily blocked
    if (rows.length > 0 && rows[0].blocked_until) {
      const blockedUntil = toDate(rows[0].blocked_until);
      if (blockedUntil && blockedUntil.getTime() > now.getTime()) {
        return {
          allowed: false,
          blockedUntil: blockedUntil.toISOString(),
          retryAfter: Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000),
        };
      }
    }

    if (rows.length === 0) {
      // First request
      await db.query<ResultSetHeader>(
        `
        INSERT INTO license_rate_limits (
          license_key_hash, ip_address, device_id, action_type,
          request_count, last_request_at
        ) VALUES (?, ?, ?, ?, 1, NOW())
        `,
        [keyHash, ip, deviceId, actionType]
      );

      return { allowed: true, requestCount: 1 };
    }

    const row = rows[0];
    const lastRequest = toDate(row.last_request_at);
    const requestCount = Number(row.request_count || 1);

    // Check if window has passed
    if (lastRequest && now.getTime() - lastRequest.getTime() > windowSeconds * 1000) {
      // Reset counter
      await db.query<ResultSetHeader>(
        `
        UPDATE license_rate_limits
        SET request_count = 1, last_request_at = NOW(), blocked_until = NULL
        WHERE id = ?
        `,
        [row.id]
      );

      return { allowed: true, requestCount: 1 };
    }

    // Within window - check limit
    if (requestCount >= maxRequests) {
      // Block for 15 minutes
      const blockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
      await db.query<ResultSetHeader>(
        `
        UPDATE license_rate_limits
        SET blocked_until = ?
        WHERE id = ?
        `,
        [blockedUntil, row.id]
      );

      return {
        allowed: false,
        blockedUntil: blockedUntil.toISOString(),
        retryAfter: 15 * 60,
        requestCount,
      };
    }

    // Increment counter
    await db.query<ResultSetHeader>(
      `
      UPDATE license_rate_limits
      SET request_count = request_count + 1, last_request_at = NOW()
      WHERE id = ?
      `,
      [row.id]
    );

    return { allowed: true, requestCount: requestCount + 1 };
  } catch (error) {
    console.error("[TOOL-LICENSE] checkRateLimit error:", error);
    return { allowed: true }; // Fail open on error
  }
}

export async function permanentBlockLicense(
  licenseKey: string,
  reason: string
): Promise<void> {
  const keyHash = sha256(licenseKey);

  await db.query<ResultSetHeader>(
    `
    UPDATE license_rate_limits
    SET permanent_block = 1, blocked_until = NOW()
    WHERE license_key_hash = ?
    `,
    [keyHash]
  );

  // Also revoke the license
  await db.query<ResultSetHeader>(
    `UPDATE tool_license_keys SET status = 'revoked' WHERE license_key = ?`,
    [licenseKey]
  );

  console.log(`[TOOL-LICENSE] Permanently blocked license: ${reason}`);
}

// ============================================
// DOWNLOAD TOKENS
// ============================================

export async function createDownloadToken(
  userId: number,
  licenseId: number | null,
  toolDefinitionId: number,
  filePath: string,
  fileName: string,
  maxDownloads: number = 1,
  expiresMinutes: number = 15,
  ip?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: string }> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

  await db.query<ResultSetHeader>(
    `
    INSERT INTO tool_download_tokens (
      user_id, license_id, tool_definition_id,
      token, file_path, file_name,
      max_downloads, expires_at,
      ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      licenseId,
      toolDefinitionId,
      token,
      filePath,
      fileName,
      maxDownloads,
      expiresAt,
      ip || null,
      userAgent || null,
    ]
  );

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function validateDownloadToken(
  token: string
): Promise<{
  valid: boolean;
  reason?: string;
  filePath?: string;
  fileName?: string;
  toolDefinitionId?: number;
}> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT tool_definition_id, file_path, file_name,
             max_downloads, used_count, expires_at
      FROM tool_download_tokens
      WHERE token = ?
      LIMIT 1
      `,
      [token]
    );

    if (rows.length === 0) {
      return { valid: false, reason: "invalid_token" };
    }

    const row = rows[0];
    const expiresAt = toDate(row.expires_at);

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return { valid: false, reason: "token_expired" };
    }

    if (row.used_count >= row.max_downloads) {
      return { valid: false, reason: "token_used" };
    }

    return {
      valid: true,
      filePath: row.file_path,
      fileName: row.file_name,
      toolDefinitionId: row.tool_definition_id,
    };
  } catch (error) {
    console.error("[TOOL-LICENSE] validateDownloadToken error:", error);
    return { valid: false, reason: "server_error" };
  }
}

export async function markDownloadTokenUsed(token: string): Promise<void> {
  await db.query<ResultSetHeader>(
    `
    UPDATE tool_download_tokens
    SET used_count = used_count + 1, first_used_at = NOW()
    WHERE token = ? AND used_count < max_downloads
    `,
    [token]
  );
}

// ============================================
// TOOL DEFINITIONS
// ============================================

export type ToolDefinition = RowDataPacket & {
  id: number;
  product_id: number;
  canonical_slug: string;
  display_name: string;
  short_description: string | null;
  tool_kind: string;
  tool_category: string;
  platform: string;
  access_model: string;
  delivery_model: string;
  requires_license: number;
  default_device_limit: number;
  max_device_limit: number;
  allow_offline_mode: number;
  offline_grace_period_hours: number;
  storage_provider: string | null;
  storage_bucket: string | null;
  storage_key_prefix: string | null;
  file_extension: string | null;
  launch_path: string | null;
  embedded_entry: string | null;
  current_version: string | null;
  min_client_version: string | null;
  is_active: number;
  is_featured: number;
  is_beta: number;
  sort_order: number;
  config_json: any | null;
};

export async function getToolDefinition(
  slug: string
): Promise<ToolDefinition | null> {
  const [rows] = await db.query<ToolDefinition[]>(
    `
    SELECT *
    FROM tool_definitions
    WHERE canonical_slug = ? AND is_active = 1
    LIMIT 1
    `,
    [slug]
  );

  return rows.length > 0 ? rows[0] : null;
}

export async function getToolDefinitions(
  filters: {
    category?: string;
    platform?: string;
    toolKind?: string;
    featured?: boolean;
    active?: boolean;
  } = {}
): Promise<ToolDefinition[]> {
  const whereParts: string[] = [];
  const params: (string | number)[] = [];

  if (filters.active !== false) {
    whereParts.push("is_active = 1");
  }

  if (filters.category) {
    whereParts.push("tool_category = ?");
    params.push(filters.category);
  }

  if (filters.platform) {
    const platforms = filters.platform
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (platforms.length === 1) {
      whereParts.push("platform = ?");
      params.push(platforms[0]);
    } else if (platforms.length > 1) {
      whereParts.push(`platform IN (${platforms.map(() => "?").join(", ")})`);
      params.push(...platforms);
    }
  }

  if (filters.toolKind) {
    whereParts.push("tool_kind = ?");
    params.push(filters.toolKind);
  }

  if (filters.featured) {
    whereParts.push("is_featured = 1");
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const [rows] = await db.query<ToolDefinition[]>(
    `
    SELECT *
    FROM tool_definitions
    ${whereClause}
    ORDER BY sort_order, display_name
    `,
    params
  );

  return rows;
}

// ============================================
// AUDIT LOGGING
// ============================================

export async function logLicenseAction(
  action: "create" | "edit" | "revoke" | "remove_device" | "extend" | "activate" | "validate",
  licenseId: number,
  metadata: {
    adminId?: number;
    userId?: number;
    deviceId?: string;
    ip?: string;
    reason?: string;
    oldValue?: any;
    newValue?: any;
  }
): Promise<void> {
  await db.query<ResultSetHeader>(
    `
    INSERT INTO license_audit_logs (
      actor_admin_id, action, target_license_id,
      old_value, new_value, reason,
      ip_address, device_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      metadata.adminId || null,
      action,
      licenseId,
      metadata.oldValue ? JSON.stringify(metadata.oldValue) : null,
      metadata.newValue ? JSON.stringify(metadata.newValue) : null,
      metadata.reason || null,
      metadata.ip || null,
      metadata.deviceId || null,
      JSON.stringify(metadata),
    ]
  );
}
