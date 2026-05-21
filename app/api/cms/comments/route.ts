import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createCmsComment,
  getCmsComment,
  getPublishedCmsEntryById,
  listCmsComments,
  setCmsCommentReaction,
} from "@/lib/cms";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type UserDisplayRow = RowDataPacket & {
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

function readString(value: unknown, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? text.slice(0, max) : text;
}

async function getAuthDisplayName(req: Request): Promise<{
  userId: number | null;
  name: string | null;
}> {
  const auth = await getAuthUser(req).catch(() => null);
  if (!auth?.userId) return { userId: null, name: null };

  const [rows] = await db.query<UserDisplayRow[]>(
    `
    SELECT username, first_name, last_name, email
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [auth.userId]
  );

  const user = rows[0];
  const fullName = [user?.first_name, user?.last_name]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return {
    userId: auth.userId,
    name: user?.username?.trim() || fullName || user?.email || "Reader",
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = Math.floor(Number(url.searchParams.get("postId") ?? 0));
    if (!Number.isFinite(postId) || postId <= 0) {
      return Response.json({ comments: [] });
    }

    const post = await getPublishedCmsEntryById(postId);
    if (!post) {
      return Response.json({ comments: [] });
    }

    const auth = await getAuthUser(req).catch(() => null);
    return Response.json({ comments: await listCmsComments(post.id, auth?.userId ?? null) });
  } catch (error) {
    console.error("GET /api/cms/comments failed:", error);
    return Response.json({ comments: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const postId = Math.floor(Number(body.postId ?? 0));
    const parentId = Math.floor(Number(body.parentId ?? 0));
    const commentBody = readString(body.body, 2000);

    if (!Number.isFinite(postId) || postId <= 0) {
      return Response.json({ error: "Invalid post" }, { status: 400 });
    }
    const authDisplay = await getAuthDisplayName(req);
    if (!authDisplay.userId) {
      return Response.json({ error: "Login required to comment" }, { status: 401 });
    }
    if (commentBody.length < 2) {
      return Response.json({ error: "Comment is too short" }, { status: 400 });
    }

    const post = await getPublishedCmsEntryById(postId);
    if (!post) {
      return Response.json({ error: "Content not found" }, { status: 404 });
    }
    if (parentId > 0) {
      const parent = await getCmsComment(parentId);
      if (!parent || parent.entryId !== post.id) {
        return Response.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    await createCmsComment({
      entryId: post.id,
      parentId: parentId > 0 ? parentId : null,
      userId: authDisplay.userId,
      authorName: authDisplay.name || "Reader",
      body: commentBody,
    });

    return Response.json({
      ok: true,
      comments: await listCmsComments(post.id, authDisplay.userId),
    });
  } catch (error) {
    console.error("POST /api/cms/comments failed:", error);
    return Response.json({ error: "Failed to post comment" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const postId = Math.floor(Number(body.postId ?? 0));
    const commentId = Math.floor(Number(body.commentId ?? 0));
    const reaction = body.reaction === "like" || body.reaction === "dislike" ? body.reaction : null;
    const enabled = body.enabled === true;

    if (!Number.isFinite(postId) || postId <= 0 || !Number.isFinite(commentId) || commentId <= 0) {
      return Response.json({ error: "Invalid comment" }, { status: 400 });
    }
    if (enabled && !reaction) {
      return Response.json({ error: "Invalid reaction" }, { status: 400 });
    }

    const auth = await getAuthUser(req).catch(() => null);
    if (!auth?.userId) {
      return Response.json({ error: "Login required" }, { status: 401 });
    }

    const post = await getPublishedCmsEntryById(postId);
    const comment = await getCmsComment(commentId);
    if (!post || !comment || comment.entryId !== post.id) {
      return Response.json({ error: "Comment not found" }, { status: 404 });
    }

    await setCmsCommentReaction({
      commentId,
      userId: auth.userId,
      reaction: enabled ? reaction : null,
    });

    return Response.json({
      ok: true,
      comments: await listCmsComments(post.id, auth.userId),
    });
  } catch (error) {
    console.error("PATCH /api/cms/comments failed:", error);
    return Response.json({ error: "Failed to update comment reaction" }, { status: 500 });
  }
}
