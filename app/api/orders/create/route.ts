import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getOrderTelegramContext } from "@/lib/payment-review";
import { sendTelegramOrderCreatedNotification } from "@/lib/telegram";
import { buildTelegramSupportDeepLink } from "@/lib/telegram-support";
import type { PoolConnection } from "mysql2/promise";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

function makeOrderNumber(): string {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, "0");
}

type Queryable = Pick<PoolConnection, "query">;

type CartIdRow = RowDataPacket & { id: number };

type CartItemRow = RowDataPacket & {
  cart_item_id: number;
  product_id: number;
  category_name: string;
  product_mode: "license" | "inventory";
  variant_id: number | null;
  tool_variant_id: number | null;
  qty: number;
  units_per_qty: number;
  unit_price: number;
  original_price: number | null;
  order_info_json: string | null;
};

type ProductStockRow = RowDataPacket & {
  id: number;
  stock_qty: number | string | null;
  is_unlimited_stock: number | string | null;
};

type CoursePlanRow = RowDataPacket & {
  id: number;
  course_id: number;
  access_type: "lifetime" | "months";
  duration_days: number | null;
};

type CourseCartItemRow = RowDataPacket & {
  course_cart_item_id: number;
  course_id: number;
  plan_id: number;
  qty: number;
  unit_price: number | string;
  access_type: "lifetime" | "months";
  duration_days: number | null;
};

type PromotionComboRow = RowDataPacket & {
  id: number;
  price: number | string;
};

type PromotionCourseSpec = {
  courseId: number;
  planId: number;
  qty: number;
};

