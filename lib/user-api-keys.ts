import crypto from "crypto";
import type { RowDataPacket } from "mysql2";

import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type ApiKeyProvider = "groq" | "openai" | "google" | "deepl";

type UserApiKeys = Record<ApiKeyProvider, string | null>;

type UserApiKeySummary = Record<
  ApiKeyProvider,
  {
    configured: boolean;
    masked: string | null;
  }
>;

type UserApiKeysRow = RowDataPacket & {
  user_id: number;
  groq_api_key_enc: string | null;
  openai_api_key_enc: string | null;
  google_api_key_enc: string | null;
  deepl_api_key_enc: string | null;
};

const PROVIDER_COLUMNS: Record<ApiKeyProvider, keyof UserApiKeysRow> = {
  groq: "groq_api_key_enc",
  openai: "openai_api_key_enc",
  google: "google_api_key_enc",
  deepl: "deepl_api_key_enc",
};

const EMPTY_USER_API_KEYS: UserApiKeys = {
  groq: null,
  openai: null,
  google: null,
  deepl: null,
};

function getEncryptionSecret(): string {
  return process.env.USER_API_KEYS_SECRET || process.env.JWT_SECRET || "dev_secret";
}

function getEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(getEncryptionSecret()).digest();
}

function encryptValue(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptValue(payload: string | null): string | null {
  if (!payload) return null;
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) return null;

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

function maskApiKey(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}****`;
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export async function ensureUserApiKeysTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_api_keys (
      user_id INT UNSIGNED NOT NULL,
      groq_api_key_enc LONGTEXT NULL,
      openai_api_key_enc LONGTEXT NULL,
      google_api_key_enc LONGTEXT NULL,
      deepl_api_key_enc LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id)
    )
  `);
}

async function loadUserApiKeysRow(userId: number): Promise<UserApiKeysRow | null> {
  await ensureUserApiKeysTable();
  const [rows] = await db.query<UserApiKeysRow[]>(
    `
    SELECT user_id, groq_api_key_enc, openai_api_key_enc, google_api_key_enc, deepl_api_key_enc
    FROM user_api_keys
    WHERE user_id = ?
    LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getUserApiKeys(userId: number): Promise<UserApiKeys> {
  const row = await loadUserApiKeysRow(userId);
  if (!row) {
    return { ...EMPTY_USER_API_KEYS };
  }

  return {
    groq: decryptValue(row.groq_api_key_enc),
    openai: decryptValue(row.openai_api_key_enc),
    google: decryptValue(row.google_api_key_enc),
    deepl: decryptValue(row.deepl_api_key_enc),
  };
}

export async function getUserApiKeySummary(userId: number): Promise<UserApiKeySummary> {
  const keys = await getUserApiKeys(userId);
  return {
    groq: { configured: Boolean(keys.groq), masked: maskApiKey(keys.groq) },
    openai: { configured: Boolean(keys.openai), masked: maskApiKey(keys.openai) },
    google: { configured: Boolean(keys.google), masked: maskApiKey(keys.google) },
    deepl: { configured: Boolean(keys.deepl), masked: maskApiKey(keys.deepl) },
  };
}

export async function saveUserApiKeys(
  userId: number,
  updates: Partial<Record<ApiKeyProvider, string | null>>
): Promise<UserApiKeySummary> {
  const currentRow = await loadUserApiKeysRow(userId);

  const nextEncrypted = {
    groq: Object.prototype.hasOwnProperty.call(updates, "groq")
      ? updates.groq
        ? encryptValue(updates.groq)
        : null
      : currentRow?.groq_api_key_enc ?? null,
    openai: Object.prototype.hasOwnProperty.call(updates, "openai")
      ? updates.openai
        ? encryptValue(updates.openai)
        : null
      : currentRow?.openai_api_key_enc ?? null,
    google: Object.prototype.hasOwnProperty.call(updates, "google")
      ? updates.google
        ? encryptValue(updates.google)
        : null
      : currentRow?.google_api_key_enc ?? null,
    deepl: Object.prototype.hasOwnProperty.call(updates, "deepl")
      ? updates.deepl
        ? encryptValue(updates.deepl)
        : null
      : currentRow?.deepl_api_key_enc ?? null,
  };

  await db.query(
    `
    INSERT INTO user_api_keys (
      user_id,
      groq_api_key_enc,
      openai_api_key_enc,
      google_api_key_enc,
      deepl_api_key_enc
    )
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      groq_api_key_enc = VALUES(groq_api_key_enc),
      openai_api_key_enc = VALUES(openai_api_key_enc),
      google_api_key_enc = VALUES(google_api_key_enc),
      deepl_api_key_enc = VALUES(deepl_api_key_enc),
      updated_at = NOW()
    `,
    [
      userId,
      nextEncrypted.groq,
      nextEncrypted.openai,
      nextEncrypted.google,
      nextEncrypted.deepl,
    ]
  );

  return getUserApiKeySummary(userId);
}

export async function resolveApiKeyFromRequest(
  req: Request,
  provider: ApiKeyProvider,
  fallback: string | null
): Promise<string | null> {
  const auth = await getAuthUser(req);
  if (!auth) return fallback;
  const keys = await getUserApiKeys(auth.userId);
  return keys[provider] || fallback;
}

export function getProviderColumn(provider: ApiKeyProvider): keyof UserApiKeysRow {
  return PROVIDER_COLUMNS[provider];
}
