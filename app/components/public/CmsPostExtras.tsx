"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bookmark,
  Copy,
  Facebook,
  Heart,
  Linkedin,
  LogIn,
  MessageCircle,
  Send,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { useAuth } from "@/app/contexts/AuthContext";

type CmsComment = {
  id: number;
  parentId: number | null;
  userId: number | null;
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  body: string;
  likeCount: number;
  dislikeCount: number;
  viewerReaction: "like" | "dislike" | null;
  createdAt: string | null;
};

type CmsPostExtrasProps = {
  postId: number;
  title: string;
  excerpt?: string | null;
};

type CmsReactionState = {
  likeCount: number;
  favoriteCount: number;
  liked: boolean;
  favorited: boolean;
};

function formatCommentDate(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function CmsPostExtras({ postId, title, excerpt }: CmsPostExtrasProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<CmsComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reactionSaving, setReactionSaving] = useState<"like" | "favorite" | null>(null);
  const [commentSaving, setCommentSaving] = useState<number | "root" | null>(null);
  const [commentReactionSaving, setCommentReactionSaving] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState<Record<number, string>>({});
  const [showAllComments, setShowAllComments] = useState(false);
  const [reactions, setReactions] = useState<CmsReactionState>({
    likeCount: 0,
    favoriteCount: 0,
    liked: false,
    favorited: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cms/comments?postId=${postId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const loadReactions = useCallback(async () => {
    const res = await fetch(`/api/cms/reactions?postId=${postId}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setReactions({
      likeCount: Number(data.likeCount ?? 0),
      favoriteCount: Number(data.favoriteCount ?? 0),
      liked: data.liked === true,
      favorited: data.favorited === true,
    });
  }, [postId]);

  useEffect(() => {
    void loadReactions();
  }, [isAuthenticated, loadReactions]);

  const submitComment = async (parentId?: number) => {
    if (!isAuthenticated) {
      setMessage("Please login to comment.");
      return;
    }

    const normalizedBody = (parentId ? replyBody[parentId] ?? "" : body).trim();
    if (!normalizedBody) {
      setMessage("Write a comment first.");
      return;
    }

    try {
      if (parentId) {
        setCommentSaving(parentId);
      } else {
        setSaving(true);
        setCommentSaving("root");
      }
      setMessage(null);
      const res = await fetch("/api/cms/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          postId,
          parentId,
          body: normalizedBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to post comment");
      setComments(Array.isArray(data.comments) ? data.comments : []);
      if (parentId) {
        setReplyBody((prev) => ({ ...prev, [parentId]: "" }));
        setReplyingTo(null);
      } else {
        setBody("");
      }
      setMessage(parentId ? "Reply posted." : "Comment posted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setSaving(false);
      setCommentSaving(null);
    }
  };

  const toggleCommentReaction = async (comment: CmsComment, reaction: "like" | "dislike") => {
    if (!isAuthenticated) {
      setMessage("Please login to react to comments.");
      return;
    }

    const enabled = comment.viewerReaction !== reaction;
    try {
      setCommentReactionSaving(comment.id);
      setMessage(null);
      const res = await fetch("/api/cms/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          postId,
          commentId: comment.id,
          reaction,
          enabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update comment");
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update comment");
    } finally {
      setCommentReactionSaving(null);
    }
  };

  const toggleReaction = async (action: "like" | "favorite") => {
    if (!isAuthenticated) {
      setMessage(action === "like" ? "Please login to like this news." : "Please login to save this news.");
      return;
    }

    const enabled = action === "like" ? !reactions.liked : !reactions.favorited;
    try {
      setReactionSaving(action);
      setMessage(null);
      const res = await fetch("/api/cms/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId, action, enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update");
      setReactions({
        likeCount: Number(data.likeCount ?? 0),
        favoriteCount: Number(data.favoriteCount ?? 0),
        liked: data.liked === true,
        favorited: data.favorited === true,
      });
      setMessage(
        action === "like"
          ? enabled
            ? "Liked."
            : "Like removed."
          : enabled
            ? "Saved to favorites."
            : "Removed from favorites."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setReactionSaving(null);
    }
  };

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: excerpt || title, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Link copied.");
    } catch {
      setMessage("Share was cancelled.");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Link copied.");
    } catch {
      setMessage("Could not copy link.");
    }
  };

  const shareLinks = [
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Send,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: MessageCircle,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: Linkedin,
    },
  ];
  const commenterName =
    user?.username ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Reader";
  const rootComments = comments.filter((comment) => !comment.parentId);
  const repliesByParentId = comments.reduce<Record<number, CmsComment[]>>((acc, comment) => {
    if (!comment.parentId) return acc;
    acc[comment.parentId] = [...(acc[comment.parentId] ?? []), comment];
    return acc;
  }, {});
  const visibleComments = showAllComments ? rootComments : rootComments.slice(0, 5);
  const hiddenCommentCount = Math.max(0, rootComments.length - visibleComments.length);
  const getCommentAuthor = (comment: CmsComment) => comment.authorUsername || comment.authorName || "Reader";
  const getCommentInitial = (comment: CmsComment) =>
    getCommentAuthor(comment).replace(/^@/, "").slice(0, 1).toUpperCase() || "R";

  return (
    <section className="mt-12 space-y-8 border-t border-slate-200 pt-8 dark:border-slate-800">
      <div>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">News actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void toggleReaction("like")}
            disabled={reactionSaving === "like"}
            aria-pressed={reactions.liked}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              reactions.liked
                ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Heart className={`h-4 w-4 ${reactions.liked ? "fill-current" : ""}`} />
            Like
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs dark:bg-slate-950/50">
              {reactions.likeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => void toggleReaction("favorite")}
            disabled={reactionSaving === "favorite"}
            aria-pressed={reactions.favorited}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              reactions.favorited
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${reactions.favorited ? "fill-current" : ""}`} />
            Save
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs dark:bg-slate-950/50">
              {reactions.favoriteCount}
            </span>
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">Share this news</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {shareLinks.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Copy className="h-4 w-4" />
            Copy link
          </button>
          <button
            type="button"
            onClick={() => void nativeShare()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Share2 className="h-4 w-4" />
            More
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">
            Comments
          </h2>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {comments.length}
          </span>
        </div>

        <div className="pt-5">
          {isAuthenticated ? (
            <>
              <div className="flex gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold uppercase text-white">
                  {commenterName.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    className="min-h-10 w-full resize-none border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-white"
                    placeholder="Add a comment..."
                    maxLength={2000}
                  />
                  {body.trim() ? (
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBody("");
                          setMessage(null);
                        }}
                        className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitComment()}
                        disabled={saving}
                        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {saving ? "Posting..." : "Comment"}
                      </button>
                    </div>
                  ) : null}
                  {message ? <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</div> : null}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 dark:border-slate-700 dark:bg-slate-950">
              <div>
                <div className="font-semibold text-slate-950 dark:text-white">
                  Login to comment
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  You can read comments, but only logged-in users can post, like, and save news.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-5">
          {loading ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              Loading comments...
            </div>
          ) : null}
          {!loading && comments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              No comments yet.
            </div>
          ) : null}
          {visibleComments.map((comment) => {
            const author = getCommentAuthor(comment);
            const replies = repliesByParentId[comment.id] ?? [];
            const replyText = replyBody[comment.id] ?? "";

            return (
            <article
              key={comment.id}
              className="flex gap-3"
            >
              {comment.authorAvatarUrl ? (
                <img
                  src={comment.authorAvatarUrl}
                  alt={author}
                  className="size-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {getCommentInitial(comment)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-bold text-slate-950 dark:text-white">
                    @{author.replace(/^@/, "")}
                  </div>
                  <time className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatCommentDate(comment.createdAt)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200">
                  {comment.body}
                </p>
                <div className="mt-2 flex items-center gap-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <button
                    type="button"
                    disabled={commentReactionSaving === comment.id}
                    onClick={() => void toggleCommentReaction(comment, "like")}
                    className={`inline-flex items-center gap-1 hover:text-slate-950 disabled:opacity-60 dark:hover:text-white ${
                      comment.viewerReaction === "like" ? "text-blue-600 dark:text-blue-300" : ""
                    }`}
                  >
                    <ThumbsUp className={`size-4 ${comment.viewerReaction === "like" ? "fill-current" : ""}`} />
                    <span>{comment.likeCount}</span>
                  </button>
                  <button
                    type="button"
                    disabled={commentReactionSaving === comment.id}
                    onClick={() => void toggleCommentReaction(comment, "dislike")}
                    className={`inline-flex items-center gap-1 hover:text-slate-950 disabled:opacity-60 dark:hover:text-white ${
                      comment.viewerReaction === "dislike" ? "text-blue-600 dark:text-blue-300" : ""
                    }`}
                    aria-label="Dislike comment"
                  >
                    <ThumbsDown className={`size-4 ${comment.viewerReaction === "dislike" ? "fill-current" : ""}`} />
                    {comment.dislikeCount > 0 ? <span>{comment.dislikeCount}</span> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyingTo((value) => (value === comment.id ? null : comment.id))}
                    className="hover:text-slate-950 dark:hover:text-white"
                  >
                    Reply
                  </button>
                </div>
                {replyingTo === comment.id ? (
                  <div className="mt-3 flex gap-3">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold uppercase text-white">
                      {commenterName.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <textarea
                        value={replyText}
                        onChange={(event) =>
                          setReplyBody((prev) => ({ ...prev, [comment.id]: event.target.value }))
                        }
                        className="min-h-9 w-full resize-none border-0 border-b border-slate-300 bg-transparent px-0 py-1.5 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-white"
                        placeholder="Add a reply..."
                        maxLength={2000}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void submitComment(comment.id)}
                          disabled={commentSaving === comment.id || !replyText.trim()}
                          className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {commentSaving === comment.id ? "Replying..." : "Reply"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {replies.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {replies.map((reply) => {
                      const replyAuthor = getCommentAuthor(reply);
                      return (
                        <div key={reply.id} className="flex gap-3">
                          {reply.authorAvatarUrl ? (
                            <img
                              src={reply.authorAvatarUrl}
                              alt={replyAuthor}
                              className="size-8 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {getCommentInitial(reply)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-bold text-slate-950 dark:text-white">
                                @{replyAuthor.replace(/^@/, "")}
                              </div>
                              <time className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {formatCommentDate(reply.createdAt)}
                              </time>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200">
                              {reply.body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </article>
            );
          })}
          {rootComments.length > 5 ? (
            <button
              type="button"
              onClick={() => setShowAllComments((value) => !value)}
              className="rounded-full px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              {showAllComments ? "View less" : `View more ${hiddenCommentCount}`}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
