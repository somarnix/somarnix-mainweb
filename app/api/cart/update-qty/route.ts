import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductCartRow = RowDataPacket & {
  id: number;
  qty: number;
  stock_qty: number | null;
  is_unlimited_stock: number | null;
  category_name: string;
  product_mode: "license" | "inventory";
  units_per_qty: number;
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

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const payload =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

    const cartItemId = Number(payload.cartItemId);
    const qtyRaw = Number(payload.qty);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : NaN;

    if (!Number.isFinite(cartItemId) || cartItemId === 0) {
      return Response.json({ error: "cartItemId is required" }, { status: 400 });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return Response.json({ error: "qty must be greater than 0" }, { status: 400 });
    }

    if (cartItemId < 0) {
      return Response.json(
        { error: "Video course quantity is fixed at 1" },
        { status: 400 }
      );
    }

    const hasProductsMode = await hasColumn("products", "mode");
    const hasVariantUnitsPerQty = await hasColumn("product_variants", "units_per_qty");
    const productModeExpr = hasProductsMode
      ? "CASE WHEN p.mode IN ('license','inventory') THEN p.mode ELSE 'inventory' END"
      : "'inventory'";
    const unitsPerQtyExpr = hasVariantUnitsPerQty
      ? "CASE WHEN LOWER(pc.name) = 'tools' THEN 1 ELSE GREATEST(1, COALESCE(pv.units_per_qty, 1)) END"
      : "1";

    const [rows] = await db.query<ProductCartRow[]>(
      `
      SELECT
        ci.id,
        ci.qty,
        p.stock_qty,
        p.is_unlimited_stock,
        pc.name AS category_name,
        ${productModeExpr} AS product_mode,
        ${unitsPerQtyExpr} AS units_per_qty
      FROM cart_items ci
      JOIN carts c ON c.id = ci.cart_id
      JOIN products p ON p.id = ci.product_id
      JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE ci.id = ?
        AND c.user_id = ?
        AND c.status = 'active'
      LIMIT 1
      `,
      [cartItemId, auth.userId]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Cart item not found" }, { status: 404 });
    }

    const item = rows[0];
    if (String(item.product_mode) === "license") {
      return Response.json(
        { error: "This item only supports quantity 1" },
        { status: 400 }
      );
    }

    const isUnlimitedStock = Number(item.is_unlimited_stock ?? 0) === 1;
    if (!isUnlimitedStock) {
      const availableUnits = Math.max(0, Number(item.stock_qty ?? 0));
      const unitsPerQty = Math.max(1, Math.floor(Number(item.units_per_qty ?? 1)));
      const requiredUnits = qty * unitsPerQty;
      if (requiredUnits > availableUnits) {
        return Response.json(
          {
            error: `Not enough stock for selected quantity (needs ${requiredUnits}, available ${availableUnits})`,
          },
          { status: 400 }
        );
      }
    }

    await db.query<ResultSetHeader>(
      `
      UPDATE cart_items
      SET qty = ?
      WHERE id = ?
      `,
      [qty, cartItemId]
    );

    return Response.json({ success: true, cartItemId, qty });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
