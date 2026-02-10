import { NextRequest, NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type FollowBody = {
  followingId?: number;
};

async function hasFollowersTable() {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1 AS ok
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'user_followers'
    LIMIT 1
    `
  );
  return rows.length > 0;
}

function parseFollowingId(raw: unknown): number | null {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!(await hasFollowersTable())) {
      return NextResponse.json(
        { error: "user_followers table is missing" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as FollowBody;
    const followingId = parseFollowingId(body.followingId);
    if (!followingId) {
      return NextResponse.json({ error: "Invalid followingId" }, { status: 400 });
    }
    if (followingId === auth.userId) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    const [existingUser] = await db.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`,
      [followingId]
    );
    if (existingUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.query<ResultSetHeader>(
      `
      INSERT IGNORE INTO user_followers (follower_id, following_id)
      VALUES (?, ?)
      `,
      [auth.userId, followingId]
    );

    return NextResponse.json({ success: true, followingId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!(await hasFollowersTable())) {
      return NextResponse.json(
        { error: "user_followers table is missing" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const followingId = parseFollowingId(url.searchParams.get("followingId"));
    if (!followingId) {
      return NextResponse.json({ error: "Invalid followingId" }, { status: 400 });
    }

    await db.query<ResultSetHeader>(
      `DELETE FROM user_followers WHERE follower_id = ? AND following_id = ?`,
      [auth.userId, followingId]
    );

    return NextResponse.json({ success: true, followingId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}

