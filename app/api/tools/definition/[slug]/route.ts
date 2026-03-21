/**
 * GET /api/tools/definition/[slug]
 * 
 * Returns a single tool definition by slug
 * Used for tool detail pages
 */

import { NextResponse } from "next/server";
import { getToolDefinition } from "@/lib/tool-license-enhanced";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tool = await getToolDefinition(slug);

    if (!tool) {
      return NextResponse.json(
        { error: "Tool not found" },
        { status: 404 }
      );
    }

    // Return public-safe fields
    return NextResponse.json({
      tool: {
        id: tool.id,
        productId: tool.product_id,
        slug: tool.canonical_slug,
        name: tool.display_name,
        description: tool.short_description,
        longDescription: tool.long_description,
        kind: tool.tool_kind,
        category: tool.tool_category,
        platform: tool.platform,
        accessModel: tool.access_model,
        deliveryModel: tool.delivery_model,
        requiresLicense: tool.requires_license === 1,
        deviceLimit: tool.default_device_limit,
        maxDeviceLimit: tool.max_device_limit,
        allowOfflineMode: tool.allow_offline_mode === 1,
        offlineGracePeriodHours: tool.offline_grace_period_hours,
        currentVersion: tool.current_version,
        versionChangelog: tool.version_changelog,
        minClientVersion: tool.min_client_version,
        isBeta: tool.is_beta === 1,
        config: tool.config_json,
      },
    });
  } catch (error) {
    console.error("[API/tools/definition/slug] Error:", error);
    return NextResponse.json(
      { error: "Failed to load tool", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
