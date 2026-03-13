import { NextResponse } from "next/server";
import { generateMediaWithFlowAutomation } from "@/lib/flow-backend";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await generateMediaWithFlowAutomation({
      prompt: body.prompt,
      projectId: body.projectId,
      projectUrl: body.projectUrl,
      chromeProfile: body.chromeProfile,
      connectExistingChrome: body.connectExistingChrome,
      chromeDebugPort: body.chromeDebugPort,
      mediaType: body.mediaType,
      model: body.model,
      videoMode: body.videoMode,
      orientation: body.orientation,
      variantCount: body.variantCount,
      autoRetry: body.autoRetry,
      notifyComplete: body.notifyComplete,
      maxRetries: body.maxRetries,
      keepOpen: body.keepOpen,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Backend automation failed.",
      },
      { status: 500 }
    );
  }
}
