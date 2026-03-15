import jwt, { JwtPayload } from "jsonwebtoken";
import type { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { clearSessionCookie, getJwtSecret } from "@/lib/security";

/* ================= COOKIE HELPER ================= */

function getCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(name + "="));
  return hit ? hit.substring(name.length + 1) : null;
}

async function getUserIdFromCookie(req: Request): Promise<number | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const token = getCookie(cookie, "token");
  if (!token) return null;

  try {
    const jwtSecret = getJwtSecret();
    const payload = jwt.verify(
      token,
      jwtSecret
    ) as JwtPayload;

    const userId = Number(payload.userId);
    return userId || null;
  } catch {
    return null;
  }
}

/* ================= DELETE ACCOUNT (SOFT DELETE) ================= */

export async function POST(req: Request): Promise<Response> {
  const userId = await getUserIdFromCookie(req);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // mark account deleted forever (soft delete)
    await db.query<ResultSetHeader>(
      `UPDATE users
       SET deleted_at = NOW(), is_active = 0, updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    // clear cookie token too
    const res = Response.json({ success: true });
    res.headers.append(
      "Set-Cookie",
      clearSessionCookie()
    );
    return res;
  } catch (err) {
    return Response.json(
      {
        error: "Delete account failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
