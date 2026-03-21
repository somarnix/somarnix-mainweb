/**
 * GET /api/level/stats/[userId]
 * 
 * Get user level statistics
 * Public endpoint - safe to call from frontend
 */

import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 1 minute

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getLevelThreshold(level: number): number {
  if (level <= 1) return 0;
  if (level <= 10) return (level - 1) * 2;
  if (level <= 100) return 20 + (level - 10) * 5;
  if (level <= 500) return 470 + (level - 100) * 10;
  return 4470 + (level - 500) * 20;
}

function normalizeBenefitText(value: unknown): string {
  const text = typeof value === "string" ? value : "";
  return text
    .replace(/Verified Trader/g, "Verified User")
    .replace(/Trusted Trader/g, "Trusted User")
    .replace(/Experienced Trader/g, "Experienced User")
    .replace(/Active Trader/g, "Active User")
    .replace(/Expert Trader/g, "Expert User")
    .replace(/Master Trader/g, "Master User")
    .replace(/Grand Master Trader/g, "Grand Master User")
    .replace(/Trader/g, "User");
}

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

    // Get user level stats from view
    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT * FROM v_user_level_stats
      WHERE id = ?
      LIMIT 1
      `,
      [userIdNum]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = rows[0];

    // Calculate progress to next level
    const currentLevel = toNumber(user.level, 1);
    const currentScore = toNumber(user.progression_score);
    
    // Match the tiered formula used by the SQL level system.
    const nextLevelScore = currentLevel >= 1000 ? currentScore : getLevelThreshold(currentLevel + 1);
    const prevLevelScore = getLevelThreshold(currentLevel);
    const progressInRange = currentScore - prevLevelScore;
    const rangeSize = Math.max(1, nextLevelScore - prevLevelScore);
    const progressPercent = currentLevel >= 1000
      ? 100
      : Math.min(100, Math.max(0, (progressInRange / rangeSize) * 100));

    // Get unlocked benefits
    const [benefits] = await db.query<RowDataPacket[]>(
      `
      SELECT benefit_key, benefit_name, unlocked_at_level, unlocked_at
      FROM user_level_benefits
      WHERE user_id = ? AND is_active = 1
      ORDER BY unlocked_at_level DESC
      `,
      [userIdNum]
    );

    // Get available benefits (not yet unlocked)
    const [availableBenefits] = await db.query<RowDataPacket[]>(
      `
      SELECT benefit_key, benefit_name, benefit_description, unlock_level, benefit_category
      FROM level_benefits
      WHERE unlock_level > ? AND is_active = 1
      ORDER BY unlock_level ASC
      LIMIT 5
      `,
      [currentLevel]
    );

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        level: currentLevel,
        progressionScore: currentScore,
        buyingScore: toNumber(user.buying_score),
        sellingScore: toNumber(user.selling_score),
        qualityBonus: toNumber(user.quality_bonus),
        penalties: toNumber(user.penalties),
        totalTransactions: toNumber(user.total_transactions),
        totalBought: toNumber(user.total_bought),
        totalSold: toNumber(user.total_sold),
        timesBought: toNumber(user.times_bought),
        timesSold: toNumber(user.times_sold),
        lastCalculatedAt: user.level_last_calculated_at,
        lastChangedAt: user.level_last_changed_at,
      },
      progress: {
        currentLevel,
        nextLevel: currentLevel + 1,
        currentScore,
        nextLevelScore: Math.round(nextLevelScore),
        progressPercent: Math.round(progressPercent * 100) / 100,
      },
      benefits: {
        unlocked: benefits.map((b: any) => ({
          key: b.benefit_key,
          name: normalizeBenefitText(b.benefit_name),
          unlockedAtLevel: b.unlocked_at_level,
          unlockedAt: b.unlocked_at,
        })),
        available: availableBenefits.map((b: any) => ({
          key: b.benefit_key,
          name: normalizeBenefitText(b.benefit_name),
          description: normalizeBenefitText(b.benefit_description),
          unlockLevel: b.unlock_level,
          category: b.benefit_category,
        })),
      },
    });
  } catch (error) {
    console.error("[API/level/stats] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
