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
  tool_variant_id: number | null;
  qty: number;
  unit_price: number;
  line_total: number;
  duration_label: string | null;
  device_label: string | null;
  khqr: string | null;
  usdqr: string | null;
};

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );
  return rows.length > 0;
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [variantCols] = await db.query<RowDataPacket[]>(
      `
      SELECT COLUMN_NAME
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'product_variants'
      `
    );
    const variantColSet = new Set(variantCols.map((c) => String(c.COLUMN_NAME)));
    const hasPvDeviceLabel = variantColSet.has("device_label");
    const pvDeviceLabelExpr = hasPvDeviceLabel ? "pv.device_label" : "NULL";
    const hasToolVariantIdColumn = await hasColumn("cart_items", "tool_variant_id");
    const toolVariantJoinRef = hasToolVariantIdColumn ? "ci.tool_variant_id" : "ci.variant_id";

    let rows: CartItemRow[] = [];
    try {
      const [data] = await db.query<CartItemRow[]>(
        `
        SELECT
          ci.id AS cart_item_id,
          p.id AS product_id,
          p.title,
          p.slug,
          p.image_url,
          ci.variant_id,
          ${hasToolVariantIdColumn ? "ci.tool_variant_id" : "NULL"} AS tool_variant_id,
          ci.qty,
          ci.unit_price,
          (ci.qty * ci.unit_price) AS line_total,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.duration_label ELSE pv.duration_label END AS duration_label,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.device_label ELSE ${pvDeviceLabelExpr} END AS device_label,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.khqr ELSE pv.khqr END AS khqr,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.usdqr ELSE pv.usdqr END AS usdqr
        FROM carts c
        JOIN cart_items ci ON ci.cart_id = c.id
        JOIN products p ON p.id = ci.product_id
        JOIN product_categories pc ON pc.id = p.category_id
        LEFT JOIN product_variants pv ON pv.id = ci.variant_id
        LEFT JOIN tool_variants tv ON tv.id = ${toolVariantJoinRef}
        WHERE c.user_id = ? AND c.status='active'
        ORDER BY ci.id DESC
        `,
        [auth.userId]
      );
      rows = data;
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      if (!message.includes("tool_variants")) {
        throw err;
      }
      const [data] = await db.query<CartItemRow[]>(
        `
        SELECT
          ci.id AS cart_item_id,
          p.id AS product_id,
          p.title,
          p.slug,
          p.image_url,
          ci.variant_id,
          ${hasToolVariantIdColumn ? "ci.tool_variant_id" : "NULL"} AS tool_variant_id,
          ci.qty,
          ci.unit_price,
          (ci.qty * ci.unit_price) AS line_total,
          v.duration_label,
          NULL AS device_label,
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
      rows = data;
    }

    const items = rows.map((r) => {
      const resolvedVariantId = r.tool_variant_id ?? r.variant_id;
      return {
        ...r,
        cart_item_id: Number(r.cart_item_id),
        product_id: Number(r.product_id),
        variant_id: resolvedVariantId === null ? null : Number(resolvedVariantId),
        tool_variant_id: r.tool_variant_id === null ? null : Number(r.tool_variant_id),
        qty: Number(r.qty),
        unit_price: Number(r.unit_price),
        line_total: Number(r.line_total),
        khqr: typeof r.khqr === "string" ? r.khqr : null,
        usdqr: typeof r.usdqr === "string" ? r.usdqr : null,
      };
    });

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
