import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import bcrypt from "bcryptjs";

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  username?: string | null;
  role: "user" | "admin";
  is_active: number;
  level?: number | null;
  buying_score?: number | null;
  selling_score?: number | null;
  purchase_count?: number | null;
  purchase_total?: number | null;
  sales_count?: number | null;
  sales_total?: number | null;
  max_devices?: number | null;
  login_device_count?: number | null;
  deleted_at?: string | Date | null;
  banned_at?: string | Date | null;
  ban_until?: string | Date | null;
  ban_reason?: string | null;
  presence_status?: "online" | "offline" | null;
  presence_last_active_at?: string | Date | null;
  created_at: string | Date | null;
  updated_at?: string | Date | null;
};

type CountRow = RowDataPacket & { total: number };
type AdminUserStatus = "active" | "banned" | "deleted";
const PRESENCE_WINDOW_MINUTES = 5;

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function makeUsernameFromEmail(email: string): string {
  const local = (email.split("@")[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 18);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${local || "user"}_${suffix}`.slice(0, 30);
}

async function hasColumn(table: string, column: string): Promise<boolean> {
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

/* =========================
   GET: LIST USERS (ADMIN)
========================= */
export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json(
        { users: [], error: "Forbidden" },
        { status: 403 }
      );
    }

    const usersHasUpdatedAt = await hasColumn("users", "updated_at");
    const usersHasDeletedAt = await hasColumn("users", "deleted_at");
    const usersHasBannedAt = await hasColumn("users", "banned_at");
    const usersHasBanUntil = await hasColumn("users", "ban_until");
    const usersHasBanReason = await hasColumn("users", "ban_reason");
    const usersHasUsername = await hasColumn("users", "username");
    const usersHasLevel = await hasColumn("users", "level");
    const usersHasBuyingScore = await hasColumn("users", "buying_score");
    const usersHasSellingScore = await hasColumn("users", "selling_score");
    const presenceHasStatus = await hasColumn("user_presence", "status");
    const presenceHasLastActiveAt = await hasColumn("user_presence", "last_active_at");
    const hasUserPresence = presenceHasStatus || presenceHasLastActiveAt;
    const hasUserLoginSettings = await hasTable("user_login_settings");
    const loginSettingsHasMaxDevices = hasUserLoginSettings
      ? await hasColumn("user_login_settings", "max_devices")
      : false;
    const hasUserLoginDevices = await hasTable("user_login_devices");

    if (usersHasBanUntil && usersHasDeletedAt) {
      if (hasUserLoginDevices) {
        await db.query(
          `
          DELETE d
          FROM user_login_devices d
          JOIN users u ON u.id = d.user_id
          WHERE u.deleted_at IS NULL
            AND u.is_active = 0
            AND u.ban_until IS NOT NULL
            AND u.ban_until <= NOW()
          `
        );
      }

      const clearParts: string[] = ["is_active = 1", "ban_until = NULL"];
      if (usersHasBannedAt) clearParts.push("banned_at = NULL");
      if (usersHasBanReason) clearParts.push("ban_reason = NULL");
      if (usersHasUpdatedAt) clearParts.push("updated_at = NOW()");

      await db.query(
        `
        UPDATE users
        SET ${clearParts.join(", ")}
        WHERE deleted_at IS NULL
          AND is_active = 0
          AND ban_until IS NOT NULL
          AND ban_until <= NOW()
        `
      );
    }

    const [rows] = await db.query<UserRow[]>(
      `
      SELECT 
        u.id,
        u.email,
        ${usersHasUsername ? "u.username," : "NULL AS username,"}
        u.role,
        u.is_active,
        ${usersHasLevel ? "u.level," : "1 AS level,"}
        ${usersHasBuyingScore ? "u.buying_score," : "0 AS buying_score,"}
        ${usersHasSellingScore ? "u.selling_score," : "0 AS selling_score,"}
        COALESCE(purchase_stats.purchase_count, 0) AS purchase_count,
        COALESCE(purchase_stats.purchase_total, 0) AS purchase_total,
        COALESCE(sales_stats.sales_count, 0) AS sales_count,
        COALESCE(sales_stats.sales_total, 0) AS sales_total,
        ${
          hasUserLoginSettings && loginSettingsHasMaxDevices
            ? "settings.max_devices,"
            : "NULL AS max_devices,"
        }
        ${
          hasUserLoginDevices
            ? "COALESCE(login_devices.device_count, 0) AS login_device_count,"
            : "0 AS login_device_count,"
        }
        ${usersHasDeletedAt ? "u.deleted_at," : "NULL AS deleted_at,"}
        ${usersHasBannedAt ? "u.banned_at," : "NULL AS banned_at,"}
        ${usersHasBanUntil ? "u.ban_until," : "NULL AS ban_until,"}
        ${usersHasBanReason ? "u.ban_reason," : "NULL AS ban_reason,"}
        ${hasUserPresence && presenceHasStatus ? "presence.status AS presence_status," : "NULL AS presence_status,"}
        ${hasUserPresence && presenceHasLastActiveAt ? "presence.last_active_at AS presence_last_active_at," : "NULL AS presence_last_active_at,"}
        u.created_at
        ${usersHasUpdatedAt ? ", u.updated_at" : ""}
      FROM users u
      ${
        hasUserLoginSettings && loginSettingsHasMaxDevices
          ? "LEFT JOIN user_login_settings settings ON settings.user_id = u.id"
          : ""
      }
      ${
        hasUserLoginDevices
          ? `LEFT JOIN (
               SELECT user_id, COUNT(*) AS device_count
               FROM user_login_devices
               GROUP BY user_id
             ) login_devices ON login_devices.user_id = u.id`
          : ""
      }
      LEFT JOIN (
        SELECT
          o.user_id,
          COUNT(DISTINCT o.id) AS purchase_count,
          COALESCE(SUM(COALESCE(NULLIF(o.total_amount, 0), o.total)), 0) AS purchase_total
        FROM orders o
        WHERE o.state IN ('approved', 'delivering', 'completed')
        GROUP BY o.user_id
      ) purchase_stats ON purchase_stats.user_id = u.id
      LEFT JOIN (
        SELECT
          p.posted_by AS user_id,
          COUNT(DISTINCT o.id) AS sales_count,
          COALESCE(SUM(oi.qty * oi.unit_price), 0) AS sales_total
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE o.state IN ('approved', 'delivering', 'completed')
        GROUP BY p.posted_by
      ) sales_stats ON sales_stats.user_id = u.id
      ${hasUserPresence ? "LEFT JOIN user_presence presence ON presence.user_id = u.id" : ""}
      ORDER BY u.created_at DESC
      `
    );

    const [totalRows] = await db.query<CountRow[]>(`SELECT COUNT(*) AS total FROM users`);
    const [adminRows] = await db.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM users WHERE role = 'admin'`
    );
    const [bannedRows] = await db.query<CountRow[]>(
      usersHasDeletedAt && usersHasBanUntil
        ? `SELECT COUNT(*) AS total FROM users WHERE is_active = 0 AND deleted_at IS NULL AND (ban_until IS NULL OR ban_until > NOW())`
        : usersHasDeletedAt
          ? `SELECT COUNT(*) AS total FROM users WHERE is_active = 0 AND deleted_at IS NULL`
        : `SELECT COUNT(*) AS total FROM users WHERE is_active = 0`
    );
    const [deletedRows] = await db.query<CountRow[]>(
      usersHasDeletedAt
        ? `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NOT NULL`
        : `SELECT 0 AS total`
    );
    const [newWeekRows] = await db.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    let onlineCount = 0;
    let offlineCount = 0;
    if (hasUserPresence && presenceHasStatus) {
      const [onlineRows] = await db.query<CountRow[]>(
        `
        SELECT COUNT(*) AS total
        FROM users u
        LEFT JOIN user_presence presence ON presence.user_id = u.id
        WHERE presence.status = 'online'
          AND (
            presence.last_active_at IS NULL
            OR presence.last_active_at >= DATE_SUB(NOW(), INTERVAL ${PRESENCE_WINDOW_MINUTES} MINUTE)
          )
        `
      );
      onlineCount = Number(onlineRows[0]?.total ?? 0);
      const totalUsers = Number(totalRows[0]?.total ?? 0);
      offlineCount = Math.max(0, totalUsers - onlineCount);
    }

    let activeTodayCount = 0;
    if (usersHasUpdatedAt) {
      const [activeRows] = await db.query<CountRow[]>(
        `
        SELECT COUNT(*) AS total
        FROM users
        WHERE is_active = 1
          AND updated_at >= CURDATE()
        `
      );
      activeTodayCount = Number(activeRows[0]?.total ?? 0);
    } else {
      const [activeRowsFallback] = await db.query<CountRow[]>(
        `
        SELECT COUNT(*) AS total
        FROM users
        WHERE is_active = 1
          AND created_at >= CURDATE()
        `
      );
      activeTodayCount = Number(activeRowsFallback[0]?.total ?? 0);
    }

    return Response.json({
      users:
        (rows ?? []).map((u) => {
          const isDeleted = usersHasDeletedAt && !!u.deleted_at;
          const status: AdminUserStatus = isDeleted
            ? "deleted"
            : Number(u.is_active) === 1
              ? "active"
              : "banned";
          return {
            ...u,
            username: typeof u.username === "string" ? u.username : null,
            status,
            level: Number.isFinite(Number(u.level)) ? Math.max(1, Math.floor(Number(u.level))) : 1,
            buying_score: Number.isFinite(Number(u.buying_score)) ? Number(u.buying_score) : 0,
            selling_score: Number.isFinite(Number(u.selling_score)) ? Number(u.selling_score) : 0,
            purchase_count: Number.isFinite(Number(u.purchase_count))
              ? Math.max(0, Math.floor(Number(u.purchase_count)))
              : 0,
            purchase_total: Number.isFinite(Number(u.purchase_total))
              ? Number(u.purchase_total)
              : 0,
            sales_count: Number.isFinite(Number(u.sales_count))
              ? Math.max(0, Math.floor(Number(u.sales_count)))
              : 0,
            sales_total: Number.isFinite(Number(u.sales_total))
              ? Number(u.sales_total)
              : 0,
            ban_until: u.ban_until ?? null,
            ban_reason: u.ban_reason ?? null,
            presence_status: u.presence_status ?? "offline",
            presence_last_active_at: u.presence_last_active_at ?? null,
            max_devices: Number.isFinite(Number(u.max_devices))
              ? Math.max(1, Math.floor(Number(u.max_devices)))
              : 10,
            login_device_count: Number.isFinite(Number(u.login_device_count))
              ? Math.max(0, Math.floor(Number(u.login_device_count)))
              : 0,
          };
        }) ?? [],
      stats: {
        totalUsers: Number(totalRows[0]?.total ?? 0),
        activeToday: activeTodayCount,
        admins: Number(adminRows[0]?.total ?? 0),
        banned: Number(bannedRows[0]?.total ?? 0),
        deleted: Number(deletedRows[0]?.total ?? 0),
        online: onlineCount,
        offline: offlineCount,
        newThisWeek: Number(newWeekRows[0]?.total ?? 0),
      },
    });
  } catch (err) {
    console.error("ADMIN USERS GET ERROR:", err);

    return Response.json(
      { users: [], error: "Server error" },
      { status: 500 }
    );
  }
}

