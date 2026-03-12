import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

type ComboRow = RowDataPacket & {
  id: number;
  title: string;
  description: string | null;
  price: number | string;
  original_price: number | string | null;
  thumbnail_url: string | null;
  khqr: string | null;
  usdqr: string | null;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
};

type ComboItemRow = RowDataPacket & {
  combo_id: number;
  item_type: "course" | "tool" | "product";
  item_id: number;
  variant_id: number | null;
  qty: number;
};

type NameRow = RowDataPacket & {
  id: number;
  title: string;
};

type CourseMetaRow = RowDataPacket & {
  id: number;
  title: string;
  thumbnail_url: string | null;
};

type PlanNameRow = RowDataPacket & {
  id: number;
  name: string;
  price?: number | string | null;
};

type VariantLabelRow = RowDataPacket & {
  id: number;
  duration_label: string | null;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") ?? 6)));

    const [combos] = await db.query<ComboRow[]>(
      `
      SELECT id, title, description, price, original_price, thumbnail_url, khqr, usdqr, start_at, end_at, created_at
      FROM promotion_combos
      WHERE is_active = 1
        AND (start_at IS NULL OR NOW() >= start_at)
        AND (end_at IS NULL OR NOW() <= end_at)
      ORDER BY id DESC
      LIMIT ?
      `,
      [limit]
    );

    const comboIds = combos.map((c) => Number(c.id)).filter((id) => id > 0);
    let items: ComboItemRow[] = [];
    if (comboIds.length > 0) {
      const [itemRows] = await db.query<ComboItemRow[]>(
        `
        SELECT combo_id, item_type, item_id, variant_id, qty
        FROM promotion_combo_items
        WHERE combo_id IN (${comboIds.map(() => "?").join(",")})
        ORDER BY id ASC
        `,
        comboIds
      );
      items = itemRows;
    }

    const courseIds = Array.from(
      new Set(
        items
          .filter((it) => it.item_type === "course")
          .map((it) => Number(it.item_id))
          .filter((id) => id > 0)
      )
    );
    const productIds = Array.from(
      new Set(
        items
          .filter((it) => it.item_type === "tool" || it.item_type === "product")
          .map((it) => Number(it.item_id))
          .filter((id) => id > 0)
      )
    );
    const coursePlanIds = Array.from(
      new Set(
        items
          .filter((it) => it.item_type === "course")
          .map((it) => Number(it.variant_id ?? 0))
          .filter((id) => id > 0)
      )
    );
    const toolVariantIds = Array.from(
      new Set(
        items
          .filter((it) => it.item_type === "tool")
          .map((it) => Number(it.variant_id ?? 0))
          .filter((id) => id > 0)
      )
    );
    const productVariantIds = Array.from(
      new Set(
        items
          .filter((it) => it.item_type === "product")
          .map((it) => Number(it.variant_id ?? 0))
          .filter((id) => id > 0)
      )
    );

    const courseMap = new Map<number, { title: string; thumbnail_url: string | null }>();
    const productMap = new Map<number, string>();
    const coursePlanMap = new Map<number, { name: string; price: number }>();
    const toolVariantMap = new Map<number, string>();
    const productVariantMap = new Map<number, string>();

    if (courseIds.length > 0) {
      const [rows] = await db.query<CourseMetaRow[]>(
        `SELECT id, title, thumbnail_url FROM video_courses WHERE id IN (${courseIds.map(() => "?").join(",")})`,
        courseIds
      );
      rows.forEach((r) =>
        courseMap.set(Number(r.id), {
          title: String(r.title || "").trim(),
          thumbnail_url: r.thumbnail_url ?? null,
        })
      );
    }
    if (productIds.length > 0) {
      const [rows] = await db.query<NameRow[]>(
        `SELECT id, title FROM products WHERE id IN (${productIds.map(() => "?").join(",")})`,
        productIds
      );
      rows.forEach((r) => productMap.set(Number(r.id), String(r.title || "").trim()));
    }
    if (coursePlanIds.length > 0) {
      const [rows] = await db.query<PlanNameRow[]>(
        `SELECT id, name, price FROM video_course_plans WHERE id IN (${coursePlanIds.map(() => "?").join(",")})`,
        coursePlanIds
      );
      rows.forEach((r) =>
        coursePlanMap.set(Number(r.id), {
          name: String(r.name || "").trim(),
          price: Number(r.price ?? 0),
        })
      );
    }
    if (toolVariantIds.length > 0) {
      const [rows] = await db.query<VariantLabelRow[]>(
        `SELECT id, duration_label FROM tool_variants WHERE id IN (${toolVariantIds.map(() => "?").join(",")})`,
        toolVariantIds
      );
      rows.forEach((r) =>
        toolVariantMap.set(Number(r.id), String(r.duration_label || `Variant #${Number(r.id)}`).trim())
      );
    }
    if (productVariantIds.length > 0) {
      const [rows] = await db.query<VariantLabelRow[]>(
        `SELECT id, duration_label FROM product_variants WHERE id IN (${productVariantIds.map(() => "?").join(",")})`,
        productVariantIds
      );
      rows.forEach((r) =>
        productVariantMap.set(Number(r.id), String(r.duration_label || `Variant #${Number(r.id)}`).trim())
      );
    }

    const itemMap = new Map<number, ComboItemRow[]>();
    for (const item of items) {
      const key = Number(item.combo_id);
      const list = itemMap.get(key) ?? [];
      list.push(item);
      itemMap.set(key, list);
    }

    const promotions = combos.map((combo) => ({
      ...combo,
      price: Number(combo.price),
      original_price: combo.original_price === null ? null : Number(combo.original_price),
      items: (itemMap.get(Number(combo.id)) ?? []).map((item) => ({
        item_type: item.item_type,
        item_id: Number(item.item_id),
        variant_id: item.variant_id === null ? null : Number(item.variant_id),
        qty: Number(item.qty),
        item_title:
          item.item_type === "course"
            ? courseMap.get(Number(item.item_id))?.title ?? null
            : productMap.get(Number(item.item_id)) ?? null,
        variant_title:
          item.variant_id === null
            ? null
            : item.item_type === "course"
              ? (coursePlanMap.get(Number(item.variant_id))?.name ?? null)
              : item.item_type === "tool"
                ? toolVariantMap.get(Number(item.variant_id)) ?? null
                : productVariantMap.get(Number(item.variant_id)) ?? null,
        item_image:
          item.item_type === "course"
            ? courseMap.get(Number(item.item_id))?.thumbnail_url ?? null
            : null,
        variant_price:
          item.variant_id === null || item.item_type !== "course"
            ? null
            : (() => {
                const plan = coursePlanMap.get(Number(item.variant_id));
                const num = Number(plan?.price ?? 0);
                return Number.isFinite(num) ? num : null;
              })(),
      })),
    }));

    return Response.json({ promotions });
  } catch (err: unknown) {
    return Response.json({ error: "Server error", detail: String(err) }, { status: 500 });
  }
}
