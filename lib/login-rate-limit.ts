import { db } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

const EMAIL_MAX_ATTEMPTS = 5;
const IP_MAX_ATTEMPTS = 10;
const BLOCK_MINUTES = 10;

type AttemptRow = RowDataPacket & {
  attempt_count: number;
  blocked_until: string | Date | null;
};

function normalizeEmail(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeIp(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 64) : null;
}

export function getRequestIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim() ?? "";
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  return null;
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

export async function ensureLoginRateLimitSchema(): Promise<void> {
  if (await hasTable("login_attempt_limits")) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS login_attempt_limits (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      scope_type ENUM('email','ip') NOT NULL,
      scope_key VARCHAR(190) NOT NULL,
      attempt_count INT NOT NULL DEFAULT 0,
      last_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      blocked_until DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_login_attempt_scope (scope_type, scope_key),
      INDEX idx_login_attempt_blocked (scope_type, blocked_until)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getAttemptRow(scopeType: "email" | "ip", scopeKey: string): Promise<AttemptRow | null> {
  const [rows] = await db.query<AttemptRow[]>(
    `
    SELECT attempt_count, blocked_until
    FROM login_attempt_limits
    WHERE scope_type = ? AND scope_key = ?
    LIMIT 1
    `,
    [scopeType, scopeKey]
  );
  return rows[0] ?? null;
}

function getRemainingSeconds(blockedUntil: string | Date | null | undefined): number {
  if (!blockedUntil) return 0;
  const blockedMs = new Date(blockedUntil).getTime();
  if (!Number.isFinite(blockedMs)) return 0;
  return Math.max(0, Math.ceil((blockedMs - Date.now()) / 1000));
}

async function checkScope(
  scopeType: "email" | "ip",
  scopeKey: string | null,
  label: string
): Promise<{ blocked: false } | { blocked: true; error: string; retryAfterSeconds: number }> {
  if (!scopeKey) return { blocked: false };

  const row = await getAttemptRow(scopeType, scopeKey);
  if (!row?.blocked_until) return { blocked: false };

  const retryAfterSeconds = getRemainingSeconds(row.blocked_until);
  if (retryAfterSeconds <= 0) {
    await db.query<ResultSetHeader>(
      `
      UPDATE login_attempt_limits
      SET blocked_until = NULL, attempt_count = 0
      WHERE scope_type = ? AND scope_key = ?
      `,
      [scopeType, scopeKey]
    );
    return { blocked: false };
  }

  return {
    blocked: true,
    error: `Too many login attempts for this ${label}. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
    retryAfterSeconds,
  };
}

async function recordFailedScope(
  scopeType: "email" | "ip",
  scopeKey: string | null,
  maxAttempts: number
): Promise<void> {
  if (!scopeKey) return;

  await db.query<ResultSetHeader>(
    `
    INSERT INTO login_attempt_limits (scope_type, scope_key, attempt_count, last_attempt_at, blocked_until)
    VALUES (
      ?, ?, 1, NOW(),
      CASE WHEN 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ${BLOCK_MINUTES} MINUTE) ELSE NULL END
    )
    ON DUPLICATE KEY UPDATE
      attempt_count = IF(blocked_until IS NOT NULL AND blocked_until > NOW(), attempt_count, attempt_count + 1),
      last_attempt_at = NOW(),
      blocked_until = CASE
        WHEN blocked_until IS NOT NULL AND blocked_until > NOW() THEN blocked_until
        WHEN attempt_count + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ${BLOCK_MINUTES} MINUTE)
        ELSE NULL
      END
    `,
    [scopeType, scopeKey, maxAttempts, maxAttempts]
  );
}

async function clearScope(scopeType: "email" | "ip", scopeKey: string | null): Promise<void> {
  if (!scopeKey) return;
  await db.query<ResultSetHeader>(
    `
    DELETE FROM login_attempt_limits
    WHERE scope_type = ? AND scope_key = ?
    `,
    [scopeType, scopeKey]
  );
}

export async function checkLoginRateLimit(
  email: string | null,
  ipAddress: string | null
): Promise<{ blocked: false } | { blocked: true; error: string; retryAfterSeconds: number }> {
  await ensureLoginRateLimitSchema();

  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = normalizeIp(ipAddress);

  const emailCheck = await checkScope("email", normalizedEmail, "account");
  if (emailCheck.blocked) return emailCheck;

  const ipCheck = await checkScope("ip", normalizedIp, "network");
  if (ipCheck.blocked) return ipCheck;

  return { blocked: false };
}

export async function recordFailedLoginAttempt(
  email: string | null,
  ipAddress: string | null
): Promise<void> {
  await ensureLoginRateLimitSchema();

  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = normalizeIp(ipAddress);

  await recordFailedScope("email", normalizedEmail, EMAIL_MAX_ATTEMPTS);
  await recordFailedScope("ip", normalizedIp, IP_MAX_ATTEMPTS);
}

export async function clearLoginAttemptLimits(
  email: string | null,
  ipAddress: string | null
): Promise<void> {
  await ensureLoginRateLimitSchema();

  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = normalizeIp(ipAddress);

  await clearScope("email", normalizedEmail);
  await clearScope("ip", normalizedIp);
}
