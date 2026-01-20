import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type ProductRow = RowDataPacket & { id: number };

type ReviewRow = RowDataPacket & {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: Date | string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type SummaryRow = RowDataPacket & {
  avg_rating: number | null;
  rating_count: number;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await ctx.params;
  if (!slug) {
    return Response.json({ error: "Invalid product" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    rating?: number;
    comment?: string;
  };

  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const comment =
    typeof body.comment === "string" && body.comment.trim().length > 0
      ? body.comment.trim()
      : null;

  const [pRows] = await db.query<ProductRow[]>(
    "SELECT id FROM products WHERE slug = ? LIMIT 1",
    [slug]
  );
  if (pRows.length === 0) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const productId = pRows[0].id;

  const [purchaseRows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS cnt
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = ? AND oi.product_id = ? AND o.state = 'completed'
    `,
    [auth.userId, productId]
  );

  const purchased = Number(purchaseRows[0]?.cnt ?? 0) > 0;
  if (!purchased) {
    return Response.json(
      { error: "You must complete a purchase before leaving a review" },
      { status: 403 }
    );
  }

  await db.query<ResultSetHeader>(
    `
    INSERT INTO product_reviews (product_id, user_id, rating, comment)
    VALUES (?,?,?,?)
    ON DUPLICATE KEY UPDATE
      rating = VALUES(rating),
      comment = VALUES(comment),
      created_at = NOW()
    `,
    [productId, auth.userId, rating, comment]
  );

  const [reviewRows] = await db.query<ReviewRow[]>(
    `
    SELECT
      r.id,
      r.product_id,
      r.user_id,
      r.rating,
      r.comment,
      r.created_at,
      u.first_name,
      u.last_name,
      u.username,
      u.avatar_url
    FROM product_reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ? AND r.user_id = ?
    LIMIT 1
    `,
    [productId, auth.userId]
  );

  const review =
    reviewRows.length === 0
      ? null
      : {
          id: reviewRows[0].id,
          product_id: reviewRows[0].product_id,
          user_id: reviewRows[0].user_id,
          rating: Number(reviewRows[0].rating),
          comment: reviewRows[0].comment,
          created_at:
            reviewRows[0].created_at instanceof Date
              ? reviewRows[0].created_at.toISOString()
              : String(reviewRows[0].created_at),
          user_name:
            (reviewRows[0].first_name || reviewRows[0].last_name
              ? [reviewRows[0].first_name, reviewRows[0].last_name]
                  .filter(Boolean)
                  .join(" ")
              : null) ||
            reviewRows[0].username ||
            "User",
          user_avatar: reviewRows[0].avatar_url,
        };

  const [summaryRows] = await db.query<SummaryRow[]>(
    `
    SELECT ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS rating_count
    FROM product_reviews
    WHERE product_id = ?
    `,
    [productId]
  );

  const summary = summaryRows[0] || { avg_rating: null, rating_count: 0 };

  return Response.json({
    success: true,
    review,
    summary: {
      avg_rating: summary.avg_rating === null ? null : Number(summary.avg_rating),
      rating_count: Number(summary.rating_count ?? 0),
    },
  });
}
