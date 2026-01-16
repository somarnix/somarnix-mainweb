import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

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

    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        id,
        email,
        role,
        is_active,
        created_at
      FROM users
      ORDER BY created_at DESC
      `
    );

    return Response.json({
      users: rows ?? [],
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
    };

    if (
      !Number.isFinite(userId) ||
      (role !== "user" && role !== "admin")
    ) {
      return Response.json(
        { error: "Invalid userId or role" },
        { status: 400 }
      );
    }

    /* Prevent admin demoting self (optional but recommended) */
    if (auth.userId === userId) {
      return Response.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    const [result] = await db.query<ResultSetHeader>(
      `UPDATE users SET role = ? WHERE id = ?`,
      [role, userId]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
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
