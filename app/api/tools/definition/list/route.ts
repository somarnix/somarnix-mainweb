/**
 * GET /api/tools/definition/list
 * 
 * Returns a list of active tool definitions for the public catalog
 * Supports filtering by category, platform, and featured status
 */

import { NextResponse } from "next/server";
import { getToolDefinitions } from "@/lib/tool-license-enhanced";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 1 minute

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") || undefined;
    const platform = url.searchParams.get("platform") || undefined;
    const toolKind = url.searchParams.get("toolKind") || undefined;
    const featured = url.searchParams.get("featured") === "true";

    const tools = await getToolDefinitions({
      category,
      platform,
      toolKind,
      featured,
      active: true,
    });

    // Return only public-safe fields
    const publicTools = tools.map((tool) => ({
      id: tool.id,
      productId: tool.product_id,
      slug: tool.canonical_slug,
      name: tool.display_name,
      description: tool.short_description,
      kind: tool.tool_kind,
      category: tool.tool_category,
      platform: tool.platform,
      accessModel: tool.access_model,
      deliveryModel: tool.delivery_model,
      requiresLicense: tool.requires_license === 1,
      deviceLimit: tool.default_device_limit,
      allowOfflineMode: tool.allow_offline_mode === 1,
      launchPath: tool.launch_path,
      currentVersion: tool.current_version,
      isBeta: tool.is_beta === 1,
      config: tool.config_json,
    }));

    return NextResponse.json({
      tools: publicTools,
      count: publicTools.length,
    });
  } catch (error) {
    console.error("[API/tools/definition/list] Error:", error);
    return NextResponse.json(
      { error: "Failed to load tools", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
