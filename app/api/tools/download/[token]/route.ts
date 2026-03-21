/**
 * GET /api/tools/download/[token]
 * 
 * Verify download token and redirect to actual file
 * This is the final step in the secure download flow
 */

import { NextResponse } from "next/server";
import { validateDownloadToken, markDownloadTokenUsed } from "@/lib/tool-license-enhanced";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate download token
    const result = await validateDownloadToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.reason || "Invalid download token" },
        { status: 400 }
      );
    }

    // Mark token as used
    await markDownloadTokenUsed(token);

    // Generate final redirect URL to storage
    // In production, this would use your actual storage URL
    const baseUrl = process.env.STORAGE_R2_PUBLIC_URL || "https://storage.example.com";
    const redirectUrl = `${baseUrl}/${result.filePath}`;

    // Redirect to the file
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[API/tools/download/token] Error:", error);
    return NextResponse.json(
      { error: "Server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
