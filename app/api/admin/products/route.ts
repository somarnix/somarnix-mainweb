// app/api/admin/products/route.ts
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

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

async function ensureTelegramUrlColumn(): Promise<boolean> {
  const exists = await hasColumn("products", "telegram_url");
  if (exists) return true;
  try {
    await db.query(`
      ALTER TABLE products
      ADD COLUMN telegram_url VARCHAR(2000) NULL AFTER image_url
    `);
    return true;
  } catch {
    return false;
  }
}

/* =========================
   GET: LIST PRODUCTS (ADMIN)
========================= */
export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ products: [], error: "Forbidden" }, { status: 403 });
    }

    const hasProductsMode = await hasColumn("products", "mode");
    const hasTelegramUrl = await hasColumn("products", "telegram_url");
    const modeSelectExpr = hasProductsMode
      ? "CASE WHEN p.mode IN ('license','inventory') THEN p.mode ELSE 'inventory' END AS mode,"
      : "'inventory' AS mode,";
    const telegramSelectExpr = hasTelegramUrl ? "p.telegram_url," : "NULL AS telegram_url,";

    let rows: RowDataPacket[] = [];
    try {
      const [data] = await db.query<RowDataPacket[]>(
        `
        SELECT
          CAST(p.id AS UNSIGNED) AS id,
          p.title,
          p.slug,
          p.category_id,
          p.image_url,
          ${telegramSelectExpr}
          p.level,
          p.stock_qty,
          p.is_unlimited_stock,
          ${modeSelectExpr}
          p.order_fields_json,
          p.is_active,
          p.created_at,
          c.name AS category_name,
          CASE
            WHEN LOWER(c.name) = 'tools' THEN MIN(tv.price)
            ELSE MIN(v.price)
          END AS min_price,
          CASE
            WHEN LOWER(c.name) = 'tools' THEN COUNT(tv.id)
            ELSE COUNT(v.id)
          END AS variant_count
        FROM products p
        JOIN product_categories c ON c.id = p.category_id
        LEFT JOIN product_variants v
          ON v.product_id = p.id AND v.is_active = 1
        LEFT JOIN tool_variants tv
          ON tv.product_id = p.id AND tv.is_active = 1
        WHERE p.deleted_at IS NULL
        GROUP BY p.id
        ORDER BY p.created_at DESC
        `
      );
      rows = data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes("unknown column") || !message.includes("deleted_at")) {
        throw err;
      }
      const [data] = await db.query<RowDataPacket[]>(
        `
        SELECT
          CAST(p.id AS UNSIGNED) AS id,
          p.title,
          p.slug,
          p.category_id,
          p.image_url,
          ${telegramSelectExpr}
          p.level,
          p.stock_qty,
          p.is_unlimited_stock,
          ${modeSelectExpr}
          p.order_fields_json,
          p.is_active,
          p.created_at,
          c.name AS category_name,
          CASE
            WHEN LOWER(c.name) = 'tools' THEN MIN(tv.price)
            ELSE MIN(v.price)
          END AS min_price,
          CASE
            WHEN LOWER(c.name) = 'tools' THEN COUNT(tv.id)
            ELSE COUNT(v.id)
          END AS variant_count
        FROM products p
        JOIN product_categories c ON c.id = p.category_id
        LEFT JOIN product_variants v
          ON v.product_id = p.id AND v.is_active = 1
        LEFT JOIN tool_variants tv
          ON tv.product_id = p.id AND tv.is_active = 1
        GROUP BY p.id
        ORDER BY p.created_at DESC
        `
      );
      rows = data;
    }

    return Response.json({ products: rows ?? [] });
  } catch (err) {
    console.error("ADMIN PRODUCTS ERROR:", err);
    return Response.json({ products: [], error: "Server error" }, { status: 500 });
  }
}

/* =========================
   POST: CREATE PRODUCT (ADMIN)
========================= */
export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const b = (typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {});

    const title = typeof b.title === "string" ? b.title.trim() : "";
    const slug = typeof b.slug === "string" ? b.slug.trim() : "";
    const categoryId = Number(b.category_id);
    const requestedMode = typeof b.mode === "string" ? b.mode.trim().toLowerCase() : null;
    const telegramUrl =
      typeof b.telegram_url === "string" && b.telegram_url.trim()
        ? b.telegram_url.trim()
        : null;

    if (!title || !slug || !Number.isFinite(categoryId) || categoryId <= 0) {
      return Response.json({ error: "Invalid title, slug, or category" }, { status: 400 });
    }

    const [exists] = await db.query<RowDataPacket[]>(
      `SELECT id FROM products WHERE slug = ? LIMIT 1`,
      [slug]
    );
    if (exists.length > 0) {
      return Response.json({ error: "Slug already exists" }, { status: 409 });
    }

    const [categoryRows] = await db.query<RowDataPacket[]>(
      "SELECT name FROM product_categories WHERE id = ? LIMIT 1",
      [categoryId]
    );
    if (categoryRows.length === 0) {
      return Response.json({ error: "Category not found" }, { status: 400 });
    }
    const fallbackMode = "inventory";
    const finalMode =
      requestedMode === "license" || requestedMode === "inventory" ? requestedMode : fallbackMode;
    const hasProductsMode = await hasColumn("products", "mode");
    const hasTelegramUrl = await ensureTelegramUrlColumn();

    const columns = ["title", "slug", "category_id", "posted_by", "is_active"];
    const values: Array<string | number | null> = [title, slug, categoryId, auth.userId, 1];
    if (hasProductsMode) {
      columns.push("mode");
      values.push(finalMode);
    }
    if (hasTelegramUrl) {
      columns.push("telegram_url");
      values.push(telegramUrl);
    }

    const [result] = await db.query<ResultSetHeader>(
      `
      INSERT INTO products (${columns.join(", ")})
      VALUES (${columns.map(() => "?").join(", ")})
      `,
      values
    );

    return Response.json({ success: true, productId: result.insertId });
  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
