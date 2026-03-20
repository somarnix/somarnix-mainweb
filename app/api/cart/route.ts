import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CartItemRow = RowDataPacket & {
  cart_item_id: number;
  product_id: number;
  title: string;
  slug: string;
  image_url: string | null;
  variant_id: number | null;
  tool_variant_id: number | null;
  product_mode: "license" | "inventory";
  qty: number;
  unit_price: number;
  line_total: number;
  duration_label: string | null;
  device_label: string | null;
  khqr: string | null;
  usdqr: string | null;
  order_fields_json: string | null;
  order_info_json: string | null;
};

type VideoCourseCartRow = RowDataPacket & {
  course_cart_item_id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  course_thumbnail_url: string | null;
  plan_id: number;
  plan_name: string;
  access_type: string;
  duration_days: number | null;
  max_devices: number;
  is_unlimited_device: number;
  khqr: string | null;
  usdqr: string | null;
  qty: number;
  unit_price: number | string;
};

type PromotionComboRow = RowDataPacket & {
  id: number;
  title: string;
  price: number | string;
  original_price: number | string | null;
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

async function hasTable(tableName: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
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

function formatDurationLabel(days: number | null): string {
  const value = Number(days ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value % 365 === 0) {
    const years = value / 365;
    return `${years} year${years > 1 ? "s" : ""}`;
  }
  if (value % 30 === 0) {
    const months = value / 30;
    return `${months} month${months > 1 ? "s" : ""}`;
  }
  return `${value} days`;
}

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

export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json(
        { items: [], subtotal: 0 },
        { headers: { "Cache-Control": "no-store" } }
      );
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
    const hasProductsMode = await hasColumn("products", "mode");
    const hasToolVariantIdColumn = await hasColumn("cart_items", "tool_variant_id");
    const toolVariantJoinRef = hasToolVariantIdColumn ? "ci.tool_variant_id" : "ci.variant_id";
    const productModeExpr = hasProductsMode
      ? "CASE WHEN p.mode IN ('license','inventory') THEN p.mode ELSE 'inventory' END"
      : "'inventory'";

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
          ${productModeExpr} AS product_mode,
          ci.qty,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.price ELSE pv.price END AS unit_price,
          (ci.qty * (CASE WHEN LOWER(pc.name) = 'tools' THEN tv.price ELSE pv.price END)) AS line_total,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.duration_label ELSE pv.duration_label END AS duration_label,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.device_label ELSE ${pvDeviceLabelExpr} END AS device_label,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.khqr ELSE pv.khqr END AS khqr,
          CASE WHEN LOWER(pc.name) = 'tools' THEN tv.usdqr ELSE pv.usdqr END AS usdqr,
          p.order_fields_json,
          ci.order_info_json
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
          'inventory' AS product_mode,
          ci.qty,
          v.price AS unit_price,
          (ci.qty * v.price) AS line_total,
          v.duration_label,
          NULL AS device_label,
          v.khqr,
          v.usdqr,
          p.order_fields_json,
          ci.order_info_json
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

    const comboIds = Array.from(
      new Set(
        rows
          .map((row) => {
            const info = parseJsonObject(typeof row.order_info_json === "string" ? row.order_info_json : null);
            const comboIdRaw = info.promotion_combo_id;
            const comboId = comboIdRaw === null || comboIdRaw === undefined ? NaN : Number(comboIdRaw);
            return Number.isFinite(comboId) && comboId > 0 ? Math.floor(comboId) : null;
          })
          .filter((value): value is number => value !== null)
      )
    );

    const comboMap = new Map<number, PromotionComboRow>();
    if (comboIds.length > 0) {
      const [comboRows] = await db.query<PromotionComboRow[]>(
        `
        SELECT id, title, price, original_price, khqr, usdqr
        FROM promotion_combos
        WHERE id IN (${comboIds.map(() => "?").join(",")})
        `,
        comboIds
      );
      comboRows.forEach((row) => comboMap.set(Number(row.id), row));
    }

    const productItems = rows.map((r) => {
      const resolvedVariantId = r.tool_variant_id ?? r.variant_id;
      const originalOrderInfo =
        typeof r.order_info_json === "string" ? parseJsonObject(r.order_info_json) : null;
      let nextOrderInfoJson = typeof r.order_info_json === "string" ? r.order_info_json : null;

      if (originalOrderInfo) {
        const comboIdRaw = originalOrderInfo.promotion_combo_id;
        const comboId = comboIdRaw === null || comboIdRaw === undefined ? NaN : Number(comboIdRaw);
        const combo = Number.isFinite(comboId) && comboId > 0 ? comboMap.get(Math.floor(comboId)) : null;
        if (combo) {
          nextOrderInfoJson = JSON.stringify({
            ...originalOrderInfo,
            promotion_combo_title: combo.title,
            promotion_combo_price: Number(combo.price),
            promotion_combo_original_price:
              combo.original_price === null ? null : Number(combo.original_price),
            promotion_combo_khqr: combo.khqr ?? null,
            promotion_combo_usdqr: combo.usdqr ?? null,
          });
        }
      }

      return {
        item_type: "product" as const,
        ...r,
        product_mode: String(r.product_mode) === "license" ? "license" : "inventory",
        cart_item_id: Number(r.cart_item_id),
        product_id: Number(r.product_id),
        variant_id: resolvedVariantId === null ? null : Number(resolvedVariantId),
        tool_variant_id: r.tool_variant_id === null ? null : Number(r.tool_variant_id),
        qty: Number(r.qty),
        unit_price: Number(r.unit_price),
        line_total: Number(r.line_total),
        khqr: typeof r.khqr === "string" ? r.khqr : null,
        usdqr: typeof r.usdqr === "string" ? r.usdqr : null,
        order_fields_json: typeof r.order_fields_json === "string" ? r.order_fields_json : null,
        order_info_json: nextOrderInfoJson,
      };
    });

    let courseItems: Array<{
      item_type: "course";
      cart_item_id: number;
      product_id: number;
      title: string;
      slug: string;
      image_url: string | null;
      variant_id: number | null;
      tool_variant_id: null;
      qty: number;
      unit_price: number;
      line_total: number;
      duration_label: string | null;
      device_label: string | null;
      khqr: string | null;
      usdqr: string | null;
      order_fields_json: null;
      order_info_json: null;
    }> = [];

    const hasVideoCourseCartTable = await hasTable("video_course_cart_items");
    if (hasVideoCourseCartTable) {
      const [courseRows] = await db.query<VideoCourseCartRow[]>(
        `
        SELECT
          vci.id AS course_cart_item_id,
          vc.id AS course_id,
          vc.title AS course_title,
          vc.slug AS course_slug,
          vc.thumbnail_url AS course_thumbnail_url,
          vplan.id AS plan_id,
          vplan.name AS plan_name,
          vplan.access_type,
          vplan.duration_days,
          vplan.max_devices,
          vplan.is_unlimited_device,
          vplan.khqr,
          vplan.usdqr,
          vci.qty,
          vplan.price AS unit_price
        FROM video_course_cart_items vci
        JOIN video_courses vc ON vc.id = vci.course_id
        JOIN video_course_plans vplan ON vplan.id = vci.plan_id
        WHERE vci.user_id = ? AND vc.is_active = 1 AND vplan.is_active = 1
        ORDER BY vci.id DESC
        `,
        [auth.userId]
      );

      courseItems = courseRows.map((r) => {
        const accessLabel =
          r.access_type === "lifetime"
            ? "Lifetime access"
            : (() => {
                const d = formatDurationLabel(r.duration_days);
                return d ? `${d} access` : "Limited access";
              })();
        const deviceLabel =
          Number(r.is_unlimited_device ?? 0) === 1
            ? `Unlimited device (max ${Math.max(1, Number(r.max_devices ?? 10))} devices)`
            : `Max ${Math.max(1, Number(r.max_devices ?? 1))} devices`;
        const qty = 1;
        const unitPrice = Number(r.unit_price ?? 0);
        const cartItemId = -Math.floor(Number(r.course_cart_item_id));
        return {
          item_type: "course" as const,
          cart_item_id: cartItemId,
          product_id: Number(r.course_id),
          title: String(r.course_title),
          slug: String(r.course_slug),
          image_url: r.course_thumbnail_url ?? null,
          variant_id: Number(r.plan_id),
          tool_variant_id: null,
          qty,
          unit_price: unitPrice,
          line_total: unitPrice * qty,
          duration_label: `${String(r.plan_name)} • ${accessLabel}`,
          device_label: deviceLabel,
          khqr: r.khqr ?? null,
          usdqr: r.usdqr ?? null,
          order_fields_json: null,
          order_info_json: null,
        };
      });
    }

    const items = [...courseItems, ...productItems];
    const subtotal = items.reduce((sum, r) => sum + Number(r.line_total ?? 0), 0);

    return Response.json({ items, subtotal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