/* =========================
   POST: CREATE USER (ADMIN)
========================= */
export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const email = getString(b.email).toLowerCase();
    const password = typeof b.password === "string" ? b.password : "";
    const role = b.role === "admin" ? "admin" : "user";

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const [existsRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (existsRows.length > 0) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const username = makeUsernameFromEmail(email);

    await db.query<ResultSetHeader>(
      `
      INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, username)
      VALUES (?, ?, ?, 1, 'Admin', 'Created', ?)
      `,
      [email, passwordHash, role, username]
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("ADMIN USERS POST ERROR:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

/* =========================
   PUT: CHANGE USER ROLE (ADMIN)
========================= */
export async function PUT(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return Response.json(
        { error: "Invalid body" },
        { status: 400 }
      );
    }

    const { userId, role } = body as {
      userId?: number;
      role?: "user" | "admin";
      isActive?: number | boolean;
      status?: AdminUserStatus;
      banDays?: number | null;
      banReason?: string | null;
      maxDevices?: number | null;
    };
    const isActiveRaw = (body as { isActive?: number | boolean }).isActive;
    const statusRaw = (body as { status?: AdminUserStatus }).status;
    const banDaysRaw = (body as { banDays?: number | null }).banDays;
    const banReasonRaw = (body as { banReason?: string | null }).banReason;
    const maxDevicesRaw = (body as { maxDevices?: number | null }).maxDevices;
    const hasRole = role === "user" || role === "admin";
    const hasIsActive = isActiveRaw === 0 || isActiveRaw === 1 || typeof isActiveRaw === "boolean";
    const hasStatus = statusRaw === "active" || statusRaw === "banned" || statusRaw === "deleted";
    const hasMaxDevices =
      maxDevicesRaw !== null &&
      maxDevicesRaw !== undefined &&
      Number.isFinite(Number(maxDevicesRaw)) &&
      Math.floor(Number(maxDevicesRaw)) > 0;

    if (!Number.isFinite(userId) || (!hasRole && !hasIsActive && !hasStatus && !hasMaxDevices)) {
      return Response.json(
        { error: "Invalid userId or update fields" },
        { status: 400 }
      );
    }

    /* Prevent self mutation from admin panel */
    if (auth.userId === userId) {
      return Response.json(
        { error: "You cannot change your own account from this page" },
        { status: 400 }
      );
    }

    const usersHasDeletedAt = await hasColumn("users", "deleted_at");
    const usersHasBannedAt = await hasColumn("users", "banned_at");
    const usersHasBanUntil = await hasColumn("users", "ban_until");
    const usersHasBanReason = await hasColumn("users", "ban_reason");
    const hasUserLoginSettings = await hasTable("user_login_settings");
    const loginSettingsHasMaxDevices = hasUserLoginSettings
      ? await hasColumn("user_login_settings", "max_devices")
      : false;
    const hasUserLoginDevices = await hasTable("user_login_devices");
    if (hasMaxDevices && (!hasUserLoginSettings || !loginSettingsHasMaxDevices)) {
      return Response.json(
        { error: "user_login_settings.max_devices is required. Run sql/2026-02-11-video-course-access-sync.sql" },
        { status: 500 }
      );
    }
    if (hasStatus && !usersHasDeletedAt) {
      return Response.json(
        { error: "deleted_at column is required for status updates" },
        { status: 500 }
      );
    }
    if (statusRaw === "banned" && banDaysRaw !== null && banDaysRaw !== undefined && !usersHasBanUntil) {
      return Response.json(
        { error: "ban_until column is required for timed bans. Run sql/2026-02-11-user-ban-duration.sql" },
        { status: 500 }
      );
    }

    const [currentRows] = await db.query<RowDataPacket[]>(
      `SELECT ${usersHasDeletedAt ? "deleted_at" : "id"} FROM users WHERE id = ? LIMIT 1`,
      [userId as number]
    );
    if (currentRows.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    let currentDeletedAt: string | Date | null = null;
    if (usersHasDeletedAt) {
      currentDeletedAt = (currentRows[0] as { deleted_at?: string | Date | null }).deleted_at ?? null;
      if (currentDeletedAt && hasStatus && statusRaw !== "deleted") {
        return Response.json(
          { error: "Deleted account cannot be restored" },
          { status: 400 }
        );
      }
    }

    const sets: string[] = [];
    const values: Array<string | number> = [];

    if (hasRole) {
      sets.push("role = ?");
      values.push(role as "user" | "admin");
    }

    if (hasIsActive) {
      sets.push("is_active = ?");
      values.push(
        typeof isActiveRaw === "boolean"
          ? isActiveRaw
            ? 1
            : 0
          : Number(isActiveRaw)
      );
    }

    if (hasStatus) {
      if (statusRaw === "active") {
        sets.push("is_active = ?");
        values.push(1);
        sets.push("deleted_at = NULL");
        if (usersHasBannedAt) sets.push("banned_at = NULL");
        if (usersHasBanUntil) sets.push("ban_until = NULL");
        if (usersHasBanReason) sets.push("ban_reason = NULL");
      } else if (statusRaw === "banned") {
        sets.push("is_active = ?");
        values.push(0);
        sets.push("deleted_at = NULL");
        if (usersHasBannedAt) sets.push("banned_at = NOW()");
        if (usersHasBanReason) {
          const reason =
            typeof banReasonRaw === "string" && banReasonRaw.trim().length > 0
              ? banReasonRaw.trim().slice(0, 255)
              : null;
          if (reason) {
            sets.push("ban_reason = ?");
            values.push(reason);
          } else {
            sets.push("ban_reason = NULL");
          }
        }
        if (usersHasBanUntil) {
          const parsedDays = Number(banDaysRaw);
          const finiteDays = Number.isFinite(parsedDays) ? Math.floor(parsedDays) : NaN;
          if (Number.isFinite(finiteDays) && finiteDays > 0) {
            sets.push("ban_until = DATE_ADD(NOW(), INTERVAL ? DAY)");
            values.push(finiteDays);
          } else {
            sets.push("ban_until = NULL");
          }
        }
      } else if (statusRaw === "deleted") {
        sets.push("is_active = ?");
        values.push(0);
        sets.push("deleted_at = NOW()");
        if (usersHasBannedAt) sets.push("banned_at = NULL");
        if (usersHasBanUntil) sets.push("ban_until = NULL");
        if (usersHasBanReason) sets.push("ban_reason = NULL");
      }
    }

    const shouldUpdateUsersTable = sets.length > 0;
    const shouldUpdateMaxDevices = hasMaxDevices && hasUserLoginSettings && loginSettingsHasMaxDevices;

    if (!shouldUpdateUsersTable && !shouldUpdateMaxDevices) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    let affectedRows = 1;
    if (shouldUpdateUsersTable) {
      values.push(userId as number);
      const [result] = await db.query<ResultSetHeader>(
        `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
        values
      );
      affectedRows = result.affectedRows;
    }

    if (affectedRows === 0) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (shouldUpdateMaxDevices) {
      const safeMaxDevices = Math.max(1, Math.floor(Number(maxDevicesRaw)));
      await db.query<ResultSetHeader>(
        `
        INSERT INTO user_login_settings (user_id, max_devices)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE max_devices = VALUES(max_devices)
        `,
        [userId as number, safeMaxDevices]
      );
    }

    // Ban/unban/delete should reset login devices to force fresh device registration.
    if (hasStatus && hasUserLoginDevices) {
      await db.query<ResultSetHeader>(
        `DELETE FROM user_login_devices WHERE user_id = ?`,
        [userId as number]
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("ADMIN USERS PUT ERROR:", err);

    return Response.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
