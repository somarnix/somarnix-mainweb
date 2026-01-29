import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

function makeOrderNumber(): string {
  return (
    String(Date.now()) +
    String(Math.floor(Math.random() * 1000)).padStart(3, "0")
  );
}

type CartIdRow = RowDataPacket & { id: number };

type CartItemRow = RowDataPacket & {
  product_id: number;
  variant_id: number | null;
  qty: number;
  unit_price: number; // may be string depending mysql2 settings
  original_price: number | null; // may be string depending mysql2 settings
};

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taxRate = 0.0;

  try {
    const body: unknown = await req.json().catch(() => ({}));
    const cartItemIdRaw =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).cartItemId
        : undefined;
    const cartItemId = Number(cartItemIdRaw);

    if (!Number.isFinite(cartItemId) || cartItemId <= 0) {
      return Response.json({ error: "cartItemId is required" }, { status: 400 });
    }

    // 1) get active cart
    const [cRows] = await db.query<CartIdRow[]>(
      "SELECT id FROM carts WHERE user_id=? AND status='active' LIMIT 1",
      [auth.userId]
    );

    if (cRows.length === 0) {
      return Response.json({ error: "Cart empty" }, { status: 400 });
    }

    const cartId = Number(cRows[0].id);

    // 2) get cart items
    const [items] = await db.query<CartItemRow[]>(
      `
      SELECT
        ci.product_id,
        ci.variant_id,
        ci.qty,
        ci.unit_price,
        pv.original_price
      FROM cart_items ci
      LEFT JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE ci.cart_id = ? AND ci.id = ?
      `,
      [cartId, cartItemId]
    );

    if (items.length === 0) {
      return Response.json({ error: "Cart item not found" }, { status: 404 });
    }

    // 3) totals
    const subtotal = items.reduce((sum, it) => {
      return sum + Number(it.qty) * Number(it.unit_price);
    }, 0);

    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    const orderNumber = makeOrderNumber();

    // 4) create order
    let orderId: number;
    let usedLegacyInsert = false;
    try {
      const [orderIns] = await db.query<ResultSetHeader>(
        `
        INSERT INTO orders (
          user_id,
          order_number,
          state,
          result,
          subtotal,
          tax_rate,
          tax_amount,
          total,
          total_amount
        )
        VALUES (?, ?, 'pending', 'none', ?, ?, ?, ?, ?)
        `,
        [auth.userId, orderNumber, subtotal, taxRate, taxAmount, total, total]
      );
      orderId = Number(orderIns.insertId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const needsLegacyInsert =
        message.includes("state") ||
        message.includes("total_amount") ||
        message.includes("result");
      if (!needsLegacyInsert) {
        throw err;
      }

      const [legacyIns] = await db.query<ResultSetHeader>(
        `
        INSERT INTO orders (user_id, order_number, status, subtotal, tax_rate, tax_amount, total)
        VALUES (?, ?, 'pending', ?, ?, ?, ?)
        `,
        [auth.userId, orderNumber, subtotal, taxRate, taxAmount, total]
      );
      orderId = Number(legacyIns.insertId);
      usedLegacyInsert = true;
    }

    // 5) create order items
    for (const it of items) {
      const unitPrice = Number(it.unit_price);
      const originalPrice =
        it.original_price === null ? unitPrice : Number(it.original_price);

      await db.query<ResultSetHeader>(
        `
        INSERT INTO order_items (order_id, product_id, variant_id, qty, unit_price, original_price)
        VALUES (?,?,?,?,?,?)
        `,
        [orderId, it.product_id, it.variant_id, it.qty, unitPrice, originalPrice]
      );
    }

    // 6) remove purchased cart item
    await db.query<ResultSetHeader>(
      "DELETE FROM cart_items WHERE id = ? AND cart_id = ?",
      [cartItemId, cartId]
    );

    return Response.json({
      success: true,
      orderId,
      orderNumber,
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: usedLegacyInsert ? "pending" : undefined,
      state: usedLegacyInsert ? undefined : "pending",
      result: usedLegacyInsert ? undefined : "none",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
