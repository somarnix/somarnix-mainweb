// app\api\admin\categories\route.ts
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ categories: [], error: "Forbidden" }, { status: 403 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, name FROM product_categories ORDER BY name ASC`
    );

    return Response.json({ categories: rows ?? [] });
  } catch (err) {
    console.error("ADMIN CATEGORIES ERROR:", err);
    return Response.json({ categories: [], error: "Server error" }, { status: 500 });
  }
}
