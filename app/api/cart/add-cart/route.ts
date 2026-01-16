// app\api\cart\add - cart\route.ts

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type CartIdRow = RowDataPacket & { id: number };

type VariantRow = RowDataPacket & {
  id: number;
  product_id: number;
  price: number; // can be string depending mysql2 config
};

type CartItemExistRow = RowDataPacket & {
  id: number;
  qty: number;
};

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

    const b = body as Record<string, unknown>;

    const productId = Number(b.productId);
    const qty = Math.max(1, Number(b.qty ?? 1));

    if (!Number.isFinite(productId) || productId <= 0) {
      return Response.json({ error: "productId required" }, { status: 400 });
    }

    const variantIdRaw = b.variantId;
    let variantId: number | null =
      variantIdRaw === null || variantIdRaw === undefined
        ? null
        : Number(variantIdRaw);

    if (variantId !== null && (!Number.isFinite(variantId) || variantId <= 0)) {
      return Response.json({ error: "variantId invalid" }, { status: 400 });
    }

    // 1) find active cart
    const [cRows] = await db.query<CartIdRow[]>(
      "SELECT id FROM carts WHERE user_id = ? AND status='active' LIMIT 1",
      [auth.userId]
    );

    let cartId: number;

    if (cRows.length === 0) {
      const [ins] = await db.query<ResultSetHeader>(
        "INSERT INTO carts (user_id) VALUES (?)",
        [auth.userId]
      );
      cartId = Number(ins.insertId);
    } else {
      cartId = Number(cRows[0].id);
    }

    // 2) resolve variant
    let variant: VariantRow | null = null;

    if (variantId === null) {
      // Auto-pick cheapest active variant for this product
      const [vPick] = await db.query<VariantRow[]>(
        `
        SELECT id, product_id, price
        FROM product_variants
        WHERE product_id = ? AND is_active = 1
        ORDER BY price ASC
        LIMIT 1
        `,
        [productId]
      );

      if (vPick.length === 0) {
        return Response.json(
          { error: "No active variants for this product" },
          { status: 400 }
        );
      }

      variant = vPick[0];
      variantId = Number(variant.id);
    } else {
      // Validate requested variant
      const [vRows] = await db.query<VariantRow[]>(
        `
        SELECT id, product_id, price
        FROM product_variants
        WHERE id = ? AND is_active = 1
        LIMIT 1
        `,
        [variantId]
      );

      if (vRows.length === 0) {
        return Response.json({ error: "Variant not found" }, { status: 400 });
      }

      variant = vRows[0];
    }

    if (!variant) {
      return Response.json({ error: "Variant resolve failed" }, { status: 400 });
    }

    if (Number(variant.product_id) !== productId) {
      return Response.json(
        { error: "Variant not belong to product" },
        { status: 400 }
      );
    }

    const unitPrice = Number(variant.price);

    // 3) If same item exists → increase qty
    const [exist] = await db.query<CartItemExistRow[]>(
      `
      SELECT id, qty
      FROM cart_items
      WHERE cart_id=? AND product_id=? AND variant_id=?
      LIMIT 1
      `,
      [cartId, productId, variantId]
    );

    if (exist.length > 0) {
      await db.query<ResultSetHeader>(
        "UPDATE cart_items SET qty = qty + ? WHERE id = ?",
        [qty, exist[0].id]
      );
    } else {
      await db.query<ResultSetHeader>(
        `
        INSERT INTO cart_items (cart_id, product_id, variant_id, qty, unit_price)
        VALUES (?,?,?,?,?)
        `,
        [cartId, productId, variantId, qty, unitPrice]
      );
    }

    return Response.json({
      success: true,
      cartId,
      productId,
      variantId,
      qtyAdded: qty,
      unitPrice,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
