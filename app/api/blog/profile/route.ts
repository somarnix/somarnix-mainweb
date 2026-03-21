import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  level: number | null;
  avatar_url: string | null;
  avatar_border_url: string | null;
  cover_url: string | null;
  cover_position_x: number | null;
  cover_position_y: number | null;
  cover_scale: number | null;
  bio: string | null;
  created_at: string | Date | null;
};

type NumberRow = RowDataPacket & {
  total: number | string | null;
};

async function hasTable(tableName: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1 AS ok
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = ?
    LIMIT 1
    `,
    [tableName]
  );
  return rows.length > 0;
}

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );
  return rows.length > 0;
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toFiniteOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const auth = await getAuthUser(req);
    const sellerParam = (url.searchParams.get("seller") ?? "").trim();
    const sellerIdRaw = Number(url.searchParams.get("sellerId") ?? 0);
    const hasAvatarBorderColumn = await hasColumn("users", "avatar_border_url");
    const hasLevelColumn = await hasColumn("users", "level");
    const hasCoverUrlColumn = await hasColumn("users", "cover_url");
    const hasCoverPositionXColumn = await hasColumn("users", "cover_position_x");
    const hasCoverPositionYColumn = await hasColumn("users", "cover_position_y");
    const hasCoverScaleColumn = await hasColumn("users", "cover_scale");
    const avatarBorderSelect = hasAvatarBorderColumn
      ? "avatar_border_url"
      : "NULL AS avatar_border_url";
    const levelSelect = hasLevelColumn ? "level" : "1 AS level";
    const coverUrlSelect = hasCoverUrlColumn ? "cover_url" : "NULL AS cover_url";
    const coverPositionXSelect = hasCoverPositionXColumn
      ? "cover_position_x"
      : "50.00 AS cover_position_x";
    const coverPositionYSelect = hasCoverPositionYColumn
      ? "cover_position_y"
      : "50.00 AS cover_position_y";
    const coverScaleSelect = hasCoverScaleColumn ? "cover_scale" : "1.00 AS cover_scale";

    let users: UserRow[] = [];
    if (sellerParam) {
      const sellerNumericId = Number(sellerParam);
      if (Number.isFinite(sellerNumericId) && sellerNumericId > 0) {
        [users] = await db.query<UserRow[]>(
          `
          SELECT id, email, username, first_name, last_name, ${levelSelect}, avatar_url, ${avatarBorderSelect}, ${coverUrlSelect}, ${coverPositionXSelect}, ${coverPositionYSelect}, ${coverScaleSelect}, bio, created_at
          FROM users
          WHERE id = ? AND is_active = 1 AND deleted_at IS NULL
          LIMIT 1
          `,
          [sellerNumericId]
        );
      } else {
        [users] = await db.query<UserRow[]>(
          `
          SELECT id, email, username, first_name, last_name, ${levelSelect}, avatar_url, ${avatarBorderSelect}, ${coverUrlSelect}, ${coverPositionXSelect}, ${coverPositionYSelect}, ${coverScaleSelect}, bio, created_at
          FROM users
          WHERE LOWER(username) = LOWER(?) AND is_active = 1 AND deleted_at IS NULL
          LIMIT 1
          `,
          [sellerParam]
        );
      }
    } else {
      const sellerId = sellerIdRaw > 0 ? sellerIdRaw : auth?.userId ?? 1;
      [users] = await db.query<UserRow[]>(
        `
        SELECT id, email, username, first_name, last_name, ${levelSelect}, avatar_url, ${avatarBorderSelect}, ${coverUrlSelect}, ${coverPositionXSelect}, ${coverPositionYSelect}, ${coverScaleSelect}, bio, created_at
        FROM users
        WHERE id = ? AND is_active = 1 AND deleted_at IS NULL
        LIMIT 1
        `,
        [sellerId]
      );
    }

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const seller = users[0];
    const sellerId = Number(seller.id);

    const [ordersCountRows] = await db.query<NumberRow[]>(
      `
      SELECT COALESCE(SUM(oi.qty), 0) AS total
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE p.posted_by = ? AND o.state = 'completed'
      `,
      [sellerId]
    );

    const [ratingRows] = await db.query<NumberRow[]>(
      `
      SELECT COALESCE(AVG(pr.rating), 0) AS total
      FROM product_reviews pr
      JOIN products p ON p.id = pr.product_id
      WHERE p.posted_by = ?
      `,
      [sellerId]
    );

    const [successRows] = await db.query<RowDataPacket[]>(
      `
      SELECT
        SUM(CASE WHEN o.state = 'completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN o.state IN ('completed','cancelled','resolution') THEN 1 ELSE 0 END) AS tracked_count
      FROM (
        SELECT DISTINCT o.id, o.state
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        WHERE p.posted_by = ?
      ) o
      `,
      [sellerId]
    );

    let followersCount = 0;
    let followingCount = 0;
    let isFollowing = false;

    const hasFollowers = await hasTable("user_followers");
    if (hasFollowers) {
      const [followerRows] = await db.query<NumberRow[]>(
        `SELECT COUNT(*) AS total FROM user_followers WHERE following_id = ?`,
        [sellerId]
      );
      followersCount = toNumber(followerRows[0]?.total);

      const [followingRows] = await db.query<NumberRow[]>(
        `SELECT COUNT(*) AS total FROM user_followers WHERE follower_id = ?`,
        [sellerId]
      );
      followingCount = toNumber(followingRows[0]?.total);

      if (auth?.userId) {
        const [meRows] = await db.query<RowDataPacket[]>(
          `
          SELECT 1 AS ok
          FROM user_followers
          WHERE follower_id = ? AND following_id = ?
          LIMIT 1
          `,
          [auth.userId, sellerId]
        );
        isFollowing = meRows.length > 0;
      }
    }

    let videoCoursesCount = 0;
    const hasVideoPostedBy = await hasColumn("video_courses", "posted_by");
    if (hasVideoPostedBy) {
      const [videoRows] = await db.query<NumberRow[]>(
        `
        SELECT COUNT(*) AS total
        FROM video_courses
        WHERE posted_by = ? AND is_active = 1 AND deleted_at IS NULL
        `,
        [sellerId]
      );
      videoCoursesCount = toNumber(videoRows[0]?.total);
    }

    const completedCount = toNumber(successRows[0]?.completed_count);
    const trackedCount = toNumber(successRows[0]?.tracked_count);
    const successRate = trackedCount > 0 ? (completedCount / trackedCount) * 100 : 0;

    const displayName =
      seller.username ||
      [seller.first_name, seller.last_name].filter(Boolean).join(" ").trim() ||
      seller.email;

    return NextResponse.json({
      seller: {
        id: Number(seller.id),
        name: displayName,
        email: seller.email,
        username: seller.username,
        firstName: seller.first_name,
        lastName: seller.last_name,
        level: toNumber(seller.level) || 1,
        avatarUrl: seller.avatar_url,
        avatarBorderUrl: toNumber(seller.level) >= 2 ? seller.avatar_border_url : null,
        coverUrl: seller.cover_url,
        coverPositionX: toFiniteOr(seller.cover_position_x, 50),
        coverPositionY: toFiniteOr(seller.cover_position_y, 50),
        coverScale: toFiniteOr(seller.cover_scale, 1),
        bio: seller.bio,
        memberSince: seller.created_at instanceof Date
          ? seller.created_at.toISOString()
          : seller.created_at,
      },
      stats: {
        successfulDelivery: Number(successRate.toFixed(2)),
        totalLifetimeOrders: toNumber(ordersCountRows[0]?.total),
        allTimeRating: Number(toNumber(ratingRows[0]?.total).toFixed(2)),
        followers: followersCount,
        following: followingCount,
        videoCourses: videoCoursesCount,
      },
      viewer: {
        isFollowing,
        canFollow: !!auth?.userId && auth.userId !== sellerId,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
