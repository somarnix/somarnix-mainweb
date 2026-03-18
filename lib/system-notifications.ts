import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export type SystemNotificationIcon = "security" | "account" | "product" | "update";

export type SystemNotificationRecord = {
  id: number;
  title: string;
  description: string;
  icon: SystemNotificationIcon;
  createdAt: string | null;
  linkUrl: string | null;
  isRead: boolean;
};

type SystemNotificationRow = RowDataPacket & {
  id: number;
  title: string;
  description: string;
  icon_key: string;
  created_at: string | null;
  link_url: string | null;
  is_read: number;
};

type NotificationOwnerRow = RowDataPacket & {
  id: number;
  user_id: number | null;
};

let ensurePromise: Promise<void> | null = null;

function normalizeIcon(icon?: string | null): SystemNotificationIcon {
  if (icon === "account" || icon === "product" || icon === "update") return icon;
  return "security";
}

export async function ensureSystemNotificationsSchema(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS system_notifications (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT NULL,
          category VARCHAR(64) NOT NULL DEFAULT 'general',
          icon_key VARCHAR(32) NOT NULL DEFAULT 'security',
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          link_url VARCHAR(255) NULL,
          dedupe_key VARCHAR(191) NULL,
          is_read TINYINT(1) NOT NULL DEFAULT 0,
          read_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_system_notifications_dedupe_key (dedupe_key),
          KEY idx_system_notifications_user_created (user_id, created_at),
          KEY idx_system_notifications_category_created (category, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS system_notification_reads (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          notification_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT NOT NULL,
          read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_system_notification_reads (notification_id, user_id),
          KEY idx_system_notification_reads_user (user_id, read_at),
          CONSTRAINT fk_system_notification_reads_notification
            FOREIGN KEY (notification_id) REFERENCES system_notifications(id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  await ensurePromise;
}

export async function seedDefaultSystemNotifications(): Promise<void> {
  await ensureSystemNotificationsSchema();

  await db.query<ResultSetHeader[] | ResultSetHeader>(
    `
    INSERT INTO system_notifications (
      user_id,
      category,
      icon_key,
      title,
      description,
      link_url,
      dedupe_key
    )
    VALUES
      (
        NULL,
        'app_update',
        'update',
        'App version update',
        'A newer app version is available with UI improvements and stability updates.',
        NULL,
        'global:app-version-2026-03'
      ),
      (
        NULL,
        'security_notice',
        'security',
        'Password and security',
        'Keep your password updated and review account security settings regularly.',
        NULL,
        'global:security-guidance'
      )
    ON DUPLICATE KEY UPDATE
      dedupe_key = VALUES(dedupe_key)
    `
  );
}

export async function createSystemNotification(input: {
  userId?: number | null;
  category?: string;
  icon?: SystemNotificationIcon;
  title: string;
  description: string;
  linkUrl?: string | null;
  dedupeKey?: string | null;
}): Promise<void> {
  await ensureSystemNotificationsSchema();

  const userId =
    typeof input.userId === "number" && Number.isFinite(input.userId) && input.userId > 0
      ? Math.floor(input.userId)
      : null;

  await db.query<ResultSetHeader>(
    `
    INSERT INTO system_notifications (
      user_id,
      category,
      icon_key,
      title,
      description,
      link_url,
      dedupe_key
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      description = VALUES(description),
      icon_key = VALUES(icon_key),
      link_url = VALUES(link_url),
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      userId,
      input.category?.trim() || "general",
      input.icon || "security",
      input.title.trim(),
      input.description.trim(),
      input.linkUrl?.trim() || null,
      input.dedupeKey?.trim() || null,
    ]
  );
}

export async function createProductUpdateNotifications(input: {
  productId: number;
  productTitle: string;
  productSlug?: string | null;
  isTool?: boolean;
}): Promise<void> {
  await ensureSystemNotificationsSchema();

  const productId = Math.floor(input.productId);
  if (!Number.isFinite(productId) || productId <= 0) return;

  const title = input.productTitle.trim() || "Product";
  const linkUrl =
    typeof input.productSlug === "string" && input.productSlug.trim()
      ? input.isTool
        ? `/tools-ai/${input.productSlug.trim()}`
        : `/products/${input.productSlug.trim()}`
      : null;

  await db.query<ResultSetHeader>(
    `
    INSERT INTO system_notifications (
      user_id,
      category,
      icon_key,
      title,
      description,
      link_url,
      dedupe_key
    )
    SELECT DISTINCT
      o.user_id,
      'product_update',
      'product',
      ?,
      ?,
      ?,
      NULL
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = ?
      AND o.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM system_notifications sn
        WHERE sn.user_id = o.user_id
          AND sn.category = 'product_update'
          AND sn.title = ?
          AND sn.created_at >= DATE_SUB(NOW(), INTERVAL 12 HOUR)
      )
    `,
    [
      "Product updates available",
      `${title} now has new fixes, features, or content updates available.`,
      linkUrl,
      productId,
      "Product updates available",
    ]
  );
}

export async function getSystemNotificationsForUser(
  userId: number,
  limit = 20
): Promise<{ notifications: SystemNotificationRecord[]; unreadCount: number }> {
  await ensureSystemNotificationsSchema();
  await seedDefaultSystemNotifications();

  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));

  const [rows] = await db.query<SystemNotificationRow[]>(
    `
    SELECT
      sn.id,
      sn.title,
      sn.description,
      sn.icon_key,
      sn.created_at,
      sn.link_url,
      CASE
        WHEN sn.user_id IS NULL THEN CASE WHEN snr.user_id IS NULL THEN 0 ELSE 1 END
        ELSE CASE
          WHEN sn.is_read = 1 OR snr.user_id IS NOT NULL THEN 1
          ELSE 0
        END
      END AS is_read
    FROM system_notifications sn
    LEFT JOIN system_notification_reads snr
      ON snr.notification_id = sn.id
     AND snr.user_id = ?
    WHERE sn.user_id = ? OR sn.user_id IS NULL
    ORDER BY sn.created_at DESC, sn.id DESC
    LIMIT ?
    `,
    [userId, userId, safeLimit]
  );

  const [countRows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM system_notifications sn
    LEFT JOIN system_notification_reads snr
      ON snr.notification_id = sn.id
     AND snr.user_id = ?
    WHERE (sn.user_id = ? OR sn.user_id IS NULL)
      AND (
        (sn.user_id IS NULL AND snr.user_id IS NULL)
        OR
        (sn.user_id = ? AND sn.is_read = 0 AND snr.user_id IS NULL)
      )
    `,
    [userId, userId, userId]
  );

  return {
    notifications: rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
      description: String(row.description),
      icon: normalizeIcon(row.icon_key),
      createdAt: row.created_at ? String(row.created_at) : null,
      linkUrl: row.link_url ? String(row.link_url) : null,
      isRead: Number(row.is_read ?? 0) === 1,
    })),
    unreadCount: Number(countRows[0]?.total ?? 0),
  };
}

