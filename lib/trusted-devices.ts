import crypto from "crypto";
import { db } from "@/lib/db";
import { getMailer } from "@/lib/mailer";
import { createSystemNotification } from "@/lib/system-notifications";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export const TRUSTED_DEVICE_DAYS = 30;
export const DEVICE_ACTION_LOCK_HOURS = 24;
export const LOGIN_VERIFICATION_CODE_MINUTES = 10;
export const SENSITIVE_ACTION_CODE_MINUTES = 10;
export const SENSITIVE_ACTION_SPAM_LIMIT = 3;
export const SENSITIVE_ACTION_SUSPEND_HOURS = 24;

export type LoginDeviceRow = RowDataPacket & {
  id: number;
  device_id: string;
  device_name: string | null;
  first_seen_at: string | Date | null;
  last_seen_at: string | Date | null;
  trusted_until: string | Date | null;
  trust_granted_at: string | Date | null;
  device_action_locked_until: string | Date | null;
};

type LoginCodeRow = RowDataPacket & {
  id: number;
  code_hash: string;
  expires_at: string | Date;
  used_at: string | Date | null;
};

type SensitiveActionCodeRow = RowDataPacket & {
  id: number;
  code_hash: string;
  expires_at: string | Date;
  used_at: string | Date | null;
};

export function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSixDigitCode(value: unknown): string | null {
  const normalized = normalizeString(value)?.replace(/\s+/g, "") ?? null;
  if (!normalized || !/^\d{6}$/.test(normalized)) return null;
  return normalized;
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isFutureDate(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const asMs = new Date(value).getTime();
  return Number.isFinite(asMs) && asMs > Date.now();
}

export function isDateOlderThanDays(
  value: string | Date | null | undefined,
  days: number
): boolean {
  if (!value) return false;
  const asMs = new Date(value).getTime();
  if (!Number.isFinite(asMs)) return false;
  return asMs <= Date.now() - days * 24 * 60 * 60 * 1000;
}

export async function hasTable(table: string): Promise<boolean> {
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

export async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [table, column]
  );
  return rows.length > 0;
}

