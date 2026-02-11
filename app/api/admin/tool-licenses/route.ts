import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type ToolRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  default_max_devices: number;
  default_duration_days: number | null;
};

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  username: string | null;
};

type LicenseRow = RowDataPacket & {
  id: number;
  order_id: number | null;
  order_number: string | null;
  product_id: number;
  product_title: string;
  product_slug: string;
  user_id: number;
  user_email: string;
  user_username: string | null;
  license_key: string;
  last_device_id: string | null;
  device_count: number;
  max_devices: number;
  status: "active" | "revoked" | "expired";
  expires_at: string | Date | null;
  created_at: string | Date;
  category_name: string | null;
};

type OrderLicenseDetailRow = RowDataPacket & {
  product_title: string;
  product_slug: string;
  license_key: string;
  max_devices: number;
  expires_at: string | Date | null;
};

function randomKey(prefix = "LIC-TOOL"): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const rand2 = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${stamp}-${rand}-${rand2}`;
}

type ToolDefaults = {
  maxDevices: number;
  durationDays: number | null;
};

function toDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function getToolDefaults(productId: number): Promise<ToolDefaults> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        tv.device_limit,
        tv.is_unlimited_device,
        tv.duration_days
      FROM tool_variants tv
      WHERE tv.product_id = ? AND tv.is_active = 1
      ORDER BY tv.price ASC, tv.id ASC
      LIMIT 1
      `,
      [productId]
    );
    if (rows.length > 0) {
      const row = rows[0];
      const unlimited = Number(row.is_unlimited_device ?? 0) === 1;
      const limit = Number(row.device_limit ?? 0);
      return {
        maxDevices: unlimited ? 9999 : Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1,
        durationDays:
          Number.isFinite(Number(row.duration_days)) && Number(row.duration_days) > 0
            ? Math.floor(Number(row.duration_days))
            : null,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (!message.includes("tool_variants")) {
      throw err;
    }
  }

  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT duration_days
    FROM product_variants
    WHERE product_id = ? AND is_active = 1
    ORDER BY price ASC, id ASC
    LIMIT 1
    `,
    [productId]
  );
  if (rows.length > 0) {
    const days = Number(rows[0].duration_days);
    return {
      maxDevices: 1,
      durationDays: Number.isFinite(days) && days > 0 ? Math.floor(days) : null,
    };
  }

  return { maxDevices: 1, durationDays: null };
}

async function hasOrderIdColumn(): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'tool_license_keys'
      AND column_name = 'order_id'
    LIMIT 1
    `
  );
  return rows.length > 0;
}

