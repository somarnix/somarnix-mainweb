/**
 * POST /api/admin/tools/definition
 * 
 * Create a new tool definition (admin only)
 * 
 * Request:
 * {
 *   productId: number,
 *   canonicalSlug: string,
 *   displayName: string,
 *   shortDescription?: string,
 *   longDescription?: string,
 *   toolKind: 'online' | 'downloadable' | 'offline_licensed' | 'embedded' | 'hybrid',
 *   toolCategory: 'ai' | 'video' | 'image' | 'productivity' | 'utility' | 'other',
 *   platform: 'any' | 'web' | 'pc' | 'mobile' | 'pc+mobile',
 *   accessModel: 'none' | 'purchase' | 'license' | 'subscription',
 *   deliveryModel: 'web' | 'download' | 'license' | 'download+license',
 *   requiresLicense?: boolean,
 *   defaultDeviceLimit?: number,
 *   maxDeviceLimit?: number,
 *   allowOfflineMode?: boolean,
 *   offlineGracePeriodHours?: number,
 *   storageProvider?: 'local' | 'r2' | 's3' | 'gcs',
 *   storageBucket?: string,
 *   storageKeyPrefix?: string,
 *   fileExtension?: string,
 *   launchPath?: string,
 *   embeddedEntry?: string,
 *   currentVersion?: string,
 *   versionChangelog?: string,
 *   minClientVersion?: string,
 *   configJson?: object,
 *   isActive?: boolean,
 *   isFeatured?: boolean,
 *   isBeta?: boolean,
 *   sortOrder?: number
 * }
 */

import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

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

    // Required fields
    const {
      productId,
      canonicalSlug,
      displayName,
      toolKind,
      toolCategory,
      platform,
      accessModel,
      deliveryModel,
    } = body;

    if (!productId || !canonicalSlug || !displayName || !toolKind || !toolCategory) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify product exists
    const [productRows] = await db.query<RowDataPacket[]>(
      `SELECT id FROM products WHERE id = ? LIMIT 1`,
      [productId]
    );

    if (productRows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check for duplicate slug
    const [existingRows] = await db.query<RowDataPacket[]>(
      `SELECT id FROM tool_definitions WHERE canonical_slug = ? LIMIT 1`,
      [canonicalSlug]
    );

    if (existingRows.length > 0) {
      return NextResponse.json(
        { error: "Tool with this slug already exists" },
        { status: 409 }
      );
    }

    // Insert tool definition
    const [result] = await db.query<ResultSetHeader>(
      `
      INSERT INTO tool_definitions (
        product_id, canonical_slug, display_name, short_description, long_description,
        tool_kind, tool_category, platform, access_model, delivery_model,
        requires_license, default_device_limit, max_device_limit,
        allow_offline_mode, offline_grace_period_hours,
        storage_provider, storage_bucket, storage_key_prefix, file_extension,
        launch_path, embedded_entry, api_endpoint, config_json,
        current_version, version_changelog, min_client_version,
        is_active, is_featured, is_beta, sort_order
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
      `,
      [
        productId,
        canonicalSlug,
        displayName,
        body.shortDescription || null,
        body.longDescription || null,
        toolKind,
        toolCategory,
        platform || "any",
        accessModel || "license",
        deliveryModel || "web",
        body.requiresLicense !== false ? 1 : 0,
        body.defaultDeviceLimit || 3,
        body.maxDeviceLimit || 10,
        body.allowOfflineMode ? 1 : 0,
        body.offlineGracePeriodHours || 72,
        body.storageProvider || "r2",
        body.storageBucket || null,
        body.storageKeyPrefix || null,
        body.fileExtension || null,
        body.launchPath || null,
        body.embeddedEntry || null,
        body.apiEndpoint || null,
        body.configJson ? JSON.stringify(body.configJson) : null,
        body.currentVersion || null,
        body.versionChangelog || null,
        body.minClientVersion || null,
        body.isActive ? 1 : 0,
        body.isFeatured ? 1 : 0,
        body.isBeta ? 1 : 0,
        body.sortOrder || 0,
      ]
    );

    return NextResponse.json({
      ok: true,
      toolId: result.insertId,
      slug: canonicalSlug,
    });
  } catch (error) {
    console.error("[API/admin/tools/definition] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
