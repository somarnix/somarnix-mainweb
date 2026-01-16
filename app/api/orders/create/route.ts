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

  const taxRate = 10.0; // UI says 10%

  try {
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
      WHERE ci.cart_id = ?
      `,
      [cartId]
    );

    if (items.length === 0) {
      return Response.json({ error: "Cart empty" }, { status: 400 });
    }

    // 3) totals
    const subtotal = items.reduce((sum, it) => {
      return sum + Number(it.qty) * Number(it.unit_price);
    }, 0);

    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    const orderNumber = makeOrderNumber();

    // 4) create order
    const [orderIns] = await db.query<ResultSetHeader>(
      `
      INSERT INTO orders (user_id, order_number, status, subtotal, tax_rate, tax_amount, total)
      VALUES (?, ?, 'pending', ?, ?, ?, ?)
      `,
      [auth.userId, orderNumber, subtotal, taxRate, taxAmount, total]
    );

    const orderId = Number(orderIns.insertId);

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

    // 6) mark cart converted (locked)
    await db.query<ResultSetHeader>(
      "UPDATE carts SET status='converted' WHERE id=?",
      [cartId]
    );

    return Response.json({
      success: true,
      orderId,
      orderNumber,
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: "pending",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
