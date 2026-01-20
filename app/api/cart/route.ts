// app\api\cart\route.ts

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

type CartItemRow = RowDataPacket & {
  cart_item_id: number;
  product_id: number;
  title: string;
  slug: string;
  image_url: string | null;

  variant_id: number | null;
  qty: number;

  unit_price: number;   // may be string depending mysql2 config
  line_total: number;   // may be string depending mysql2 config

  duration_label: string | null;
  device_label: string | null;
  khqr: string | null;
  usdqr: string | null;
};

export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await db.query<CartItemRow[]>(
      `
      SELECT
        ci.id AS cart_item_id,
        p.id AS product_id,
        p.title,
        p.slug,
        p.image_url,
        ci.variant_id,
        ci.qty,
        ci.unit_price,
        (ci.qty * ci.unit_price) AS line_total,
        v.duration_label,
        v.device_label,
        v.khqr,
        v.usdqr
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN product_variants v ON v.id = ci.variant_id
      WHERE c.user_id = ? AND c.status='active'
      ORDER BY ci.id DESC
      `,
      [auth.userId]
    );

    // normalize numbers (safe even if already number)
    const items = rows.map((r) => ({
      ...r,
      cart_item_id: Number(r.cart_item_id),
      product_id: Number(r.product_id),
      variant_id: r.variant_id === null ? null : Number(r.variant_id),
      qty: Number(r.qty),
      unit_price: Number(r.unit_price),
      line_total: Number(r.line_total),
      khqr: typeof r.khqr === "string" ? r.khqr : null,
      usdqr: typeof r.usdqr === "string" ? r.usdqr : null,
    }));

    const subtotal = items.reduce((sum, r) => sum + r.line_total, 0);

    return Response.json({ items, subtotal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
