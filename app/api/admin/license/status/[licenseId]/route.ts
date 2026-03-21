/**
 * GET /api/admin/license/status/[licenseId]
 * 
 * Get detailed license status and device list (admin only)
 */

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ licenseId: string }> }
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
    const { licenseId } = await params;
    const lid = parseInt(licenseId);

    if (Number.isNaN(lid)) {
      return NextResponse.json({ error: "Invalid license ID" }, { status: 400 });
    }

    // Get license details
    const [licenseRows] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        tlk.*,
        p.title AS product_title,
        p.slug AS product_slug,
        u.email AS user_email,
        u.username AS user_username,
        o.order_number
      FROM tool_license_keys tlk
      JOIN products p ON p.id = tlk.product_id
      JOIN users u ON u.id = tlk.user_id
      LEFT JOIN orders o ON o.id = tlk.order_id
      WHERE tlk.id = ?
      LIMIT 1
      `,
      [lid]
    );

    if (licenseRows.length === 0) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const license = licenseRows[0];

    // Get device activations
    const [deviceRows] = await db.query<RowDataPacket[]>(
      `
      SELECT device_id, created_at, last_seen_at
      FROM tool_license_activations
      WHERE license_id = ?
      ORDER BY last_seen_at DESC
      `,
      [lid]
    );

    // Get audit logs
    const [auditRows] = await db.query<RowDataPacket[]>(
      `
      SELECT action, reason, created_at, ip_address, device_id, metadata
      FROM license_audit_logs
      WHERE target_license_id = ?
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [lid]
    );

    return NextResponse.json({
      license: {
        id: license.id,
        licenseKey: license.license_key,
        status: license.status,
        maxDevices: license.max_devices,
        expiresAt: license.expires_at,
        createdAt: license.created_at,
        updatedAt: license.updated_at,
        product: {
          id: license.product_id,
          title: license.product_title,
          slug: license.product_slug,
        },
        user: {
          id: license.user_id,
          email: license.user_email,
          username: license.user_username,
        },
        order: {
          id: license.order_id,
          orderNumber: license.order_number,
        },
      },
      devices: deviceRows.map((d: any) => ({
        deviceId: d.device_id,
        activatedAt: d.created_at,
        lastSeenAt: d.last_seen_at,
      })),
      deviceCount: deviceRows.length,
      auditLogs: auditRows.map((a: any) => ({
        action: a.action,
        reason: a.reason,
        createdAt: a.created_at,
        ipAddress: a.ip_address,
        deviceId: a.device_id,
        metadata: a.metadata ? JSON.parse(a.metadata) : null,
      })),
    });
  } catch (error) {
    console.error("[API/admin/license/status] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
