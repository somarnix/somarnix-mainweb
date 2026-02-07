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
  order_info_json: string | null;
};

type ProductStockRow = RowDataPacket & {
  id: number;
  stock_qty: number | string | null;
  is_unlimited_stock: number | string | null;
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
        pv.original_price,
        ci.order_info_json
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

    // 4) validate stock and reserve (for limited stock)
    const qtyByProduct = new Map<number, number>();
    for (const it of items) {
      const pid = Number(it.product_id);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const nextQty = Number(it.qty ?? 0);
      qtyByProduct.set(pid, (qtyByProduct.get(pid) ?? 0) + nextQty);
    }

    const productIds = Array.from(qtyByProduct.keys());
    if (productIds.length > 0) {
      const [stockRows] = await db.query<ProductStockRow[]>(
        `
        SELECT id, stock_qty, is_unlimited_stock
        FROM products
        WHERE id IN (${productIds.map(() => "?").join(",")})
        `,
        productIds
      );

      for (const row of stockRows) {
        const isUnlimited = Number(row.is_unlimited_stock) === 1;
        if (isUnlimited) continue;
        const available = Number(row.stock_qty ?? 0);
        const need = qtyByProduct.get(Number(row.id)) ?? 0;
        if (available < need) {
          return Response.json(
            { error: "Not enough stock for one or more items" },
            { status: 400 }
          );
        }
      }

      for (const [pid, need] of qtyByProduct.entries()) {
        if (!Number.isFinite(need) || need <= 0) continue;
        await db.query<ResultSetHeader>(
          `
          UPDATE products
          SET stock_qty = GREATEST(0, stock_qty - ?)
          WHERE id = ? AND is_unlimited_stock = 0
          `,
          [need, pid]
        );
      }
    }

    // 5) create order
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
          total_amount,
          stock_reserved
        )
        VALUES (?, ?, 'pending', 'none', ?, ?, ?, ?, ?, 1)
        `,
        [auth.userId, orderNumber, subtotal, taxRate, taxAmount, total, total]
      );
      orderId = Number(orderIns.insertId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const needsLegacyInsert =
        message.includes("state") ||
        message.includes("total_amount") ||
        message.includes("result") ||
        message.includes("stock_reserved");
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
        INSERT INTO order_items (order_id, product_id, variant_id, qty, unit_price, original_price, order_info_json)
        VALUES (?,?,?,?,?,?,?)
        `,
        [
          orderId,
          it.product_id,
          it.variant_id,
          it.qty,
          unitPrice,
          originalPrice,
          it.order_info_json ?? null,
        ]
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
