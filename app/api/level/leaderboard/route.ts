/**
 * GET /api/level/leaderboard
 * 
 * Get top users by level
 * Public endpoint
 */

import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const minLevel = parseInt(url.searchParams.get("minLevel") || "1");

    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        u.id,
        u.username,
        u.level,
        u.progression_score,
        u.buying_score,
        u.selling_score,
        ulh.created_at AS last_level_up_at
      FROM users u
      LEFT JOIN user_level_history ulh ON ulh.user_id = u.id 
        AND ulh.new_level = u.level
      WHERE u.level >= ?
      ORDER BY u.level DESC, u.progression_score DESC
      LIMIT ?
      `,
      [minLevel, limit]
    );

    return NextResponse.json({
      leaderboard: rows.map((row: any) => ({
        rank: rows.indexOf(row) + 1,
        userId: row.id,
        username: row.username,
        level: row.level,
        progressionScore: parseFloat(row.progression_score),
        buyingScore: parseFloat(row.buying_score),
        sellingScore: parseFloat(row.selling_score),
        lastLevelUpAt: row.last_level_up_at,
      })),
      count: rows.length,
      limit,
    });
  } catch (error) {
    console.error("[API/level/leaderboard] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
