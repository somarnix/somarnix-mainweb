/**
 * POST /api/admin/license/revoke
 * 
 * Revoke a license key (admin only)
 * 
 * Request:
 * {
 *   licenseId: number,
 *   reason: string
 * }
 */

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logLicenseAction, getClientIp } from "@/lib/tool-license-enhanced";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
    const body = await req.json();
    const {
      licenseId,
      reason,
    }: {
      licenseId: number;
      reason: string;
    } = body;

    if (!licenseId || !reason) {
      return NextResponse.json(
        { error: "licenseId and reason are required" },
        { status: 400 }
      );
    }

    // Get current license state
    const [licenseRows] = await db.query<RowDataPacket[]>(
      `
      SELECT id, status, license_key, product_id, user_id
      FROM tool_license_keys
      WHERE id = ?
      LIMIT 1
      `,
      [licenseId]
    );

    if (licenseRows.length === 0) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const license = licenseRows[0];
    const oldStatus = license.status;

    if (oldStatus === "revoked") {
      return NextResponse.json(
        { error: "License is already revoked" },
        { status: 400 }
      );
    }

    // Revoke license
    await db.query<ResultSetHeader>(
      `UPDATE tool_license_keys SET status = 'revoked' WHERE id = ?`,
      [licenseId]
    );

    // Remove all device activations
    await db.query<ResultSetHeader>(
      `DELETE FROM tool_license_activations WHERE license_id = ?`,
      [licenseId]
    );

    // Log the action
    const ip = getClientIp(req);
    await logLicenseAction("revoke", licenseId, {
      adminId: auth.userId,
      ip,
      reason,
      oldValue: { status: oldStatus },
      newValue: { status: "revoked" },
    });

    return NextResponse.json({
      ok: true,
      licenseId,
      revokedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API/admin/license/revoke] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
