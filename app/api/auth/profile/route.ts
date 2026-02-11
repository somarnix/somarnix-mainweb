import bcrypt from "bcryptjs";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function cleanStr(v: unknown, max = 255): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
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

  newEmail?: unknown;
  newPassword?: unknown;
  currentPassword?: unknown;
};

/* ================= DB TYPES ================= */

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  role: "user" | "admin";

  first_name: string | null;
  last_name: string | null;
  username: string | null;
  birth_date: string | null;
  place: string | null;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;

  created_at: string | null;
  updated_at: string | null;

  password_hash: string | null;

  is_active: number;
  deleted_at: string | null;
}

/* ================= GET PROFILE ================= */

export async function GET(req: Request): Promise<Response> {
  const auth = await getAuthUser(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [rows] = await db.query<UserRow[]>(
    `SELECT
      id, email, role,
      first_name, last_name, username, birth_date, place, bio, phone, avatar_url,
      created_at, updated_at,
      is_active, deleted_at
     FROM users
     WHERE id = ? LIMIT 1`,
    [auth.userId]
  );

  if (rows.length === 0) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const u = rows[0];

  if (u.deleted_at) return Response.json({ error: "Account deleted" }, { status: 403 });
  if (u.is_active === 0)
    return Response.json({ error: "Account deactivated" }, { status: 403 });

  return Response.json({
    success: true,
    user: {
      id: u.id,
      email: u.email,
      role: u.role,

      firstName: u.first_name,
      lastName: u.last_name,
      username: u.username,
      birthDate: u.birth_date,
      place: u.place,

      bio: u.bio,
      phone: u.phone,
      avatarUrl: u.avatar_url,

      joinedDate: u.created_at,
      updatedAt: u.updated_at,
    },
  });
}

/* ================= UPDATE PROFILE ================= */

export async function PUT(req: Request): Promise<Response> {
  const auth = await getAuthUser(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw: unknown = await req.json().catch(() => ({}));
  const body: ProfileUpdateBody = isObject(raw) ? (raw as ProfileUpdateBody) : {};

  // profile fields
  const firstName = cleanStr(body.firstName, 80);
  const lastName = cleanStr(body.lastName, 80);
  const username = cleanStr(body.username, 50);
  const birthDate = cleanStr(body.birthDate, 30);
  const place = cleanStr(body.place, 120);
  const bio = cleanStr(body.bio, 500);
  const phone = normalizePhone(body.phone, 40);
  const avatarUrl = cleanStr(body.avatarUrl, 255);

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
  const values: Array<string | number> = [];

  const add = (sql: string, val: string | null) => {
    if (val !== null && val !== undefined) {
      sets.push(sql);
      values.push(val);
    }
  };

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
