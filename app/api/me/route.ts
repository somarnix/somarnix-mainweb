import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  role: "user" | "admin";
};

export async function GET(req: Request): Promise<Response> {
  const auth = await getAuthUser(req);
  if (!auth) {
    return Response.json(
      { loggedIn: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const [rows] = await db.query<UserRow[]>(
    `
    SELECT id, email, role
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [auth.userId]
  );

  if (rows.length === 0) {
    return Response.json(
      { loggedIn: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const u = rows[0];
  return Response.json(
    {
      loggedIn: true,
      user: { id: u.id, email: u.email, role: u.role },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
