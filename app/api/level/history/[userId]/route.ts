/**
 * GET /api/level/history/[userId]
 * 
 * Get user's level history
 */

import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId);

    if (Number.isNaN(userIdNum)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        id,
        old_level,
        new_level,
        level_change,
        old_score,
        new_score,
        score_change,
        reason,
        related_order_id,
        created_at
      FROM user_level_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [userIdNum, limit]
    );

    return NextResponse.json({
      history: rows.map((row: any) => ({
        id: row.id,
        oldLevel: row.old_level,
        newLevel: row.new_level,
        levelChange: row.level_change,
        oldScore: parseFloat(row.old_score),
        newScore: parseFloat(row.new_score),
        scoreChange: parseFloat(row.score_change),
        reason: row.reason,
        relatedOrderId: row.related_order_id,
        createdAt: row.created_at,
      })),
      count: rows.length,
      limit,
    });
  } catch (error) {
    console.error("[API/level/history] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
