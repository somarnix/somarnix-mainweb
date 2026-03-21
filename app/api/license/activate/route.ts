/**
 * POST /api/license/activate
 * 
 * Activate a license key on a device
 * Returns JWT token for API calls and offline payload for offline tools
 * 
 * Request:
 * {
 *   slug: string,
 *   licenseKey: string,
 *   deviceId: string,
 *   deviceInfo?: {
 *     platform: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web',
 *     platformVersion?: string,
 *     appVersion?: string,
 *     cpuCores?: number,
 *     totalMemory?: number,
 *     screenResolution?: string
 *   }
 * }
 */

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/auth";
import {
  validateLicenseKey,
  registerDeviceActivation,
  signToolLicenseToken,
  signOfflineToolLicensePayload,
  checkRateLimit,
  getClientIp,
  logLicenseAction,
  toDate,
  type DeviceInfo,
} from "@/lib/tool-license-enhanced";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      slug,
      licenseKey,
      deviceId,
      deviceInfo,
    }: {
      slug: string;
      licenseKey: string;
      deviceId: string;
      deviceInfo?: DeviceInfo;
    } = body;

    // Validate required fields
    if (!slug || !licenseKey || !deviceId) {
      return NextResponse.json(
        { error: "slug, licenseKey, and deviceId are required" },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);

    // Rate limiting check
    const rateLimit = await checkRateLimit(licenseKey, ip, deviceId, "activate", 10, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many activation attempts",
          retryAfter: rateLimit.retryAfter,
          blockedUntil: rateLimit.blockedUntil,
        },
        { status: 429 }
      );
    }

    // Validate license key
    const validation = await validateLicenseKey(licenseKey, slug, deviceId, auth.userId);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason || "Invalid license" },
        { status: 403 }
      );
    }

    // Register device activation
    const { deviceCount, maxDevices } = await registerDeviceActivation(
      validation.licenseId!,
      deviceId,
      deviceInfo
    );

    // Generate JWT token (24 hour validity)
    const expiresAt = toDate(validation.expiresAt ?? null);
    const token = signToolLicenseToken(
      {
        userId: validation.userId!,
        productId: validation.productId!,
        licenseId: validation.licenseId!,
        slug,
        deviceId,
      },
      expiresAt,
      randomUUID()
    );

    // Generate offline payload for offline-capable tools
    const nextCheckAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const boundedNextCheck =
      expiresAt && expiresAt.getTime() < nextCheckAt.getTime() ? expiresAt : nextCheckAt;

    const offlinePayload = {
      licenseId: validation.licenseId!,
      userId: validation.userId!,
      productId: validation.productId!,
      slug,
      machineId: deviceId,
      expiresAt: validation.expiresAt || null,
      nextCheckAt: boundedNextCheck.toISOString(),
    };
    const signature = signOfflineToolLicensePayload(offlinePayload);

    // Log activation
    await logLicenseAction("activate", validation.licenseId!, {
      userId: validation.userId,
      deviceId,
      ip,
      newValue: { deviceCount, maxDevices },
    });

    return NextResponse.json({
      ok: true,
      token,
      expiresAt: validation.expiresAt,
      machineId: deviceId,
      maxDevices,
      deviceCount,
      offlinePayload,
      signature,
      nextCheckAt: boundedNextCheck.toISOString(),
    });
  } catch (error) {
    console.error("[API/license/activate] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
