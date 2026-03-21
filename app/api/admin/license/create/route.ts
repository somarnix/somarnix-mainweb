/**
 * POST /api/admin/license/create
 * 
 * Create a new license key for a user (admin only)
 * 
 * Request:
 * {
 *   productId: number,
 *   userId: number,
 *   orderId?: number,
 *   maxDevices?: number,
 *   durationDays?: number | null (null = lifetime),
 *   reason?: string
 * }
 */

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/auth";
import { generateLicenseKey, logLicenseAction, getClientIp } from "@/lib/tool-license-enhanced";
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
      productId,
      userId,
      orderId,
      maxDevices = 3,
      durationDays,
      reason,
    }: {
      productId: number;
      userId: number;
      orderId?: number;
      maxDevices?: number;
      durationDays?: number | null;
      reason?: string;
    } = body;

    if (!productId || !userId) {
      return NextResponse.json(
        { error: "productId and userId are required" },
        { status: 400 }
      );
    }

    // Verify product exists and is a tool
    const [productRows] = await db.query<RowDataPacket[]>(
      `
      SELECT p.id, p.title, c.name AS category
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      WHERE p.id = ? AND c.name = 'tools' AND p.is_active = 1
      LIMIT 1
      `,
      [productId]
    );

    if (productRows.length === 0) {
      return NextResponse.json(
        { error: "Tool product not found" },
        { status: 404 }
      );
    }

    // Verify user exists
    const [userQueryRows] = await db.query<RowDataPacket[]>(
      `SELECT id, email FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (userQueryRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate unique license key
    let licenseKey = generateLicenseKey();
    let exists = true;

    while (exists) {
      const [checkRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM tool_license_keys WHERE license_key = ? LIMIT 1`,
        [licenseKey]
      );
      if (checkRows.length === 0) {
        exists = false;
      } else {
        licenseKey = generateLicenseKey();
      }
    }

    // Calculate expiry
    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    // Insert license
    const [result] = await db.query<ResultSetHeader>(
      `
      INSERT INTO tool_license_keys (
        order_id, product_id, user_id, license_key,
        max_devices, status, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?)
      `,
      [orderId || null, productId, userId, licenseKey, maxDevices, expiresAt]
    );

    const licenseId = result.insertId;

    // Log the action
    const ip = getClientIp(req);
    await logLicenseAction("create", licenseId, {
      adminId: auth.userId,
      userId,
      ip,
      reason: reason || "Manual license creation by admin",
      newValue: {
        licenseKey,
        productId,
        maxDevices,
        expiresAt: expiresAt?.toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      licenseId,
      licenseKey,
      expiresAt: expiresAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("[API/admin/license/create] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
