import { getAuthUser } from "@/lib/auth";
import {
  createCmsEntry,
  deleteCmsEntry,
  ensureCmsTables,
  listCmsEntries,
  normalizeCmsContentType,
  normalizeCmsSlug,
  normalizeCmsStatus,
  updateCmsEntry,
  type CmsInput,
} from "@/lib/cms";

export const runtime = "nodejs";

function readString(value: unknown, max = 0): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!max || normalized.length <= max) return normalized;
  return normalized.slice(0, max);
}

function readBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return false;
}

function readNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeVideoUrl(value: string): string {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function isSupportedShortVideoUrl(value: string): boolean {
  try {
    const url = new URL(normalizeVideoUrl(value));
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtu.be" ||
      host.includes("youtube.com") ||
      host.includes("facebook.com") ||
      host.includes("fb.watch") ||
      host.includes("tiktok.com")
    );
  } catch {
    return false;
  }
}

async function requireAdmin(req: Request) {
  const auth = await getAuthUser(req);
  return auth?.role === "admin" ? auth : null;
}

function readCmsInput(body: Record<string, unknown>, authorId: number): CmsInput | Response {
  const contentType = normalizeCmsContentType(body.contentType);
  const slug = normalizeCmsSlug(body.slug);
  const title = readString(body.title, 255);
  const rawContent = readString(body.content, 200000);
  const status = normalizeCmsStatus(body.status);
  const excerpt = readString(body.excerpt, 5000) || null;
  const featuredImageUrl = contentType === "short" ? null : readString(body.featuredImageUrl, 2000) || null;
  const videoUrl = normalizeVideoUrl(readString(body.videoUrl, 2000)) || null;
  const seoTitle = readString(body.seoTitle, 255) || null;
  const seoDescription = readString(body.seoDescription, 500) || null;
  const menuLabel = readString(body.menuLabel, 120) || null;
  const showInMenu = readBoolean(body.showInMenu);
  const sortOrder = Math.floor(readNumber(body.sortOrder, 0));

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }
  if (!slug) {
    return Response.json({ error: "Slug is required" }, { status: 400 });
  }
  const content = rawContent || (contentType === "short" ? title : "");

  if (!content) {
    return Response.json({ error: "Content is required" }, { status: 400 });
  }
  if (contentType === "short" && !videoUrl) {
    return Response.json({ error: "Video URL is required for shorts" }, { status: 400 });
  }
  if (contentType === "short" && videoUrl && !isSupportedShortVideoUrl(videoUrl)) {
    return Response.json({ error: "Shorts support YouTube, Facebook, and TikTok video links" }, { status: 400 });
  }

  return {
    contentType,
    slug,
    title,
    excerpt,
    content,
    status,
    featuredImageUrl,
    videoUrl,
    seoTitle,
    seoDescription,
    menuLabel,
    showInMenu,
    sortOrder,
    authorId,
  };
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await ensureCmsTables();
    const url = new URL(req.url);
    const rawType = url.searchParams.get("type");
    const type = rawType === "page" || rawType === "post" || rawType === "short" ? rawType : undefined;
    const items = await listCmsEntries(type);
    return Response.json({
      items,
      stats: {
        total: items.length,
        pages: items.filter((item) => item.contentType === "page").length,
        posts: items.filter((item) => item.contentType === "post").length,
        shorts: items.filter((item) => item.contentType === "short").length,
        published: items.filter((item) => item.status === "published").length,
        drafts: items.filter((item) => item.status === "draft").length,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/cms failed:", error);
    return Response.json({ error: "Failed to load CMS content" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const input = readCmsInput(body, auth.userId);
    if (input instanceof Response) return input;
    const id = await createCmsEntry(input);
    return Response.json({ ok: true, id, items: await listCmsEntries() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("uniq_cms_entries_type_slug") || message.includes("Duplicate entry")) {
      return Response.json({ error: "That slug already exists for this content type" }, { status: 409 });
    }
    console.error("POST /api/admin/cms failed:", error);
    return Response.json({ error: "Failed to create CMS content" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = Math.floor(readNumber(body.id, 0));
    if (id <= 0) {
      return Response.json({ error: "Invalid content id" }, { status: 400 });
    }
    const input = readCmsInput(body, auth.userId);
    if (input instanceof Response) return input;
    await updateCmsEntry(id, input);
    return Response.json({ ok: true, items: await listCmsEntries() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("uniq_cms_entries_type_slug") || message.includes("Duplicate entry")) {
      return Response.json({ error: "That slug already exists for this content type" }, { status: 409 });
    }
    console.error("PATCH /api/admin/cms failed:", error);
    return Response.json({ error: "Failed to update CMS content" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = Math.floor(readNumber(body.id, 0));
    if (id <= 0) {
      return Response.json({ error: "Invalid content id" }, { status: 400 });
    }
    await deleteCmsEntry(id);
    return Response.json({ ok: true, items: await listCmsEntries() });
  } catch (error) {
    console.error("DELETE /api/admin/cms failed:", error);
    return Response.json({ error: "Failed to delete CMS content" }, { status: 500 });
  }
}
