import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type CartIdRow = RowDataPacket & { id: number };

type VariantRow = RowDataPacket & {
  id: number;
  product_id: number;
  price: number;
};

type ProductCategoryRow = RowDataPacket & {
  category_name: string;
};

type CartItemExistRow = RowDataPacket & {
  id: number;
  qty: number;
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

    let orderInfoJson: string | null = null;
    if ("orderInfo" in b) {
      const info = b.orderInfo;
      if (info && typeof info === "object") {
        try {
          orderInfoJson = JSON.stringify(info);
        } catch {
          return Response.json({ error: "Invalid orderInfo" }, { status: 400 });
        }
      }
    }

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

    const [productRows] = await db.query<ProductCategoryRow[]>(
      `
      SELECT c.name AS category_name
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [productId]
    );
    if (productRows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const isTool = String(productRows[0].category_name || "").toLowerCase() === "tools";
    const variantTable = isTool ? "tool_variants" : "product_variants";
    const hasToolVariantIdColumn = await hasColumn("cart_items", "tool_variant_id");

    if (isTool && !hasToolVariantIdColumn) {
      return Response.json(
        {
          error: "Tool cart schema is missing",
          detail: "Please add cart_items.tool_variant_id column",
        },
        { status: 500 }
      );
    }

    let variant: VariantRow | null = null;

    if (variantId === null) {
      const [vPick] = await db.query<VariantRow[]>(
        `
        SELECT id, product_id, price
        FROM ${variantTable}
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
      const [vRows] = await db.query<VariantRow[]>(
        `
        SELECT id, product_id, price
        FROM ${variantTable}
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
    const productVariantIdForCart = isTool ? null : variantId;
    const toolVariantIdForCart = isTool ? variantId : null;

    const [exist] = await db.query<CartItemExistRow[]>(
      isTool
        ? `
          SELECT id, qty
          FROM cart_items
          WHERE cart_id=? AND product_id=? AND tool_variant_id=? AND variant_id IS NULL
          LIMIT 1
          `
        : `
          SELECT id, qty
          FROM cart_items
          WHERE cart_id=? AND product_id=? AND variant_id=?
          LIMIT 1
          `,
      [cartId, productId, isTool ? toolVariantIdForCart : productVariantIdForCart]
    );

    if (exist.length > 0) {
      await db.query<ResultSetHeader>(
        "UPDATE cart_items SET qty = qty + ?, order_info_json = COALESCE(?, order_info_json) WHERE id = ?",
        [qty, orderInfoJson, exist[0].id]
      );
    } else if (isTool) {
      await db.query<ResultSetHeader>(
        `
        INSERT INTO cart_items (cart_id, product_id, variant_id, tool_variant_id, qty, unit_price, order_info_json)
        VALUES (?, ?, NULL, ?, ?, ?, ?)
        `,
        [cartId, productId, toolVariantIdForCart, qty, unitPrice, orderInfoJson]
      );
    } else {
      await db.query<ResultSetHeader>(
        `
        INSERT INTO cart_items (cart_id, product_id, variant_id, qty, unit_price, order_info_json)
        VALUES (?,?,?,?,?,?)
        `,
        [cartId, productId, productVariantIdForCart, qty, unitPrice, orderInfoJson]
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
