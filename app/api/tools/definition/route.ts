import { resolveToolDefinitionBySlug, hasToolDefinitionSchema } from "@/lib/tool-definitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") || "").trim();

    if (!slug) {
      return Response.json({ error: "slug is required" }, { status: 400 });
    }

    const hasSchema = await hasToolDefinitionSchema();
    if (!hasSchema) {
      return Response.json(
        {
          error: "Tool definition schema is missing. Run sql/11-tool-definitions.sql first.",
        },
        { status: 503 }
      );
    }

    const tool = await resolveToolDefinitionBySlug(slug);
    if (!tool) {
      return Response.json({ error: "Tool definition not found" }, { status: 404 });
    }

    return Response.json({ tool });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to load tool definition",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
