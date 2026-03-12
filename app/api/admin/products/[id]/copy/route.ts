import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type ProductRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  category_id: number;
  posted_by: number;
  description: string | null;
  level: string;
  stock_qty: number;
  is_unlimited_stock: number;
  image_url: string | null;
  is_active: number;
  mode?: "license" | "inventory" | null;
  category_name?: string;
};

type VariantRow = RowDataPacket & {
  duration_label: string | null;
  duration_note: string | null;
  duration_days: number | null;
  device_label: string | null;
  device_type: "any" | "pc" | "phone" | "both" | null;
  device_limit: number | null;
  is_unlimited_device: number | null;
  original_price: number | string | null;
  price: number | string | null;
  khqr: string | null;
  usdqr: string | null;
  units_per_qty?: number | null;
  is_active: number | null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const productId = Number(id);
  if (!Number.isFinite(productId) || productId <= 0) {
    return Response.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const [variantCols] = await db.query<RowDataPacket[]>(
      `
      SELECT COLUMN_NAME
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'product_variants'
      `
    );
    const variantColSet = new Set(variantCols.map((c) => String(c.COLUMN_NAME)));
    const hasDeviceLabel = variantColSet.has("device_label");
    const hasDeviceType = variantColSet.has("device_type");
    const hasDeviceLimit = variantColSet.has("device_limit");
    const hasUnlimitedDevice = variantColSet.has("is_unlimited_device");
    const hasUnitsPerQty = variantColSet.has("units_per_qty");
    const [modeCols] = await db.query<RowDataPacket[]>(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'mode'
      LIMIT 1
      `
    );
    const hasProductsMode = modeCols.length > 0;

    const [rows] = await db.query<ProductRow[]>(
      `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.category_id,
        p.posted_by,
        p.description,
        p.level,
        p.stock_qty,
        p.is_unlimited_stock,
        ${hasProductsMode ? "p.mode," : "NULL AS mode,"}
        p.image_url,
        p.is_active,
        c.name AS category_name
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [productId]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const product = rows[0];
    const isTools = String(product.category_name || "").toLowerCase() === "tools";
    const suffix = `copy-${Date.now()}`;
    const newSlug = `${product.slug}-${suffix}`;
    const newTitle = `${product.title} (Copy)`;
    const copiedMode =
      String(product.mode ?? "").toLowerCase() === "license" ? "license" : "inventory";

    await db.query("START TRANSACTION");

    const [insertRes] = await db.query<ResultSetHeader>(
      `
      INSERT INTO products (
        category_id,
        posted_by,
        title,
        slug,
        description,
        level,
        stock_qty,
        is_unlimited_stock,
        ${hasProductsMode ? "mode," : ""}
        image_url,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${hasProductsMode ? "?," : ""} ?, ?)
      `,
      [
        product.category_id,
        product.posted_by,
        newTitle,
        newSlug,
        product.description,
        product.level,
        product.stock_qty,
        product.is_unlimited_stock,
        ...(hasProductsMode ? [copiedMode] : []),
        product.image_url,
        0,
      ]
    );

    const newProductId = insertRes.insertId;

    const [variantRows] = await db.query<VariantRow[]>(
      isTools
        ? `
      SELECT
        duration_label,
        duration_note,
        duration_days,
        device_label,
        device_type,
        device_limit,
        is_unlimited_device,
        original_price,
        price,
        khqr,
        usdqr,
        is_active
      FROM tool_variants
      WHERE product_id = ?
      ORDER BY id ASC
      `
        : hasDeviceLabel || hasDeviceType || hasDeviceLimit || hasUnlimitedDevice
        ? `
      SELECT
        duration_label,
        duration_note,
        duration_days,
        ${hasDeviceLabel ? "device_label" : "NULL AS device_label"},
        ${hasDeviceType ? "device_type" : "NULL AS device_type"},
        ${hasDeviceLimit ? "device_limit" : "NULL AS device_limit"},
        ${hasUnlimitedDevice ? "is_unlimited_device" : "0 AS is_unlimited_device"},
        original_price,
        price,
        khqr,
        usdqr,
        is_active
        ${hasUnitsPerQty ? ", units_per_qty" : ""}
      FROM product_variants
      WHERE product_id = ?
      ORDER BY id ASC
      `
        : `
      SELECT
        duration_label,
        duration_note,
        duration_days,
        NULL AS device_label,
        NULL AS device_type,
        NULL AS device_limit,
        0 AS is_unlimited_device,
        original_price,
        price,
        khqr,
        usdqr,
        is_active
        ${hasUnitsPerQty ? ", units_per_qty" : ""}
      FROM product_variants
      WHERE product_id = ?
      ORDER BY id ASC
      `,
      [productId]
    );

    if (variantRows.length > 0) {
      const values: Array<unknown> = [];
      const withDeviceColumns =
        isTools || (hasDeviceLabel && hasDeviceType && hasDeviceLimit && hasUnlimitedDevice);
      const withUnitsPerQty = !isTools && hasUnitsPerQty;
      const placeholders = variantRows.map(() =>
        withDeviceColumns
          ? "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          : withUnitsPerQty
            ? "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            : "(?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );

      variantRows.forEach((variant) => {
        if (withDeviceColumns) {
          values.push(
            newProductId,
            variant.duration_label,
            variant.duration_note,
            variant.duration_days,
            variant.device_label,
            variant.device_type ?? "any",
            variant.device_limit,
            variant.is_unlimited_device ?? 0,
            variant.original_price ?? 0,
            variant.price ?? 0,
            variant.khqr ?? "/paymentQR/khmer_qr.jpg",
            variant.usdqr ?? "none",
            variant.is_active ?? 1
          );
          return;
        }
        values.push(
          newProductId,
          variant.duration_label,
          variant.duration_note,
          variant.duration_days,
          ...(withUnitsPerQty ? [Math.max(1, Number(variant.units_per_qty ?? 1))] : []),
          variant.original_price ?? 0,
          variant.price ?? 0,
          variant.khqr ?? "/paymentQR/khmer_qr.jpg",
          variant.usdqr ?? "none",
          variant.is_active ?? 1
        );
      });

      await db.query(
        withDeviceColumns
          ? `
        INSERT INTO ${isTools ? "tool_variants" : "product_variants"} (
          product_id,
          duration_label,
          duration_note,
          duration_days,
          device_label,
          device_type,
          device_limit,
          is_unlimited_device,
          original_price,
          price,
          khqr,
          usdqr,
          is_active
        )
        VALUES ${placeholders.join(", ")}
        `
          : `
        INSERT INTO product_variants (
          product_id,
          duration_label,
          duration_note,
          duration_days,
          ${withUnitsPerQty ? "units_per_qty," : ""}
          original_price,
          price,
          khqr,
          usdqr,
          is_active
        )
        VALUES ${placeholders.join(", ")}
        `,
        values
      );
    }

    await db.query("COMMIT");

    return Response.json({ success: true, id: newProductId, slug: newSlug });
  } catch (err) {
    await db.query("ROLLBACK");
    return Response.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
