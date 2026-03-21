/**
 * POST /api/tools/download
 * 
 * Request a secure, short-lived download URL for a licensed tool
 * 
 * Flow:
 * 1. Validate user has valid license for the tool
 * 2. Create one-time download token
 * 3. Generate signed URL from R2/S3 storage
 * 4. Return download URL (expires in 15 minutes)
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
 *   downloadUrl: string,
 *   fileName: string,
 *   fileSize?: number,
 *   expiresAt: string,
 *   checksum?: { sha256: string }
 * }
 */

import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAuthUser } from "@/lib/auth";
import {
  validateToken,
  getToolDefinition,
  createDownloadToken,
  getClientIp,
  checkRateLimit,
} from "@/lib/tool-license-enhanced";

export const runtime = "nodejs";

/**
 * Generate a signed URL for R2/S3 storage
 * In production, use your cloud provider's SDK
 */
function generateSignedStorageUrl(
  bucket: string,
  key: string,
  expiresMinutes: number = 15
): string {
  // TODO: Replace with actual R2/S3 signed URL generation
  // Example for Cloudflare R2:
  // import { S3Client } from '@aws-sdk/client-s3';
  // import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  
  const baseUrl = process.env.STORAGE_R2_PUBLIC_URL || `https://${bucket}.r2.cloudflarestorage.com`;
  
  // For now, return a placeholder - implement with your storage provider SDK
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  const timestamp = expiresAt.getTime();
  
  // This is a simplified example - use proper signing in production
  const signature = createHash("sha256")
    .update(`${key}${timestamp}${process.env.STORAGE_R2_SECRET_KEY || "dev-secret"}`)
    .digest("hex");
  
  return `${baseUrl}/${key}?X-Amz-Expires=${expiresMinutes * 60}&X-Amz-Signature=${signature}`;
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Rate limiting for downloads (stricter)
    const rateLimit = await checkRateLimit(token, ip, deviceId, "download", 5, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many download requests",
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Validate license token
    const validation = await validateToken(token, slug, deviceId);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason || "Invalid license" },
        { status: 403 }
      );
    }

    // Get tool definition
    const tool = await getToolDefinition(slug);

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // Check if tool is downloadable
    if (!tool.delivery_model.includes("download")) {
      return NextResponse.json(
        { error: "This tool is not available for download" },
        { status: 400 }
      );
    }

    // Build file path
    const version = tool.current_version || "1.0.0";
    const fileExtension = tool.file_extension || ".zip";
    const fileName = `${tool.canonical_slug}-v${version}${fileExtension}`;
    const filePath = `${tool.storage_key_prefix || "tools/"}${fileName}`;

    // Create download token (one-time use, 15 minutes)
    const { token: downloadToken, expiresAt } = await createDownloadToken(
      auth.userId,
      validation.licenseId!,
      tool.id,
      filePath,
      fileName,
      1, // max downloads
      15, // expires in minutes
      ip,
      req.headers.get("user-agent") || undefined
    );

    // Generate signed storage URL
    const storageBucket = tool.storage_bucket || process.env.STORAGE_R2_BUCKET || "tools";
    const signedUrl = generateSignedStorageUrl(storageBucket, filePath);

    return NextResponse.json({
      ok: true,
      downloadUrl: `${signedUrl}&download_token=${downloadToken}`,
      fileName,
      expiresAt,
      checksum: {
        // TODO: Calculate and store actual checksums
        sha256: "placeholder_sha256_hash",
      },
    });
  } catch (error) {
    console.error("[API/tools/download] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
