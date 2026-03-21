/**
 * POST /api/license/validate
 * 
 * Validate a license token for web tool access
 * Used by frontend to check if user has valid access before rendering tool UI
 * 
 * Request:
 * {
 *   slug: string,
 *   token: string,
 *   deviceId: string
 * }
 */

import { NextResponse } from "next/server";
import { validateToken, checkRateLimit, getClientIp } from "@/lib/tool-license-enhanced";

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

    // Validate required fields
    if (!slug || !token || !deviceId) {
      return NextResponse.json(
        { error: "slug, token, and deviceId are required" },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);

    // Rate limiting (more permissive for validation)
    const rateLimit = await checkRateLimit(token, ip, deviceId, "validate", 100, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many validation requests",
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Validate token
    const validation = await validateToken(token, slug, deviceId);

    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        reason: validation.reason,
      });
    }

    return NextResponse.json({
      valid: true,
      expiresAt: validation.expiresAt,
      maxDevices: validation.maxDevices,
      deviceCount: validation.deviceCount,
      licenseId: validation.licenseId,
    });
  } catch (error) {
    console.error("[API/license/validate] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