function parseJsonObject(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function extractPromotionCourseSpecs(items: CartItemRow[]): PromotionCourseSpec[] {
  const aggregated = new Map<string, PromotionCourseSpec>();
  const seenComboKeys = new Set<string>();

  for (const item of items) {
    const info = parseJsonObject(item.order_info_json);
    const comboIdRaw = info.promotion_combo_id;
    const comboId =
      comboIdRaw === null || comboIdRaw === undefined ? "" : String(comboIdRaw).trim();
    const scopeKey = comboId || `item:${item.cart_item_id}`;
    if (seenComboKeys.has(scopeKey)) continue;
    seenComboKeys.add(scopeKey);

    const raw = info.promotion_course_items;
    if (!Array.isArray(raw)) continue;

    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const courseId = Number(r.course_id);
      const planId = Number(r.plan_id);
      const qtyRaw = Number(r.qty ?? 1);
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
      if (!Number.isFinite(courseId) || courseId <= 0) continue;
      if (!Number.isFinite(planId) || planId <= 0) continue;

      const key = `${courseId}:${planId}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.qty += qty;
      } else {
        aggregated.set(key, { courseId: Math.floor(courseId), planId: Math.floor(planId), qty });
      }
    }
  }

  return Array.from(aggregated.values());
}

function extractComboPrice(items: CartItemRow[]): number | null {
  if (items.length === 0) return null;
  let comboId: string | null = null;
  let comboPrice: number | null = null;
  for (const item of items) {
    const info = parseJsonObject(item.order_info_json);
    const rawId = info.promotion_combo_id;
    const id = rawId === null || rawId === undefined ? "" : String(rawId).trim();
    if (!id) return null;
    const rawPrice = Number(info.promotion_combo_price);
    if (!Number.isFinite(rawPrice) || rawPrice < 0) return null;
    if (comboId === null) comboId = id;
    if (comboPrice === null) comboPrice = rawPrice;
    if (comboId !== id) return null;
    if (Math.abs(comboPrice - rawPrice) > 0.000001) return null;
  }
  return comboPrice;
}

function extractComboId(items: CartItemRow[]): number | null {
  if (items.length === 0) return null;
  let comboId: number | null = null;
  for (const item of items) {
    const info = parseJsonObject(item.order_info_json);
    const rawId = Number(info.promotion_combo_id);
    if (!Number.isFinite(rawId) || rawId <= 0) return null;
    const nextId = Math.floor(rawId);
    if (comboId === null) comboId = nextId;
    if (comboId !== nextId) return null;
  }
  return comboId;
}

async function resolveCurrentComboPrice(conn: Queryable, items: CartItemRow[]): Promise<number | null> {
  const comboId = extractComboId(items);
  if (!comboId) return null;

  const [rows] = await conn.query<PromotionComboRow[]>(
    `
    SELECT id, price
    FROM promotion_combos
    WHERE id = ? AND is_active = 1
    LIMIT 1
    `,
    [comboId]
  );

  if (rows.length === 0) return null;
  const price = Number(rows[0].price);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function groupItemsByPricingScope(items: CartItemRow[]): CartItemRow[][] {
  const grouped = new Map<string, CartItemRow[]>();
  for (const item of items) {
    const info = parseJsonObject(item.order_info_json);
    const comboIdRaw = info.promotion_combo_id;
    const comboId =
      comboIdRaw === null || comboIdRaw === undefined ? "" : String(comboIdRaw).trim();
    const key = comboId ? `combo:${comboId}` : `item:${item.cart_item_id}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }
  return Array.from(grouped.values());
}

async function resolveEffectiveProductSubtotal(conn: Queryable, items: CartItemRow[]): Promise<number> {
  const groupedItems = groupItemsByPricingScope(items);
  let subtotal = 0;
  for (const group of groupedItems) {
    const rawSubtotal = group.reduce((sum, item) => sum + Number(item.qty) * Number(item.unit_price), 0);
    const comboSubtotal =
      (await resolveCurrentComboPrice(conn, group)) ?? extractComboPrice(group);
    subtotal += comboSubtotal ?? rawSubtotal;
  }
  return subtotal;
}

async function hasColumn(conn: Queryable, tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await conn.query<RowDataPacket[]>(
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

async function hasTable(conn: Queryable, tableName: string): Promise<boolean> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ?
    LIMIT 1
    `,
    [tableName]
  );
  return rows.length > 0;
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taxRate = 0.0;
  const conn = await db.getConnection();

  try {
    const body: unknown = await req.json().catch(() => ({}));
    const rawCartItemId =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).cartItemId
        : undefined;
    const rawCartItemIds =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).cartItemIds
        : undefined;
    const singleCartItemId = Number(rawCartItemId);
    const cartItemIds = Array.isArray(rawCartItemIds)
      ? rawCartItemIds
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v) && v !== 0)
          .map((v) => Math.floor(v))
      : Number.isFinite(singleCartItemId) && singleCartItemId !== 0
        ? [Math.floor(singleCartItemId)]
        : [];

    if (cartItemIds.length === 0) {
      return Response.json({ error: "cartItemId or cartItemIds is required" }, { status: 400 });
    }
    const productCartItemIds = cartItemIds.filter((id) => id > 0);
    const courseCartItemIds = cartItemIds.filter((id) => id < 0).map((id) => Math.abs(id));

    await conn.beginTransaction();

    const hasCartToolVariantId = await hasColumn(conn, "cart_items", "tool_variant_id");
    const hasOrderToolVariantId = await hasColumn(conn, "order_items", "tool_variant_id");
    const hasProductsMode = await hasColumn(conn, "products", "mode");
    const hasVariantUnitsPerQty = await hasColumn(conn, "product_variants", "units_per_qty");
    const hasOrderUnitsPerQty = await hasColumn(conn, "order_items", "units_per_qty");
    const productModeExpr = hasProductsMode
      ? "CASE WHEN p.mode IN ('license','inventory') THEN p.mode ELSE 'inventory' END"
      : "'inventory'";
    const unitsPerQtyExpr = hasVariantUnitsPerQty
      ? "CASE WHEN LOWER(pc.name) = 'tools' THEN 1 ELSE GREATEST(1, COALESCE(pv.units_per_qty, 1)) END"
      : "1";

    let cartId: number | null = null;
    let items: CartItemRow[] = [];
    if (productCartItemIds.length > 0) {
      const [cRows] = await conn.query<CartIdRow[]>(
        "SELECT id FROM carts WHERE user_id=? AND status='active' LIMIT 1",
        [auth.userId]
      );
      if (cRows.length === 0) {
        await conn.rollback();
        return Response.json({ error: "Cart empty" }, { status: 400 });
      }
      cartId = Number(cRows[0].id);

      const [productItems] = await conn.query<CartItemRow[]>(
        `
        SELECT
          ci.id AS cart_item_id,
          ci.product_id,
          pc.name AS category_name,
          ${productModeExpr} AS product_mode,
          ci.variant_id,
          ${hasCartToolVariantId ? "ci.tool_variant_id" : "NULL"} AS tool_variant_id,
          ci.qty,
          ${unitsPerQtyExpr} AS units_per_qty,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.price ELSE pv.price END AS unit_price,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.original_price ELSE pv.original_price END AS original_price,
          ci.order_info_json
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        JOIN product_categories pc ON pc.id = p.category_id
        LEFT JOIN product_variants pv ON pv.id = ci.variant_id
        LEFT JOIN tool_variants tv ON tv.id = ${hasCartToolVariantId ? "ci.tool_variant_id" : "ci.variant_id"}
        WHERE ci.cart_id = ? AND ci.id IN (${productCartItemIds.map(() => "?").join(",")})
        FOR UPDATE
        `,
        [cartId, ...productCartItemIds]
      );
      items = productItems;
      if (items.length !== productCartItemIds.length) {
        await conn.rollback();
        return Response.json({ error: "One or more cart items not found" }, { status: 404 });
      }
    }

    let courseCartItems: CourseCartItemRow[] = [];
    if (courseCartItemIds.length > 0) {
      const hasVideoCourseCartTable = await hasTable(conn, "video_course_cart_items");
      if (!hasVideoCourseCartTable) {
        await conn.rollback();
        return Response.json({ error: "Video course cart table is missing" }, { status: 500 });
      }
      const [rows] = await conn.query<CourseCartItemRow[]>(
        `
        SELECT
          vci.id AS course_cart_item_id,
          vci.course_id,
          vci.plan_id,
          vci.qty,
          vplan.price AS unit_price,
          vplan.access_type,
          vplan.duration_days
        FROM video_course_cart_items vci
        JOIN video_course_plans vplan ON vplan.id = vci.plan_id
        JOIN video_courses vc ON vc.id = vci.course_id
        WHERE vci.user_id = ?
          AND vci.id IN (${courseCartItemIds.map(() => "?").join(",")})
          AND vplan.is_active = 1
          AND vc.is_active = 1
        FOR UPDATE
        `,
        [auth.userId, ...courseCartItemIds]
      );
      courseCartItems = rows;
      if (courseCartItems.length !== courseCartItemIds.length) {
        await conn.rollback();
        return Response.json({ error: "One or more course cart items not found" }, { status: 404 });
      }
    }

    if (items.length === 0 && courseCartItems.length === 0) {
      await conn.rollback();
      return Response.json({ error: "Cart item not found" }, { status: 404 });
    }

    const productSubtotal = await resolveEffectiveProductSubtotal(conn, items);
    const courseSubtotal = courseCartItems.reduce(
      (sum, it) => sum + Number(it.unit_price ?? 0),
      0
    );
    const subtotal = productSubtotal + courseSubtotal;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    const orderNumber = makeOrderNumber();

    const qtyByProduct = new Map<number, number>();
    for (const it of items) {
      if (String(it.product_mode) === "license" && Number(it.qty) !== 1) {
        await conn.rollback();
        return Response.json(
          { error: "License products only allow qty = 1 per order item" },
          { status: 400 }
        );
      }
      if (String(it.product_mode) !== "inventory") continue;
      const pid = Number(it.product_id);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const qty = Number(it.qty ?? 0);
      const unitsPerQty = Math.max(1, Math.floor(Number(it.units_per_qty ?? 1)));
      const needUnits = qty * unitsPerQty;
      qtyByProduct.set(pid, (qtyByProduct.get(pid) ?? 0) + needUnits);
    }

    const productIds = Array.from(qtyByProduct.keys());
    if (productIds.length > 0) {
      const [stockRows] = await conn.query<ProductStockRow[]>(
        `
        SELECT id, stock_qty, is_unlimited_stock
        FROM products
        WHERE id IN (${productIds.map(() => "?").join(",")})
        FOR UPDATE
        `,
        productIds
      );

      for (const row of stockRows) {
        const isUnlimited = Number(row.is_unlimited_stock) === 1;
        if (isUnlimited) continue;
        const available = Number(row.stock_qty ?? 0);
        const need = qtyByProduct.get(Number(row.id)) ?? 0;
        if (available < need) {
          await conn.rollback();
          return Response.json({ error: "Not enough stock for one or more items" }, { status: 400 });
        }
      }

      for (const [pid, need] of qtyByProduct.entries()) {
        if (!Number.isFinite(need) || need <= 0) continue;
        await conn.query<ResultSetHeader>(
          `
          UPDATE products
          SET stock_qty = GREATEST(0, stock_qty - ?)
          WHERE id = ? AND is_unlimited_stock = 0
          `,
          [need, pid]
        );
      }
    }

    let orderId: number;
    let usedLegacyInsert = false;
    try {
      const [orderIns] = await conn.query<ResultSetHeader>(
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

      const [legacyIns] = await conn.query<ResultSetHeader>(
        `
        INSERT INTO orders (user_id, order_number, status, subtotal, tax_rate, tax_amount, total)
        VALUES (?, ?, 'pending', ?, ?, ?, ?)
        `,
        [auth.userId, orderNumber, subtotal, taxRate, taxAmount, total]
      );
      orderId = Number(legacyIns.insertId);
      usedLegacyInsert = true;
    }

    for (const it of items) {
      const unitPrice = Number(it.unit_price);
      const originalPrice = it.original_price === null ? unitPrice : Number(it.original_price);
      const unitsPerQty = Math.max(1, Math.floor(Number(it.units_per_qty ?? 1)));

      if (hasOrderToolVariantId) {
        await conn.query<ResultSetHeader>(
          `
          INSERT INTO order_items (
            order_id, product_id, variant_id, tool_variant_id, qty, unit_price, original_price, order_info_json
            ${hasOrderUnitsPerQty ? ", units_per_qty" : ""}
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?${hasOrderUnitsPerQty ? ", ?" : ""})
          `,
          [
            orderId,
            it.product_id,
            it.variant_id,
            it.tool_variant_id,
            it.qty,
            unitPrice,
            originalPrice,
            it.order_info_json ?? null,
            ...(hasOrderUnitsPerQty ? [unitsPerQty] : []),
          ]
        );
      } else {
        await conn.query<ResultSetHeader>(
          `
          INSERT INTO order_items (
            order_id, product_id, variant_id, qty, unit_price, original_price, order_info_json
            ${hasOrderUnitsPerQty ? ", units_per_qty" : ""}
          )
          VALUES (?, ?, ?, ?, ?, ?, ?${hasOrderUnitsPerQty ? ", ?" : ""})
          `,
          [
            orderId,
            it.product_id,
            it.variant_id,
            it.qty,
            unitPrice,
            originalPrice,
            it.order_info_json ?? null,
            ...(hasOrderUnitsPerQty ? [unitsPerQty] : []),
          ]
        );
      }
    }

    const courseSpecs = extractPromotionCourseSpecs(items);
    if (courseSpecs.length > 0) {
      const planIds = Array.from(new Set(courseSpecs.map((s) => s.planId)));
      const [planRows] = await conn.query<CoursePlanRow[]>(
        `
        SELECT id, course_id, access_type, duration_days
        FROM video_course_plans
        WHERE id IN (${planIds.map(() => "?").join(",")}) AND is_active = 1
        `,
        planIds
      );
      const planMap = new Map<number, CoursePlanRow>();
      for (const row of planRows) {
        planMap.set(Number(row.id), row);
      }

      const accessStart = new Date();
      for (const spec of courseSpecs) {
        const plan = planMap.get(spec.planId);
        if (!plan) {
          await conn.rollback();
          return Response.json(
            { error: `Course plan ${spec.planId} is not available` },
            { status: 400 }
          );
        }
        if (Number(plan.course_id) !== spec.courseId) {
          await conn.rollback();
          return Response.json(
            { error: `Invalid promotion course mapping for plan ${spec.planId}` },
            { status: 400 }
          );
        }

        for (let i = 0; i < Math.max(1, spec.qty); i += 1) {
          const accessEnd =
            plan.access_type === "months" && plan.duration_days
              ? new Date(accessStart.getTime() + Number(plan.duration_days) * 24 * 60 * 60 * 1000)
              : null;

          await conn.query<ResultSetHeader>(
            `
            INSERT INTO video_course_purchases (
              order_id,
              user_id,
              course_id,
              plan_id,
              access_start,
              access_end,
              status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
            `,
            [orderId, auth.userId, spec.courseId, spec.planId, accessStart, accessEnd]
          );
        }
      }
    }

    // Standalone video-course cart items
    for (const ci of courseCartItems) {
      const accessStart = new Date();
      const duration = Number(ci.duration_days ?? 0);
      const accessEnd =
        ci.access_type === "months" && Number.isFinite(duration) && duration > 0
          ? new Date(accessStart.getTime() + duration * 24 * 60 * 60 * 1000)
          : null;

      for (let i = 0; i < Math.max(1, Number(ci.qty ?? 1)); i += 1) {
        await conn.query<ResultSetHeader>(
          `
          INSERT INTO video_course_purchases (
            order_id,
            user_id,
            course_id,
            plan_id,
            access_start,
            access_end,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
          `,
          [orderId, auth.userId, ci.course_id, ci.plan_id, accessStart, accessEnd]
        );
      }
    }

    try {
      await conn.query<ResultSetHeader>(
        `UPDATE orders SET payment_state = 'waiting' WHERE id = ?`,
        [orderId]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      if (!(message.includes("unknown column") && message.includes("payment_state"))) {
        throw err;
      }
    }

    if (items.length > 0 && cartId !== null) {
      await conn.query<ResultSetHeader>(
        `DELETE FROM cart_items WHERE cart_id = ? AND id IN (${productCartItemIds.map(() => "?").join(",")})`,
        [cartId, ...productCartItemIds]
      );
    }
    if (courseCartItems.length > 0) {
      await conn.query<ResultSetHeader>(
        `DELETE FROM video_course_cart_items WHERE user_id = ? AND id IN (${courseCartItemIds.map(() => "?").join(",")})`,
        [auth.userId, ...courseCartItemIds]
      );
    }

    await conn.commit();

    try {
      const orderContext = await getOrderTelegramContext(orderId);
      if (orderContext) {
        await sendTelegramOrderCreatedNotification({
          orderId: orderContext.orderId,
          orderNumber: orderContext.orderNumber,
          amount: orderContext.amount,
          buyerName: orderContext.buyerName,
          buyerEmail: orderContext.buyerEmail,
          createdAt: orderContext.createdAt,
          itemSummary: orderContext.itemSummary,
        });
      }
    } catch (telegramError) {
      console.error("Telegram order created notification failed:", telegramError);
    }

    return Response.json({
      success: true,
      orderId,
      orderNumber,
      telegramSupportUrl: buildTelegramSupportDeepLink(orderId, auth.userId),
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: usedLegacyInsert ? "pending" : undefined,
      state: usedLegacyInsert ? undefined : "pending",
      result: usedLegacyInsert ? undefined : "none",
    });
  } catch (err: unknown) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback errors
    }
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  } finally {
    conn.release();
  }
}
