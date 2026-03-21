/**
 * POST /api/device/remove
 * 
 * Remove a device from a license (frees up a device slot)
 * Can be called by the license owner or admin
 * 
 * Request:
 * {
 *   licenseId: number,
 *   deviceId: string
 * }
 */

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { removeDeviceActivation, logLicenseAction, getClientIp } from "@/lib/tool-license-enhanced";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      licenseId,
      deviceId,
    }: {
      licenseId: number;
      deviceId: string;
    } = body;

    if (!licenseId || !deviceId) {
      return NextResponse.json(
        { error: "licenseId and deviceId are required" },
        { status: 400 }
      );
    }

    // Verify user owns this license (or is admin)
    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT tlk.*, p.slug
      FROM tool_license_keys tlk
      JOIN products p ON p.id = tlk.product_id
      WHERE tlk.id = ? AND tlk.user_id = ?
      LIMIT 1
      `,
      [licenseId, auth.userId]
    );

    if (rows.length === 0) {
      // Check if admin
      const [userRows] = await db.query<RowDataPacket[]>(
        `SELECT role FROM users WHERE id = ? LIMIT 1`,
        [auth.userId]
      );
      const userRole = userRows[0]?.role;
      
      if (userRole !== "admin") {
        return NextResponse.json(
          { error: "Not authorized to modify this license" },
          { status: 403 }
        );
      }
    }

    const slug = rows[0]?.slug || "unknown";

    // Remove device
    const result = await removeDeviceActivation(licenseId, deviceId);

    if (!result.success) {
      return NextResponse.json(
        { error: "Device not found in license" },
        { status: 404 }
      );
    }

    // Log the action
    const ip = getClientIp(req);
    await logLicenseAction("remove_device", licenseId, {
      userId: auth.userId,
      deviceId,
      ip,
      reason: "Device removed by user",
    });

    return NextResponse.json({
      ok: true,
      remainingDevices: result.remainingDevices,
    });
  } catch (error) {
    console.error("[API/device/remove] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