export async function markSystemNotificationRead(
  userId: number,
  notificationId: number
): Promise<boolean> {
  await ensureSystemNotificationsSchema();

  const safeNotificationId = Math.floor(notificationId);
  if (!Number.isFinite(safeNotificationId) || safeNotificationId <= 0) return false;

  const [rows] = await db.query<NotificationOwnerRow[]>(
    `
    SELECT id, user_id
    FROM system_notifications
    WHERE id = ?
      AND (user_id = ? OR user_id IS NULL)
    LIMIT 1
    `,
    [safeNotificationId, userId]
  );
  const notification = rows[0];
  if (!notification) return false;

  if (notification.user_id === null) {
    await db.query<ResultSetHeader>(
      `
      INSERT INTO system_notification_reads (notification_id, user_id, read_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE read_at = NOW()
      `,
      [safeNotificationId, userId]
    );
  } else {
    await db.query<ResultSetHeader>(
      `
      UPDATE system_notifications
      SET is_read = 1, read_at = NOW(), updated_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [safeNotificationId, userId]
    );
  }

  return true;
}

export async function markAllSystemNotificationsRead(userId: number): Promise<void> {
  await ensureSystemNotificationsSchema();
  await seedDefaultSystemNotifications();

  await db.query<ResultSetHeader>(
    `
    UPDATE system_notifications
    SET is_read = 1, read_at = NOW(), updated_at = NOW()
    WHERE user_id = ?
    `,
    [userId]
  );

  await db.query<ResultSetHeader>(
    `
    INSERT INTO system_notification_reads (notification_id, user_id, read_at)
    SELECT sn.id, ?, NOW()
    FROM system_notifications sn
    WHERE sn.user_id IS NULL
    ON DUPLICATE KEY UPDATE read_at = NOW()
    `,
    [userId]
  );
}
