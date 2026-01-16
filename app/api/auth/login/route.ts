import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  is_active: number;
  deleted_at: string | null;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { email, password }: LoginBody = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password required" },
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

    // JWT valid for 7 days
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET ?? "dev_secret",
      { expiresIn: "7d" }
    );

    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
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
