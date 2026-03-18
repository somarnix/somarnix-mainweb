import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export type OrderNotificationScope = "cancelled" | "purchase" | "sold";

export type OrderNotificationRecord = {
  id: number;
  order_number: string;
  product_title: string | null;
  isRead: boolean;
};

type NotificationRow = RowDataPacket & {
  id: number;
  order_number: string;
  product_title: string | null;
  is_read: number;
};

let ensurePromise: Promise<void> | null = null;

export async function ensureOrderNotificationsSchema(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS order_notification_reads (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT NOT NULL,
          order_id BIGINT UNSIGNED NOT NULL,
          scope_key VARCHAR(32) NOT NULL,
          read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_order_notification_reads (user_id, order_id, scope_key),
          KEY idx_order_notification_reads_user_scope (user_id, scope_key, read_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  await ensurePromise;
}

function mapRows(rows: NotificationRow[]): OrderNotificationRecord[] {
  return rows.map((row) => ({
    id: Number(row.id),
    order_number: String(row.order_number),
    product_title: row.product_title ? String(row.product_title) : null,
    isRead: Number(row.is_read ?? 0) === 1,
  }));
}

async function countUnread(
  userId: number,
  scope: OrderNotificationScope,
  sql: string,
  params: Array<number | string>
): Promise<number> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM (${sql}) base
    LEFT JOIN order_notification_reads onr
      ON onr.user_id = ?
     AND onr.order_id = base.id
     AND onr.scope_key = ?
    WHERE onr.id IS NULL
    `,
    [userId, scope, ...params]
  );

  return Number(rows[0]?.total ?? 0);
}

export async function getOrderNotificationsForUser(userId: number): Promise<{
  cancelledOrders: OrderNotificationRecord[];
  purchaseOrders: OrderNotificationRecord[];
  soldOrders: OrderNotificationRecord[];
  unreadCounts: {
    cancelled: number;
    purchase: number;
    sold: number;
    total: number;
  };
}> {
  await ensureOrderNotificationsSchema();

  const cancelledBaseSql = `
    SELECT
      o.id,
      o.order_number,
      (
        SELECT p.title
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
        ORDER BY oi.id ASC
        LIMIT 1
      ) AS product_title
    FROM orders o
    WHERE o.user_id = ? AND o.state = 'cancelled'
  `;

  const purchaseBaseSql = `
    SELECT
      o.id,
      o.order_number,
      (
        SELECT p.title
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
        ORDER BY oi.id ASC
        LIMIT 1
      ) AS product_title
    FROM orders o
    WHERE o.user_id = ?
  `;

  const soldBaseSql = `
    SELECT
      o.id,
      o.order_number,
      (
        SELECT p.title
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id AND p.posted_by = ?
        ORDER BY oi.id ASC
        LIMIT 1
      ) AS product_title
    FROM orders o
    JOIN order_items oi2 ON oi2.order_id = o.id
    JOIN products p2 ON p2.id = oi2.product_id
    WHERE p2.posted_by = ?
    GROUP BY o.id, o.order_number
  `;

  const [cancelledRows] = await db.query<NotificationRow[]>(
    `
    SELECT
      base.id,
      base.order_number,
      base.product_title,
      CASE WHEN onr.id IS NULL THEN 0 ELSE 1 END AS is_read
    FROM (${cancelledBaseSql}) base
    LEFT JOIN order_notification_reads onr
      ON onr.user_id = ?
     AND onr.order_id = base.id
     AND onr.scope_key = 'cancelled'
    ORDER BY base.id DESC
    LIMIT 2
    `,
    [userId, userId]
  );

  const [purchaseRows] = await db.query<NotificationRow[]>(
    `
    SELECT
      base.id,
      base.order_number,
      base.product_title,
      CASE WHEN onr.id IS NULL THEN 0 ELSE 1 END AS is_read
    FROM (${purchaseBaseSql}) base
    LEFT JOIN order_notification_reads onr
      ON onr.user_id = ?
     AND onr.order_id = base.id
     AND onr.scope_key = 'purchase'
    ORDER BY base.id DESC
    LIMIT 5
    `,
    [userId, userId]
  );

  const [soldRows] = await db.query<NotificationRow[]>(
    `
    SELECT
      base.id,
      base.order_number,
      base.product_title,
      CASE WHEN onr.id IS NULL THEN 0 ELSE 1 END AS is_read
    FROM (${soldBaseSql}) base
    LEFT JOIN order_notification_reads onr
      ON onr.user_id = ?
     AND onr.order_id = base.id
     AND onr.scope_key = 'sold'
    ORDER BY base.id DESC
    LIMIT 5
    `,
    [userId, userId, userId]
  );

  const [cancelledUnread, purchaseUnread, soldUnread] = await Promise.all([
    countUnread(userId, "cancelled", cancelledBaseSql, [userId]),
    countUnread(userId, "purchase", purchaseBaseSql, [userId]),
    countUnread(userId, "sold", soldBaseSql, [userId, userId]),
  ]);

  return {
    cancelledOrders: mapRows(cancelledRows),
    purchaseOrders: mapRows(purchaseRows),
    soldOrders: mapRows(soldRows),
    unreadCounts: {
      cancelled: cancelledUnread,
      purchase: purchaseUnread,
      sold: soldUnread,
      total: cancelledUnread + purchaseUnread + soldUnread,
    },
  };
}

export async function markOrderNotificationRead(
  userId: number,
  orderId: number,
  scope: OrderNotificationScope
): Promise<void> {
  await ensureOrderNotificationsSchema();

  await db.query<ResultSetHeader>(
    `
    INSERT INTO order_notification_reads (user_id, order_id, scope_key, read_at)
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE read_at = NOW()
    `,
    [userId, orderId, scope]
  );
}

export async function markAllOrderNotificationsRead(
  userId: number,
  scope?: OrderNotificationScope
): Promise<void> {
  await ensureOrderNotificationsSchema();

  const scopes: OrderNotificationScope[] = scope
    ? [scope]
    : ["cancelled", "purchase", "sold"];

  for (const currentScope of scopes) {
    if (currentScope === "cancelled") {
      await db.query<ResultSetHeader>(
        `
        INSERT INTO order_notification_reads (user_id, order_id, scope_key, read_at)
        SELECT ?, o.id, 'cancelled', NOW()
        FROM orders o
        WHERE o.user_id = ? AND o.state = 'cancelled'
        ON DUPLICATE KEY UPDATE read_at = NOW()
        `,
        [userId, userId]
      );
      continue;
    }

    if (currentScope === "purchase") {
      await db.query<ResultSetHeader>(
        `
        INSERT INTO order_notification_reads (user_id, order_id, scope_key, read_at)
        SELECT ?, o.id, 'purchase', NOW()
        FROM orders o
        WHERE o.user_id = ?
        ON DUPLICATE KEY UPDATE read_at = NOW()
        `,
        [userId, userId]
      );
      continue;
    }

    await db.query<ResultSetHeader>(
      `
      INSERT INTO order_notification_reads (user_id, order_id, scope_key, read_at)
      SELECT DISTINCT ?, o.id, 'sold', NOW()
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.posted_by = ?
      ON DUPLICATE KEY UPDATE read_at = NOW()
      `,
      [userId, userId]
    );
  }
}
