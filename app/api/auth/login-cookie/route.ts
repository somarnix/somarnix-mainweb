import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string | null;
  role: string;
  is_active: number; // usually 0/1
  deleted_at: string | null;
}

interface LoginBody {
  email: string;
  password: string;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.json().catch(() => null);
    const body: Partial<LoginBody> =
      raw && typeof raw === "object" ? (raw as LoginBody) : {};

    const email = normalizeString(body.email);
    const password = normalizeString(body.password);

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const [rows] = await db.query<UserRow[]>(
      "SELECT id, email, password_hash, role, is_active, deleted_at FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Invalid login" }, { status: 401 });
    }

    const user = rows[0];

    if (user.deleted_at) {
      return Response.json({ error: "Account deleted" }, { status: 403 });
    }

    if (user.is_active === 0) {
      return Response.json({ error: "Account deactivated" }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, user.password_hash ?? "");
    if (!ok) {
      return Response.json({ error: "Invalid login" }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET ?? "dev_secret",
      { expiresIn: "7d" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: user.id, email: user.email, role: user.role },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // httpOnly cookie (safe)
          "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
            7 * 24 * 60 * 60
          }`,
        },
      }
    );
  } catch (err) {
    return Response.json(
      {
        error: "Server error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
