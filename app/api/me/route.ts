import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

function getCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(name + "="));
  return hit ? hit.substring(name.length + 1) : null;
}

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  role: "user" | "admin";
  is_active: number;
  deleted_at: string | null;
}

export async function GET(req: Request): Promise<Response> {
  const cookie = req.headers.get("cookie") ?? "";
  const token = getCookie(cookie, "token");
  if (!token) return Response.json({ loggedIn: false }, { status: 401 });

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "dev_secret"
    ) as JwtPayload;

    const userId = Number(payload.userId);
    if (!userId) return Response.json({ loggedIn: false }, { status: 401 });

    const [rows] = await db.query<UserRow[]>(
      "SELECT id, email, role, is_active, deleted_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) return Response.json({ loggedIn: false }, { status: 401 });

    const u = rows[0];
    if (u.deleted_at) return Response.json({ loggedIn: false }, { status: 401 });
    if (u.is_active === 0) return Response.json({ loggedIn: false }, { status: 401 });

    return Response.json({
      loggedIn: true,
      user: { id: u.id, email: u.email, role: u.role },
    });
  } catch {
    return Response.json({ loggedIn: false }, { status: 401 });
  }
}
