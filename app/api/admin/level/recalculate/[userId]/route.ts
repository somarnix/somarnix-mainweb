/**
 * POST /api/admin/level/recalculate/[userId]
 * 
 * Manually recalculate a user's level (admin only)
 */

import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const [userRows] = await db.query<RowDataPacket[]>(
    `SELECT role FROM users WHERE id = ? LIMIT 1`,
    [auth.userId]
  );

  if (userRows[0]?.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId);

    if (Number.isNaN(userIdNum)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Call stored procedure to recalculate level
    await db.query<ResultSetHeader>(
      `CALL sp_calculate_user_level(?, 'manual_adjustment', NULL)`,
      [userIdNum]
    );

    // Get updated user data
    const [updatedRows] = await db.query<RowDataPacket[]>(
      `
      SELECT level, progression_score, level_last_calculated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userIdNum]
    );

    if (updatedRows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updated = updatedRows[0];

    return NextResponse.json({
      ok: true,
      userId: userIdNum,
      newLevel: updated.level,
      newScore: parseFloat(updated.progression_score),
      calculatedAt: updated.level_last_calculated_at,
    });
  } catch (error) {
    console.error("[API/admin/level/recalculate] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
