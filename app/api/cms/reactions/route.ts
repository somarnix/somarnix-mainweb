import { getAuthUser } from "@/lib/auth";
import {
  getCmsReactionSummary,
  getPublishedCmsEntryById,
  setCmsEntryFavorite,
  setCmsEntryLike,
} from "@/lib/cms";

export const runtime = "nodejs";

type ReactionAction = "like" | "favorite";

function readPostId(value: unknown) {
  const postId = Math.floor(Number(value ?? 0));
  return Number.isFinite(postId) && postId > 0 ? postId : 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = readPostId(url.searchParams.get("postId"));
    if (!postId) {
      return Response.json({
        likeCount: 0,
        favoriteCount: 0,
        liked: false,
        favorited: false,
      });
    }

    const post = await getPublishedCmsEntryById(postId);
    if (!post) {
      return Response.json({ error: "Content not found" }, { status: 404 });
    }

    const auth = await getAuthUser(req).catch(() => null);
    return Response.json(await getCmsReactionSummary(post.id, auth?.userId ?? null));
  } catch (error) {
    console.error("GET /api/cms/reactions failed:", error);
    return Response.json({ error: "Failed to load reactions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req).catch(() => null);
    if (!auth?.userId) {
      return Response.json({ error: "Login required" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const postId = readPostId(body.postId);
    const action = body.action === "favorite" ? "favorite" : body.action === "like" ? "like" : null;
    const enabled = body.enabled === true;

    if (!postId) {
      return Response.json({ error: "Invalid post" }, { status: 400 });
    }
    if (!action) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const post = await getPublishedCmsEntryById(postId);
    if (!post) {
      return Response.json({ error: "Content not found" }, { status: 404 });
    }

    if ((action as ReactionAction) === "like") {
      await setCmsEntryLike({ entryId: post.id, userId: auth.userId, liked: enabled });
    } else {
      await setCmsEntryFavorite({
        entryId: post.id,
        userId: auth.userId,
        favorited: enabled,
      });
    }

    return Response.json(await getCmsReactionSummary(post.id, auth.userId));
  } catch (error) {
    console.error("POST /api/cms/reactions failed:", error);
    return Response.json({ error: "Failed to update reactions" }, { status: 500 });
  }
}
