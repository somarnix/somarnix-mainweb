// app\api\cart\remove - cart\route.ts

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type CartItemOwnerRow = RowDataPacket & { id: number };

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const cartItemId = (body as Record<string, unknown>).cartItemId;
    const id = Number(cartItemId);

    if (!Number.isFinite(id) || id === 0) {
      return Response.json({ error: "cartItemId required" }, { status: 400 });
    }

    if (id < 0) {
      const courseCartItemId = Math.abs(Math.floor(id));
      const [courseRows] = await db.query<CartItemOwnerRow[]>(
        `
        SELECT id
        FROM video_course_cart_items
        WHERE id = ? AND user_id = ?
        LIMIT 1
        `,
        [courseCartItemId, auth.userId]
      );
      if (courseRows.length === 0) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      await db.query<ResultSetHeader>(
        "DELETE FROM video_course_cart_items WHERE id = ? AND user_id = ?",
        [courseCartItemId, auth.userId]
      );
      return Response.json({ success: true });
    }

    // ensure belongs to this user
    const [rows] = await db.query<CartItemOwnerRow[]>(
      `
      SELECT ci.id
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      WHERE ci.id = ? AND c.user_id = ? AND c.status='active'
      LIMIT 1
      `,
      [id, auth.userId]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    await db.query<ResultSetHeader>(
      "DELETE FROM cart_items WHERE id = ?",
      [id]
    );

    return Response.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
