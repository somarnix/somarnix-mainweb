import { getAuthUser } from "@/lib/auth";
import { listCmsFavoriteEntriesForUser } from "@/lib/cms";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req).catch(() => null);
    if (!auth?.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await listCmsFavoriteEntriesForUser(auth.userId);
    return Response.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        contentType: entry.contentType,
        title: entry.title,
        slug: entry.slug,
        excerpt: entry.excerpt,
        featuredImageUrl: entry.featuredImageUrl,
        publishedAt: entry.publishedAt,
        href: `/news/${entry.slug}`,
      })),
    });
  } catch (error) {
    console.error("GET /api/cms/favorites failed:", error);
    return Response.json({ error: "Failed to load saved news" }, { status: 500 });
  }
}
