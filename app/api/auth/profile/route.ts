import bcrypt from "bcryptjs";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { normalizeAppRole, type AppRole } from "@/lib/roles";
import { createSystemNotification } from "@/lib/system-notifications";
import { normalizeAvatarBorderUrl } from "@/app/lib/avatar-borders";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function cleanStr(v: unknown, max = 255): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9._]{3,30}$/.test(username);
}

function sanitizeStoredPhone(v: unknown, max = 40): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) return null;
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
  return normalized.length > max ? normalized.slice(0, max) : normalized;
}

function normalizePhone(v: unknown, max = 40): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
  return normalized.length > max ? normalized.slice(0, max) : normalized;
}

function hasOwn(value: object, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

async function hasColumn(tableName: string, columnName: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function ensureUsersAvatarUrlLength(minLength = 2000) {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'avatar_url'
    LIMIT 1
    `
  );

  const row = rows[0];
  const dataType = typeof row?.data_type === "string" ? row.data_type.toLowerCase() : "";
  const currentLength = Number(row?.character_maximum_length ?? 0);

  if (dataType === "varchar" && Number.isFinite(currentLength) && currentLength < minLength) {
    await db.query(
      `ALTER TABLE users MODIFY COLUMN avatar_url VARCHAR(${minLength}) NULL`
    );
  }
}

async function ensureUsersProfileCoverColumns() {
  const coverColumns = [
    {
      name: "cover_url",
      sql: "ALTER TABLE users ADD COLUMN cover_url VARCHAR(2000) NULL AFTER avatar_url",
    },
    {
      name: "cover_position_x",
      sql: "ALTER TABLE users ADD COLUMN cover_position_x DECIMAL(6,2) NOT NULL DEFAULT 50.00 AFTER cover_url",
    },
    {
      name: "cover_position_y",
      sql: "ALTER TABLE users ADD COLUMN cover_position_y DECIMAL(6,2) NOT NULL DEFAULT 50.00 AFTER cover_position_x",
    },
    {
      name: "cover_scale",
      sql: "ALTER TABLE users ADD COLUMN cover_scale DECIMAL(6,2) NOT NULL DEFAULT 1.00 AFTER cover_position_y",
    },
  ] as const;

  for (const column of coverColumns) {
    if (!(await hasColumn("users", column.name))) {
      await db.query(column.sql);
    }
  }
}

function normalizeRangeNumber(value: unknown, min: number, max: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Number(num.toFixed(2))));
}

/* ================= REQUEST BODY TYPE ================= */

type ProfileUpdateBody = {
  firstName?: unknown;
  lastName?: unknown;
  username?: unknown;
  birthDate?: unknown;
  place?: unknown;
  bio?: unknown;
  phone?: unknown;
  avatarUrl?: unknown;
  avatarBorderUrl?: unknown;
  coverUrl?: unknown;
  coverPositionX?: unknown;
  coverPositionY?: unknown;
  coverScale?: unknown;

  newEmail?: unknown;
  newPassword?: unknown;
  currentPassword?: unknown;
};

/* ================= DB TYPES ================= */

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  role: AppRole;
  level: number | null;

  first_name: string | null;
  last_name: string | null;
  username: string | null;
  birth_date: string | null;
  place: string | null;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
  avatar_border_url: string | null;
  cover_url: string | null;
  cover_position_x: number | null;
  cover_position_y: number | null;
  cover_scale: number | null;

  created_at: string | null;
  updated_at: string | null;

  password_hash: string | null;

  is_active: number;
  deleted_at: string | null;
}

/* ================= GET PROFILE ================= */

export async function GET(req: Request): Promise<Response> {
  const auth = await getAuthUser(req);
  if (!auth) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const hasAvatarBorderColumn = await hasColumn("users", "avatar_border_url");
  const hasLevelColumn = await hasColumn("users", "level");
  const hasCoverUrlColumn = await hasColumn("users", "cover_url");
  const hasCoverPositionXColumn = await hasColumn("users", "cover_position_x");
  const hasCoverPositionYColumn = await hasColumn("users", "cover_position_y");
  const hasCoverScaleColumn = await hasColumn("users", "cover_scale");
  const avatarBorderSelect = hasAvatarBorderColumn
    ? "avatar_border_url"
    : "NULL AS avatar_border_url";
  const levelSelect = hasLevelColumn ? "level" : "1 AS level";
  const coverUrlSelect = hasCoverUrlColumn ? "cover_url" : "NULL AS cover_url";
  const coverPositionXSelect = hasCoverPositionXColumn
    ? "cover_position_x"
    : "50.00 AS cover_position_x";
  const coverPositionYSelect = hasCoverPositionYColumn
    ? "cover_position_y"
    : "50.00 AS cover_position_y";
  const coverScaleSelect = hasCoverScaleColumn ? "cover_scale" : "1.00 AS cover_scale";

  const [rows] = await db.query<UserRow[]>(
    `SELECT
      id, email, role, ${levelSelect},
      first_name, last_name, username, birth_date, place, bio, phone, avatar_url,
      ${avatarBorderSelect},
      ${coverUrlSelect},
      ${coverPositionXSelect},
      ${coverPositionYSelect},
      ${coverScaleSelect},
      created_at, updated_at,
      is_active, deleted_at
     FROM users
     WHERE id = ? LIMIT 1`,
    [auth.userId]
  );

  if (rows.length === 0) {
    return Response.json(
      { error: "User not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const u = rows[0];

  if (u.deleted_at) {
    return Response.json(
      { error: "Account deleted" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (u.is_active === 0)
    return Response.json(
      { error: "Account deactivated" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );

  return Response.json(
    {
      success: true,
      user: {
        id: u.id,
        email: u.email,
        role: normalizeAppRole(u.role),
        level: Number(u.level ?? 1) || 1,

        firstName: u.first_name,
        lastName: u.last_name,
        username: u.username,
        birthDate: u.birth_date,
        place: u.place,

        bio: u.bio,
        phone: sanitizeStoredPhone(u.phone),
        avatarUrl: u.avatar_url,
        avatarBorderUrl: Number(u.level ?? 1) >= 2 ? u.avatar_border_url : null,
        coverUrl: u.cover_url,
        coverPositionX: Number(u.cover_position_x ?? 50),
        coverPositionY: Number(u.cover_position_y ?? 50),
        coverScale: Number(u.cover_scale ?? 1),

        joinedDate: u.created_at,
        updatedAt: u.updated_at,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/* ================= UPDATE PROFILE ================= */

export async function PUT(req: Request): Promise<Response> {
  console.log("[PUT /api/auth/profile] Request received");
  const auth = await getAuthUser(req);
  if (!auth) {
    console.log("[PUT /api/auth/profile] Unauthorized - no auth user");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[PUT /api/auth/profile] Authenticated user:", auth.userId);
  await ensureUsersAvatarUrlLength(2000);
  await ensureUsersProfileCoverColumns();
  const hasAvatarBorderColumn = await hasColumn("users", "avatar_border_url");
  const hasLevelColumn = await hasColumn("users", "level");
  const hasCoverUrlColumn = await hasColumn("users", "cover_url");
  const hasCoverPositionXColumn = await hasColumn("users", "cover_position_x");
  const hasCoverPositionYColumn = await hasColumn("users", "cover_position_y");
  const hasCoverScaleColumn = await hasColumn("users", "cover_scale");

  const raw: unknown = await req.json().catch(() => ({}));
  const body: ProfileUpdateBody = isObject(raw) ? (raw as ProfileUpdateBody) : {};

  // profile fields
  const firstName = cleanStr(body.firstName, 60);
  const lastName = cleanStr(body.lastName, 60);
  const username = cleanStr(body.username, 50);
  const birthDate = cleanStr(body.birthDate, 30);
  const place = cleanStr(body.place, 120);
  const bio = cleanStr(body.bio, 255);
  const phone = normalizePhone(body.phone, 30);
  const avatarUrl = cleanStr(body.avatarUrl, 2000);
  const coverUrl = cleanStr(body.coverUrl, 2000);
  const avatarBorderUrl =
    hasAvatarBorderColumn && isObject(body) && hasOwn(body, "avatarBorderUrl")
      ? normalizeAvatarBorderUrl(body.avatarBorderUrl)
      : undefined;
  const coverPositionX =
    hasCoverPositionXColumn && isObject(body) && hasOwn(body, "coverPositionX")
      ? normalizeRangeNumber(body.coverPositionX, 0, 100, 50)
      : undefined;
  const coverPositionY =
    hasCoverPositionYColumn && isObject(body) && hasOwn(body, "coverPositionY")
      ? normalizeRangeNumber(body.coverPositionY, 0, 100, 50)
      : undefined;
  const coverScale =
    hasCoverScaleColumn && isObject(body) && hasOwn(body, "coverScale")
      ? normalizeRangeNumber(body.coverScale, 1, 3, 1)
      : undefined;

  if (hasAvatarBorderColumn && hasLevelColumn && avatarBorderUrl) {
    const [levelRows] = await db.query<RowDataPacket[]>(
      "SELECT level FROM users WHERE id = ? LIMIT 1",
      [auth.userId]
    );
    const currentLevel = Number(levelRows[0]?.level ?? 1);
    if (!Number.isFinite(currentLevel) || currentLevel < 2) {
      return Response.json(
        { error: "Avatar borders unlock at Level 2." },
        { status: 403 }
      );
    }
  }

  // optional email/password change fields
  const newEmail = cleanStr(body.newEmail, 255);
  const newPassword = cleanStr(body.newPassword, 255);
  const currentPassword = cleanStr(body.currentPassword, 255);

  let newPasswordHash: string | null = null;

  if (newEmail || newPassword) {
    if (!currentPassword) {
      return Response.json(
        { error: "Current password required to change email/password" },
        { status: 400 }
      );
    }

    const [pwRows] = await db.query<UserRow[]>(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      [auth.userId]
    );

    if (pwRows.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const ok = await bcrypt.compare(currentPassword, pwRows[0].password_hash ?? "");
    if (!ok) {
      return Response.json({ error: "Current password incorrect" }, { status: 401 });
    }

    if (newPassword) newPasswordHash = await bcrypt.hash(newPassword, 10);
  }

  // build dynamic update query
  const sets: string[] = [];
  const values: Array<string | number | null> = [];

  const add = (sql: string, val: string | null) => {
    if (val !== null && val !== undefined) {
      sets.push(sql);
      values.push(val);
    }
  };

  const addNullable = (sql: string, val: string | null | undefined) => {
    if (val !== undefined) {
      sets.push(sql);
      values.push(val);
    }
  };

  if (hasOwn(body, "username")) {
    if (!username) {
      return Response.json({ error: "Username is required" }, { status: 400 });
    }

    if (!isValidUsername(username)) {
      return Response.json(
        {
          error: "Username must be 3-30 characters and use only letters, numbers, dots, or underscores.",
        },
        { status: 400 }
      );
    }

    const [usernameRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
      [username, auth.userId]
    );
    if (usernameRows.length > 0) {
      return Response.json({ error: "Username already in use" }, { status: 409 });
    }
  }

  add("first_name = ?", firstName);
  add("last_name = ?", lastName);
  add("username = ?", username);
  add("birth_date = ?", birthDate);
  add("place = ?", place);
  add("bio = ?", bio);
  if (phone) {
    const [dupRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1",
      [phone, auth.userId]
    );
    if (dupRows.length > 0) {
      return Response.json(
        { error: "Phone number already in use" },
        { status: 409 }
      );
    }
  }

  add("phone = ?", phone);
  add("avatar_url = ?", avatarUrl);
  addNullable("avatar_border_url = ?", avatarBorderUrl);
  addNullable("cover_url = ?", hasCoverUrlColumn && hasOwn(body, "coverUrl") ? coverUrl : undefined);
  if (hasCoverPositionXColumn && coverPositionX !== undefined) {
    sets.push("cover_position_x = ?");
    values.push(coverPositionX);
  }
  if (hasCoverPositionYColumn && coverPositionY !== undefined) {
    sets.push("cover_position_y = ?");
    values.push(coverPositionY);
  }
  if (hasCoverScaleColumn && coverScale !== undefined) {
    sets.push("cover_scale = ?");
    values.push(coverScale);
  }

  add("email = ?", newEmail);
  add("password_hash = ?", newPasswordHash);

  if (sets.length === 0) {
    return Response.json({ success: true, message: "Nothing to update" });
  }

  sets.push("updated_at = NOW()");
  values.push(auth.userId);

  try {
    await db.query<ResultSetHeader>(
      `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
      values
    );

    try {
      if (newPassword) {
        await createSystemNotification({
          userId: auth.userId,
          category: "password_change",
          icon: "account",
          title: "Password changed",
          description: "Your account password was updated successfully.",
        });
      }

      if (newEmail) {
        await createSystemNotification({
          userId: auth.userId,
          category: "email_change",
          icon: "account",
          title: "Email updated",
          description: `Your account email was changed to ${newEmail}.`,
        });
      }
    } catch (notificationError) {
      console.error("PROFILE NOTIFICATION ERROR:", notificationError);
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      {
        error: "Update failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
