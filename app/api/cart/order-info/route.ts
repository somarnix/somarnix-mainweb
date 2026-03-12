import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type CartItemRow = RowDataPacket & {
  id: number;
  order_fields_json: string | null;
  order_info_json: string | null;
};

type OrderFieldDef = {
  key: string;
  required?: boolean;
};

function parseOrderFields(raw: string | null): OrderFieldDef[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const key = typeof (item as { key?: unknown }).key === "string"
          ? (item as { key: string }).key.trim()
          : "";
        if (!key) return null;
        return {
          key,
          required: (item as { required?: unknown }).required === true,
        };
      })
      .filter(Boolean) as OrderFieldDef[];
  } catch {
    return [];
  }
}

function parseOrderInfo(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const cartItemId = Number(b.cartItemId);
    const orderInfoRaw =
      typeof b.orderInfo === "object" && b.orderInfo !== null
        ? (b.orderInfo as Record<string, unknown>)
        : null;

    if (!Number.isFinite(cartItemId) || cartItemId <= 0) {
      return Response.json({ error: "Invalid cartItemId" }, { status: 400 });
    }
    if (!orderInfoRaw) {
      return Response.json({ error: "Invalid orderInfo" }, { status: 400 });
    }

    const [rows] = await db.query<CartItemRow[]>(
      `
      SELECT ci.id, p.order_fields_json, ci.order_info_json
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      JOIN products p ON p.id = ci.product_id
      WHERE ci.id = ? AND c.user_id = ? AND c.status = 'active'
      LIMIT 1
      `,
      [cartItemId, auth.userId]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Cart item not found" }, { status: 404 });
    }

    const defs = parseOrderFields(rows[0].order_fields_json);
    const existingInfo = parseOrderInfo(rows[0].order_info_json);
    const allowedKeys = new Set(defs.map((d) => d.key));
    const requiredKeys = defs.filter((d) => d.required).map((d) => d.key);

    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(orderInfoRaw)) {
      if (allowedKeys.size > 0 && !allowedKeys.has(key)) continue;
      if (value === null || value === undefined) continue;
      const text = String(value).trim();
      if (!text) continue;
      filtered[key] = text;
    }

    // Keep combo/system metadata keys untouched when user edits account/order fields.
    const preservedMeta: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(existingInfo)) {
      if (!key.startsWith("promotion_")) continue;
      preservedMeta[key] = value;
    }

    for (const key of requiredKeys) {
      if (!filtered[key]) {
        return Response.json({ error: `${key} is required` }, { status: 400 });
      }
    }

    const nextOrderInfo: Record<string, unknown> = {
      ...preservedMeta,
      ...filtered,
    };

    await db.query<ResultSetHeader>(
      `UPDATE cart_items SET order_info_json = ? WHERE id = ?`,
      [JSON.stringify(nextOrderInfo), cartItemId]
    );

    return Response.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
