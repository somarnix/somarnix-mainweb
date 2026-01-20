import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type PurchaseRow = RowDataPacket & {
  product_id: number;
  title: string;
  slug: string;
  image_url: string | null;
  order_number: string;
  ordered_at: string | Date | null;
  qty: number | string | null;
  unit_price: number | string | null;
  variant_label: string | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}Z`;
  }
  return trimmed;
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rows] = await db.query<PurchaseRow[]>(
      `
      SELECT
        p.id AS product_id,
        p.title,
        p.slug,
        p.image_url,
        o.order_number,
        o.created_at AS ordered_at,
        oi.qty,
        oi.unit_price,
        COALESCE(pv.duration_label, pv.device_label) AS variant_label
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.user_id = ? AND o.state = 'completed'
      ORDER BY o.created_at DESC, oi.id DESC
      `,
      [auth.userId]
    );

    const purchases = rows.map(row => ({
      productId: row.product_id,
      title: row.title,
      slug: row.slug,
      imageUrl: row.image_url,
      orderNumber: row.order_number,
      orderedAt: toDate(row.ordered_at),
      quantity: toNumber(row.qty),
      unitPrice: toNumber(row.unit_price),
      variantLabel: row.variant_label,
    }));

    return NextResponse.json({ products: purchases });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