export async function ensureTrustedDeviceSchema(): Promise<void> {
  const hasLoginDevices = await hasTable("user_login_devices");
  if (!hasLoginDevices) return;

  if (!(await hasColumn("user_login_devices", "trusted_until"))) {
    await db.query(`
      ALTER TABLE user_login_devices
      ADD COLUMN trusted_until DATETIME NULL AFTER last_seen_at
    `);
  }

  if (!(await hasColumn("user_login_devices", "trust_granted_at"))) {
    await db.query(`
      ALTER TABLE user_login_devices
      ADD COLUMN trust_granted_at DATETIME NULL AFTER trusted_until
    `);
  }

  if (!(await hasColumn("user_login_devices", "device_action_locked_until"))) {
    await db.query(`
      ALTER TABLE user_login_devices
      ADD COLUMN device_action_locked_until DATETIME NULL AFTER trust_granted_at
    `);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_login_verification_codes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      device_id VARCHAR(128) NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ulvc_user_device_created (user_id, device_id, created_at),
      INDEX idx_ulvc_user_expires (user_id, expires_at),
      CONSTRAINT fk_ulvc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_sensitive_action_codes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      device_id VARCHAR(128) NOT NULL,
      action_key VARCHAR(64) NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usac_user_device_action (user_id, device_id, action_key, created_at),
      CONSTRAINT fk_usac_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_sensitive_action_attempts (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      device_id VARCHAR(128) NOT NULL,
      action_key VARCHAR(64) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usaa_user_device_created (user_id, device_id, created_at),
      CONSTRAINT fk_usaa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function ensureLoginSettingsRow(userId: number): Promise<number> {
  const [settingsRows] = await db.query<RowDataPacket[]>(
    `
    SELECT max_devices
    FROM user_login_settings
    WHERE user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  if (settingsRows.length === 0) {
    await db.query(
      `
      INSERT INTO user_login_settings (user_id, max_devices)
      VALUES (?, 10)
      `,
      [userId]
    );
  }

  return Math.max(1, Number(settingsRows[0]?.max_devices ?? 10) || 10);
}

export async function getLoginDeviceByUserAndDeviceId(
  userId: number,
  deviceId: string
): Promise<LoginDeviceRow | null> {
  const [rows] = await db.query<LoginDeviceRow[]>(
    `
    SELECT
      id,
      device_id,
      device_name,
      first_seen_at,
      last_seen_at,
      trusted_until,
      trust_granted_at,
      device_action_locked_until
    FROM user_login_devices
    WHERE user_id = ? AND device_id = ?
    LIMIT 1
    `,
    [userId, deviceId]
  );

  return rows[0] ?? null;
}

export async function getLoginDeviceByRowId(
  userId: number,
  loginDeviceId: number
): Promise<LoginDeviceRow | null> {
  const [rows] = await db.query<LoginDeviceRow[]>(
    `
    SELECT
      id,
      device_id,
      device_name,
      first_seen_at,
      last_seen_at,
      trusted_until,
      trust_granted_at,
      device_action_locked_until
    FROM user_login_devices
    WHERE user_id = ? AND id = ?
    LIMIT 1
    `,
    [userId, loginDeviceId]
  );

  return rows[0] ?? null;
}

export async function createOrRefreshLoginVerificationCode(
  userId: number,
  email: string,
  deviceId: string
): Promise<void> {
  await ensureTrustedDeviceSchema();

  await db.query<ResultSetHeader>(
    `
    UPDATE user_login_verification_codes
    SET used_at = NOW()
    WHERE user_id = ? AND device_id = ? AND used_at IS NULL
    `,
    [userId, deviceId]
  );

  const code = generateSixDigitCode();
  await db.query<ResultSetHeader>(
    `
    INSERT INTO user_login_verification_codes (user_id, device_id, code_hash, expires_at)
    VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ${LOGIN_VERIFICATION_CODE_MINUTES} MINUTE))
    `,
    [userId, deviceId, sha256Hex(code)]
  );

  const mailer = getMailer();
  await mailer.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Your login verification code",
    text: `Your login verification code is ${code}. It expires in ${LOGIN_VERIFICATION_CODE_MINUTES} minutes.`,
  });
}

export async function verifyLoginVerificationCode(
  userId: number,
  deviceId: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureTrustedDeviceSchema();

  const [rows] = await db.query<LoginCodeRow[]>(
    `
    SELECT id, code_hash, expires_at, used_at
    FROM user_login_verification_codes
    WHERE user_id = ? AND device_id = ? AND used_at IS NULL
    ORDER BY id DESC
    LIMIT 1
    `,
    [userId, deviceId]
  );

  if (rows.length === 0) {
    return { ok: false, error: "No active verification code. Sign in again to request a new code." };
  }

  const row = rows[0];
  const expiresAtMs = new Date(row.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
    return { ok: false, error: "Verification code expired. Sign in again to request a new code." };
  }

  if (row.code_hash !== sha256Hex(code)) {
    return { ok: false, error: "Invalid verification code." };
  }

  await db.query<ResultSetHeader>(
    `UPDATE user_login_verification_codes SET used_at = NOW() WHERE id = ?`,
    [row.id]
  );

  return { ok: true };
}

export function getSensitiveActionEligibility(
  device: LoginDeviceRow | null
): { ok: true } | { ok: false; error: string } {
  if (!device) {
    return { ok: false, error: "Current login device not found. Please sign in again." };
  }
  if (isFutureDate(device.device_action_locked_until)) {
    return {
      ok: false,
      error: "This device is too new for sensitive actions right now. Please wait before removing devices or deleting the account.",
    };
  }
  if (!isFutureDate(device.trusted_until)) {
    return {
      ok: false,
      error: `This device must be trusted before sensitive actions are allowed.`,
    };
  }
  if (!isDateOlderThanDays(device.first_seen_at, TRUSTED_DEVICE_DAYS)) {
    return {
      ok: false,
      error: `This device must be trusted and at least ${TRUSTED_DEVICE_DAYS} days old before removing devices or deleting the account.`,
    };
  }
  return { ok: true };
}

export async function createSensitiveActionCode(params: {
  userId: number;
  email: string;
  deviceId: string;
  actionKey: string;
  subject: string;
  text: string;
}): Promise<void> {
  await ensureTrustedDeviceSchema();

  await db.query<ResultSetHeader>(
    `
    UPDATE user_sensitive_action_codes
    SET used_at = NOW()
    WHERE user_id = ? AND device_id = ? AND action_key = ? AND used_at IS NULL
    `,
    [params.userId, params.deviceId, params.actionKey]
  );

  const code = generateSixDigitCode();
  await db.query<ResultSetHeader>(
    `
    INSERT INTO user_sensitive_action_codes (user_id, device_id, action_key, code_hash, expires_at)
    VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ${SENSITIVE_ACTION_CODE_MINUTES} MINUTE))
    `,
    [params.userId, params.deviceId, params.actionKey, sha256Hex(code)]
  );

  const mailer = getMailer();
  await mailer.sendMail({
    from: process.env.SMTP_USER,
    to: params.email,
    subject: params.subject,
    text: `${params.text}\n\nCode: ${code}\nExpires in ${SENSITIVE_ACTION_CODE_MINUTES} minutes.`,
  });
}

export async function verifySensitiveActionCode(params: {
  userId: number;
  deviceId: string;
  actionKey: string;
  code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureTrustedDeviceSchema();

  const [rows] = await db.query<SensitiveActionCodeRow[]>(
    `
    SELECT id, code_hash, expires_at, used_at
    FROM user_sensitive_action_codes
    WHERE user_id = ? AND device_id = ? AND action_key = ? AND used_at IS NULL
    ORDER BY id DESC
    LIMIT 1
    `,
    [params.userId, params.deviceId, params.actionKey]
  );

  if (rows.length === 0) {
    return { ok: false, error: "No active verification code. Request a new code." };
  }

  const row = rows[0];
  const expiresAtMs = new Date(row.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
    return { ok: false, error: "Verification code expired. Request a new code." };
  }

  if (row.code_hash !== sha256Hex(params.code)) {
    return { ok: false, error: "Invalid verification code." };
  }

  await db.query<ResultSetHeader>(
    `UPDATE user_sensitive_action_codes SET used_at = NOW() WHERE id = ?`,
    [row.id]
  );

  return { ok: true };
}

export async function registerSensitiveActionViolation(params: {
  userId: number;
  deviceId: string;
  actionKey: string;
  reason: string;
}): Promise<{ attemptCount: number; suspended: boolean; suspendedUntil: string | null }> {
  await ensureTrustedDeviceSchema();

  await db.query<ResultSetHeader>(
    `
    INSERT INTO user_sensitive_action_attempts (user_id, device_id, action_key, reason)
    VALUES (?, ?, ?, ?)
    `,
    [params.userId, params.deviceId, params.actionKey, params.reason]
  );

  const [attemptRows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM user_sensitive_action_attempts
    WHERE user_id = ?
      AND device_id = ?
      AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    `,
    [params.userId, params.deviceId]
  );
  const attemptCount = Number(attemptRows[0]?.total ?? 0);

  await createSystemNotification({
    userId: params.userId,
    category: "security_blocked_action",
    icon: "security",
    title: "Sensitive action blocked",
    description: `${params.reason} Device: ${params.deviceId}`,
    dedupeKey: null,
  });

  let suspended = false;
  let suspendedUntil: string | null = null;
  if (attemptCount >= SENSITIVE_ACTION_SPAM_LIMIT && (await hasColumn("users", "ban_until"))) {
    suspendedUntil = new Date(
      Date.now() + SENSITIVE_ACTION_SUSPEND_HOURS * 60 * 60 * 1000
    ).toISOString().slice(0, 19).replace("T", " ");
    await db.query<ResultSetHeader>(
      `
      UPDATE users
      SET is_active = 0, ban_until = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [suspendedUntil, params.userId]
    );
    suspended = true;
    await createSystemNotification({
      userId: params.userId,
      category: "security_suspend",
      icon: "security",
      title: "Account temporarily suspended",
      description: `Too many blocked sensitive actions were attempted from device ${params.deviceId}. Your account was suspended for security review.`,
      dedupeKey: null,
    });
  }

  return { attemptCount, suspended, suspendedUntil };
}
