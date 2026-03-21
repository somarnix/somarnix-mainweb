/**
 * POST /api/device/heartbeat
 * 
 * Keep-alive endpoint for active tool sessions
 * Updates last_seen_at timestamp for device activation
 * 
 * Request:
 * {
 *   slug: string,
 *   token: string,
 *   deviceId: string
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   nextHeartbeatAt: string (ISO timestamp)
 * }
 */

import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { validateToken, checkRateLimit, getClientIp, verifyToolLicenseToken } from "@/lib/tool-license-enhanced";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      slug,
      token,
      deviceId,
    }: {
      slug: string;
      token: string;
      deviceId: string;
    } = body;

    if (!slug || !token || !deviceId) {
      return NextResponse.json(
        { error: "slug, token, and deviceId are required" },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);

    // Rate limiting (permissive for heartbeats)
    const rateLimit = await checkRateLimit(token, ip, deviceId, "heartbeat", 30, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many heartbeat requests" },
        { status: 429 }
      );
    }

    // Validate token
    const validation = await validateToken(token, slug, deviceId);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason || "Invalid token" },
        { status: 403 }
      );
    }

    // Update last_seen_at
    await db.query<ResultSetHeader>(
      `
      UPDATE tool_license_activations
      SET last_seen_at = CURRENT_TIMESTAMP
      WHERE license_id = ? AND device_id = ?
      `,
      [validation.licenseId, deviceId]
    );

    // Calculate next heartbeat time (14 days or when license expires)
    const nextHeartbeatAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    if (validation.expiresAt) {
      const expiresAt = new Date(validation.expiresAt);
      if (expiresAt.getTime() < nextHeartbeatAt.getTime()) {
        // Set heartbeat before expiry
        nextHeartbeatAt.setTime(expiresAt.getTime() - 24 * 60 * 60 * 1000);
      }
    }

    return NextResponse.json({
      ok: true,
      nextHeartbeatAt: nextHeartbeatAt.toISOString(),
    });
  } catch (error) {
    console.error("[API/device/heartbeat] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