async function hasLicenseAuditTable(): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
    LIMIT 1
    `
  );
  return rows.length > 0;
}

async function writeLicenseAuditLog(params: {
  actorAdminId: number;
  action: "create" | "edit" | "revoke" | "remove_device" | "extend" | "expire_sync";
  targetLicenseId: number;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}): Promise<void> {
  if (!(await hasLicenseAuditTable())) return;
  await db.query<ResultSetHeader>(
    `
    INSERT INTO license_audit_logs
      (actor_admin_id, action, target_license_id, old_value, new_value, reason)
    VALUES
      (?, ?, ?, ?, ?, ?)
    `,
    [
      params.actorAdminId,
      params.action,
      params.targetLicenseId,
      params.oldValue === undefined ? null : JSON.stringify(params.oldValue),
      params.newValue === undefined ? null : JSON.stringify(params.newValue),
      params.reason || null,
    ]
  );
}

async function resolveOrderIdForLicense(
  productId: number,
  userId: number
): Promise<number | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT o.id
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ?
      AND oi.product_id = ?
      AND o.state IN ('approved', 'completed')
      AND o.result <> 'failed'
    ORDER BY o.created_at DESC
    LIMIT 1
    `,
    [userId, productId]
  );
  if (rows.length === 0) return null;
  const id = Number(rows[0].id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function resolveOrderIdFlexible(raw: number | string | null | undefined): Promise<number | null> {
  if (raw === null || raw === undefined || raw === "") return null;
  const asNumber = Number(raw);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null;

  const [byId] = await db.query<RowDataPacket[]>(
    `SELECT id FROM orders WHERE id = ? LIMIT 1`,
    [asNumber]
  );
  if (byId.length > 0) return Number(byId[0].id);

  const [byNumber] = await db.query<RowDataPacket[]>(
    `SELECT id FROM orders WHERE order_number = ? LIMIT 1`,
    [String(raw)]
  );
  if (byNumber.length > 0) return Number(byNumber[0].id);

  return null;
}

function fmtExpiry(value: string | Date | null): string {
  if (!value) return "No expiry";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

async function syncOrderDeliveryFromLicenses(orderId: number): Promise<void> {
  if (!Number.isFinite(orderId) || orderId <= 0) return;

  const [orderRows] = await db.query<RowDataPacket[]>(
    `SELECT order_number FROM orders WHERE id = ? LIMIT 1`,
    [orderId]
  );
  if (orderRows.length === 0) return;
  const orderNumber = String(orderRows[0].order_number || "");

  const [rows] = await db.query<OrderLicenseDetailRow[]>(
    `
    SELECT
      p.title AS product_title,
      p.slug AS product_slug,
      lk.license_key,
      lk.max_devices,
      lk.expires_at
    FROM tool_license_keys lk
    JOIN products p ON p.id = lk.product_id
    WHERE lk.order_id = ?
       OR CAST(lk.order_id AS CHAR) = ?
    ORDER BY lk.created_at ASC, lk.id ASC
    `,
    [orderId, orderNumber]
  );

  if (rows.length === 0) {
    await db.query<ResultSetHeader>(
      `
      UPDATE orders
      SET delivery_title = NULL, delivery_message = NULL
      WHERE id = ?
      `,
      [orderId]
    );
    return;
  }

  const message = rows
    .map(
      (row, index) =>
        `${index + 1}. ${row.product_title} (${row.product_slug})\n` +
        `License key: ${row.license_key}\n` +
        `Max devices: ${Number(row.max_devices) >= 9999 ? "Unlimited" : Number(row.max_devices)}\n` +
        `Expires: ${fmtExpiry(row.expires_at)}`
    )
    .join("\n\n");

  await db.query<ResultSetHeader>(
    `
    UPDATE orders
    SET delivery_title = 'Tool license key', delivery_message = ?
    WHERE id = ?
    `,
    [message, orderId]
  );
}

export async function GET(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [tools] = await db.query<ToolRow[]>(
      `
      SELECT p.id, p.title, p.slug
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      WHERE c.name = 'tools' AND p.is_active = 1
      ORDER BY p.created_at DESC
      `
    );

    const [users] = await db.query<UserRow[]>(
      `
      SELECT u.id, u.email, u.username
      FROM users u
      WHERE u.is_active = 1 AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT 200
      `
    );

    const withOrderId = await hasOrderIdColumn();
    const [licenses] = await db.query<LicenseRow[]>(
      withOrderId
        ? `
          SELECT
            lk.id,
            COALESCE(
              lk.order_id,
              (
                SELECT o2.id
                FROM orders o2
                JOIN order_items oi2 ON oi2.order_id = o2.id
                WHERE o2.user_id = lk.user_id
                  AND oi2.product_id = lk.product_id
                  AND o2.state IN ('approved', 'completed')
                  AND o2.result <> 'failed'
                ORDER BY o2.created_at DESC
                LIMIT 1
              )
            ) AS order_id,
            COALESCE(
              o.order_number,
              (
                SELECT o2.order_number
                FROM orders o2
                JOIN order_items oi2 ON oi2.order_id = o2.id
                WHERE o2.user_id = lk.user_id
                  AND oi2.product_id = lk.product_id
                  AND o2.state IN ('approved', 'completed')
                  AND o2.result <> 'failed'
                ORDER BY o2.created_at DESC
                LIMIT 1
              )
            ) AS order_number,
            lk.product_id,
            p.title AS product_title,
            p.slug AS product_slug,
            LOWER(pc.name) AS category_name,
            lk.user_id,
            u.email AS user_email,
            u.username AS user_username,
            lk.license_key,
            (
              SELECT ta.device_id
              FROM tool_license_activations ta
              WHERE ta.license_id = lk.id
              ORDER BY ta.last_seen_at DESC, ta.id DESC
              LIMIT 1
            ) AS last_device_id,
            (
              SELECT COUNT(DISTINCT ta.device_id)
              FROM tool_license_activations ta
              WHERE ta.license_id = lk.id
            ) AS device_count,
            lk.max_devices,
            lk.status,
            lk.expires_at,
            lk.created_at
          FROM tool_license_keys lk
          JOIN products p ON p.id = lk.product_id
          LEFT JOIN product_categories pc ON pc.id = p.category_id
          JOIN users u ON u.id = lk.user_id
          LEFT JOIN orders o ON o.id = lk.order_id
          ORDER BY lk.created_at DESC
          LIMIT 100
          `
        : `
          SELECT
            lk.id,
            (
              SELECT o2.id
              FROM orders o2
              JOIN order_items oi2 ON oi2.order_id = o2.id
              WHERE o2.user_id = lk.user_id
                AND oi2.product_id = lk.product_id
                AND o2.state IN ('approved', 'completed')
                AND o2.result <> 'failed'
              ORDER BY o2.created_at DESC
              LIMIT 1
            ) AS order_id,
            (
              SELECT o2.order_number
              FROM orders o2
              JOIN order_items oi2 ON oi2.order_id = o2.id
              WHERE o2.user_id = lk.user_id
                AND oi2.product_id = lk.product_id
                AND o2.state IN ('approved', 'completed')
                AND o2.result <> 'failed'
              ORDER BY o2.created_at DESC
              LIMIT 1
            ) AS order_number,
            lk.product_id,
            p.title AS product_title,
            p.slug AS product_slug,
            LOWER(pc.name) AS category_name,
            lk.user_id,
            u.email AS user_email,
            u.username AS user_username,
            lk.license_key,
            (
              SELECT ta.device_id
              FROM tool_license_activations ta
              WHERE ta.license_id = lk.id
              ORDER BY ta.last_seen_at DESC, ta.id DESC
              LIMIT 1
            ) AS last_device_id,
            (
              SELECT COUNT(DISTINCT ta.device_id)
              FROM tool_license_activations ta
              WHERE ta.license_id = lk.id
            ) AS device_count,
            lk.max_devices,
            lk.status,
            lk.expires_at,
            lk.created_at
          FROM tool_license_keys lk
          JOIN products p ON p.id = lk.product_id
          LEFT JOIN product_categories pc ON pc.id = p.category_id
          JOIN users u ON u.id = lk.user_id
          ORDER BY lk.created_at DESC
          LIMIT 100
          `
    );

    const withDefaults: ToolRow[] = [];
    for (const t of tools) {
      const defaults = await getToolDefaults(t.id);
      withDefaults.push({
        ...t,
        default_max_devices: defaults.maxDevices,
        default_duration_days: defaults.durationDays,
      });
    }

    return Response.json({ tools: withDefaults, users, licenses });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      productId?: number | string;
      userId?: number | string;
      orderId?: number | string;
      maxDevices?: number | string;
      expiresAt?: string | null;
      licenseKey?: string;
    };

    const productId = Number(body.productId);
    const userId = Number(body.userId);
    const orderId = body.orderId === undefined ? null : body.orderId;
    const parsedMax = Number(body.maxDevices);
    const requestedMaxDevices =
      Number.isFinite(parsedMax) && parsedMax > 0 ? Math.floor(parsedMax) : null;
    const expiresAtRaw = (body.expiresAt || "").trim();
    const manualLicense = (body.licenseKey || "").trim();

    if (!Number.isFinite(productId) || productId <= 0) {
      return Response.json({ error: "Invalid productId" }, { status: 400 });
    }
    if (!Number.isFinite(userId) || userId <= 0) {
      return Response.json({ error: "Invalid userId" }, { status: 400 });
    }
    const normalizedInputOrderId = await resolveOrderIdFlexible(orderId);
    if (orderId !== null && normalizedInputOrderId === null) {
      return Response.json({ error: "Invalid orderId" }, { status: 400 });
    }

    const [toolCheck] = await db.query<RowDataPacket[]>(
      `
      SELECT p.id
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      WHERE p.id = ? AND c.name = 'tools'
      LIMIT 1
      `,
      [productId]
    );
    if (toolCheck.length === 0) {
      return Response.json({ error: "Selected product is not a tool" }, { status: 400 });
    }

    const [userCheck] = await db.query<RowDataPacket[]>(
      `
      SELECT id FROM users WHERE id = ? LIMIT 1
      `,
      [userId]
    );
    if (userCheck.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const defaults = await getToolDefaults(productId);
    const maxDevices = requestedMaxDevices ?? defaults.maxDevices;
    const resolvedOrderId = normalizedInputOrderId ?? (await resolveOrderIdForLicense(productId, userId));

    const expiresFromRequest = toDateOrNull(expiresAtRaw);
    const expiresValue =
      expiresFromRequest ??
      (defaults.durationDays
        ? new Date(Date.now() + defaults.durationDays * 24 * 60 * 60 * 1000)
        : null);

    const licenseKey = manualLicense || randomKey("LIC-TOOL");
    const withOrderId = await hasOrderIdColumn();
    let createdLicenseId = 0;

    if (withOrderId) {
      const [insertRes] = await db.query<ResultSetHeader>(
        `
        INSERT INTO tool_license_keys
          (order_id, product_id, user_id, license_key, max_devices, status, expires_at)
        VALUES
          (?, ?, ?, ?, ?, 'active', ?)
        `,
        [resolvedOrderId, productId, userId, licenseKey, maxDevices, expiresValue]
      );
      createdLicenseId = Number(insertRes.insertId || 0);
      if (resolvedOrderId) {
        await syncOrderDeliveryFromLicenses(resolvedOrderId);
      }
    } else {
      const [insertRes] = await db.query<ResultSetHeader>(
        `
        INSERT INTO tool_license_keys
          (product_id, user_id, license_key, max_devices, status, expires_at)
        VALUES
          (?, ?, ?, ?, 'active', ?)
        `,
        [productId, userId, licenseKey, maxDevices, expiresValue]
      );
      createdLicenseId = Number(insertRes.insertId || 0);
    }

    if (createdLicenseId > 0) {
      await writeLicenseAuditLog({
        actorAdminId: auth.userId,
        action: "create",
        targetLicenseId: createdLicenseId,
        newValue: {
          orderId: resolvedOrderId,
          productId,
          userId,
          licenseKey,
          maxDevices,
          status: "active",
          expiresAt: expiresValue ? expiresValue.toISOString() : null,
        },
      });
    }

    return Response.json({ ok: true, licenseKey, maxDevices, expiresAt: expiresValue });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const duplicate = message.toLowerCase().includes("duplicate");
    return Response.json(
      { error: duplicate ? "License key already exists" : "Server error", detail: message },
      { status: duplicate ? 409 : 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      licenseId?: number | string;
      licenseKey?: string;
      maxDevices?: number | string;
      expiresAt?: string | null;
      status?: "active" | "revoked" | "expired";
      orderId?: number | string | null;
    };

    const licenseId = Number(body.licenseId);
    if (!Number.isFinite(licenseId) || licenseId <= 0) {
      return Response.json({ error: "Invalid licenseId" }, { status: 400 });
    }

    const [oldLicenseRows] = await db.query<RowDataPacket[]>(
      `
      SELECT id, order_id, product_id, user_id, license_key, max_devices, status, expires_at
      FROM tool_license_keys
      WHERE id = ?
      LIMIT 1
      `,
      [licenseId]
    );
    if (oldLicenseRows.length === 0) {
      return Response.json({ error: "License not found" }, { status: 404 });
    }
    const oldSnapshot = oldLicenseRows[0];

    const sets: string[] = [];
    const values: Array<string | number | Date | null> = [];
    const withOrderId = await hasOrderIdColumn();
    let oldOrderId: number | null = null;
    let hadStoredOrderId = false;
    let oldUserId: number | null = null;
    let oldProductId: number | null = null;
    if (withOrderId) {
      const [oldRows] = await db.query<RowDataPacket[]>(
        `SELECT order_id, user_id, product_id FROM tool_license_keys WHERE id = ? LIMIT 1`,
        [licenseId]
      );
      if (oldRows.length > 0) {
        const v = Number(oldRows[0].order_id);
        oldOrderId = Number.isFinite(v) && v > 0 ? v : null;
        hadStoredOrderId = oldOrderId !== null;
        const u = Number(oldRows[0].user_id);
        const p = Number(oldRows[0].product_id);
        oldUserId = Number.isFinite(u) && u > 0 ? u : null;
        oldProductId = Number.isFinite(p) && p > 0 ? p : null;
      }
    }

    if (body.licenseKey !== undefined) {
      const licenseKey = String(body.licenseKey || "").trim();
      if (!licenseKey) {
        return Response.json({ error: "Invalid licenseKey" }, { status: 400 });
      }
      sets.push("license_key = ?");
      values.push(licenseKey);
    }

    if (body.maxDevices !== undefined) {
      const maxDevices = Number(body.maxDevices);
      if (!Number.isFinite(maxDevices) || maxDevices <= 0) {
        return Response.json({ error: "Invalid maxDevices" }, { status: 400 });
      }
      sets.push("max_devices = ?");
      values.push(Math.floor(maxDevices));
    }

    if (body.status !== undefined) {
      if (!["active", "revoked", "expired"].includes(String(body.status))) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      sets.push("status = ?");
      values.push(String(body.status));
    }

    if (body.expiresAt !== undefined) {
      const expiresAtRaw = (body.expiresAt || "").trim();
      const expiresAt = expiresAtRaw ? toDateOrNull(expiresAtRaw) : null;
      if (expiresAtRaw && !expiresAt) {
        return Response.json({ error: "Invalid expiresAt" }, { status: 400 });
      }
      sets.push("expires_at = ?");
      values.push(expiresAt);
    }

    if (withOrderId && body.orderId !== undefined) {
      const parsed = body.orderId === null ? null : Number(body.orderId);
      if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
        return Response.json({ error: "Invalid orderId" }, { status: 400 });
      }
      sets.push("order_id = ?");
      values.push(parsed);
    }

    if (sets.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(licenseId);
    const [result] = await db.query<ResultSetHeader>(
      `UPDATE tool_license_keys SET ${sets.join(", ")} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return Response.json({ error: "License not found" }, { status: 404 });
    }

    if (withOrderId) {
      if (oldOrderId) {
        const normalizedOld = await resolveOrderIdFlexible(oldOrderId);
        if (normalizedOld && normalizedOld !== oldOrderId) {
          oldOrderId = normalizedOld;
          await db.query<ResultSetHeader>(
            `UPDATE tool_license_keys SET order_id = ? WHERE id = ?`,
            [oldOrderId, licenseId]
          );
        }
      }
      if (!oldOrderId && oldUserId && oldProductId) {
        oldOrderId = await resolveOrderIdForLicense(oldProductId, oldUserId);
        if (oldOrderId && !hadStoredOrderId) {
          // Backfill missing order_id on legacy license rows so delivery sync includes this license.
          await db.query<ResultSetHeader>(
            `UPDATE tool_license_keys SET order_id = ? WHERE id = ? AND order_id IS NULL`,
            [oldOrderId, licenseId]
          );
        }
      }
      let newOrderId = oldOrderId;
      if (body.orderId !== undefined) {
        newOrderId = await resolveOrderIdFlexible(body.orderId);
      }
      if (oldOrderId) await syncOrderDeliveryFromLicenses(oldOrderId);
      if (newOrderId && newOrderId !== oldOrderId) {
        await syncOrderDeliveryFromLicenses(newOrderId);
      }
    }

    const [newLicenseRows] = await db.query<RowDataPacket[]>(
      `
      SELECT id, order_id, product_id, user_id, license_key, max_devices, status, expires_at
      FROM tool_license_keys
      WHERE id = ?
      LIMIT 1
      `,
      [licenseId]
    );
    await writeLicenseAuditLog({
      actorAdminId: auth.userId,
      action: "edit",
      targetLicenseId: licenseId,
      oldValue: oldSnapshot,
      newValue: newLicenseRows[0] ?? null,
    });

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const duplicate = message.toLowerCase().includes("duplicate");
    return Response.json(
      { error: duplicate ? "License key already exists" : "Server error", detail: message },
      { status: duplicate ? 409 : 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const licenseId = Number(url.searchParams.get("licenseId") || 0);
    if (!Number.isFinite(licenseId) || licenseId <= 0) {
      return Response.json({ error: "Invalid licenseId" }, { status: 400 });
    }

    const withOrderId = await hasOrderIdColumn();
    let oldOrderId: number | null = null;
    let oldUserId: number | null = null;
    let oldProductId: number | null = null;
    let oldSnapshot: RowDataPacket | null = null;
    if (withOrderId) {
      const [oldRows] = await db.query<RowDataPacket[]>(
        `
        SELECT id, order_id, user_id, product_id, license_key, max_devices, status, expires_at
        FROM tool_license_keys
        WHERE id = ?
        LIMIT 1
        `,
        [licenseId]
      );
      if (oldRows.length > 0) {
        oldSnapshot = oldRows[0];
        const v = Number(oldRows[0].order_id);
        oldOrderId = Number.isFinite(v) && v > 0 ? v : null;
        const u = Number(oldRows[0].user_id);
        const p = Number(oldRows[0].product_id);
        oldUserId = Number.isFinite(u) && u > 0 ? u : null;
        oldProductId = Number.isFinite(p) && p > 0 ? p : null;
      }
    } else {
      const [oldRows] = await db.query<RowDataPacket[]>(
        `
        SELECT id, order_id, user_id, product_id, license_key, max_devices, status, expires_at
        FROM tool_license_keys
        WHERE id = ?
        LIMIT 1
        `,
        [licenseId]
      );
      if (oldRows.length > 0) {
        oldSnapshot = oldRows[0];
      }
    }

    const [result] = await db.query<ResultSetHeader>(
      `DELETE FROM tool_license_keys WHERE id = ?`,
      [licenseId]
    );
    if (result.affectedRows === 0) {
      return Response.json({ error: "License not found" }, { status: 404 });
    }

    if (!oldOrderId && oldUserId && oldProductId) {
      oldOrderId = await resolveOrderIdForLicense(oldProductId, oldUserId);
    }
    if (oldOrderId) {
      await syncOrderDeliveryFromLicenses(oldOrderId);
    }

    if (oldSnapshot) {
      await writeLicenseAuditLog({
        actorAdminId: auth.userId,
        action: "edit",
        targetLicenseId: licenseId,
        oldValue: oldSnapshot,
        newValue: null,
        reason: "delete_license",
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
