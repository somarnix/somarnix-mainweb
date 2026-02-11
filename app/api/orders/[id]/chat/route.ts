import { NextRequest, NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type OrderRow = RowDataPacket & {
  id: number;
  order_number: string;
  user_id: number;
  state: string | null;
  delivery_title: string | null;
  delivery_message: string | null;
  delivered_at: string | Date | null;
  buyer_name: string | null;
  buyer_email: string;
  buyer_avatar: string | null;
  seller_id: number | null;
  seller_name: string | null;
  seller_email: string | null;
  seller_avatar: string | null;
  buyer_status: string | null;
  buyer_last_active_at: string | Date | null;
  seller_status: string | null;
  seller_last_active_at: string | Date | null;
};

type ConversationRow = RowDataPacket & {
  id: number;
  order_id: number;
  topic: string;
  last_message_at: string | Date | null;
};

type MessageRow = RowDataPacket & {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  attachment_url: string | null;
  created_at: string | Date | null;
  is_admin: number;
  message_type: string | null;
  sticker_path: string | null;
  deleted_at: string | Date | null;
  deleted_by: number | null;
  buyer_seen_at: string | Date | null;
  seller_seen_at: string | Date | null;
  is_pinned: number;
  edited_at: string | Date | null;
  edited_by: number | null;
  sender_name: string | null;
  sender_email: string;
  sender_avatar: string | null;
};

type MessageMetaRow = RowDataPacket & {
  id: number;
  conversation_id: number;
  order_id: number;
  sender_id: number;
  message_type: string | null;
  is_pinned: number;
  deleted_at: string | Date | null;
};

type ReactionSummaryRow = RowDataPacket & {
  message_id: number;
  emoji: string;
  total: number;
  mine: number;
};

type ReactionSummary = {
  emoji: string;
  count: number;
  reacted: boolean;
};

function parseOrderId(paramsId?: string, fallback?: string): number | null {
  const raw = (paramsId ?? fallback ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function mapPresence(status?: string | null, lastActive?: string | Date | null) {
  return {
    status: status ?? null,
    lastActiveAt:
      lastActive instanceof Date ? lastActive.toISOString() : lastActive ?? null,
  };
}

async function loadReactionMap(conversationId: number, userId: number) {
  const [rows] = await db.query<ReactionSummaryRow[]>(
    `
    SELECT
      r.message_id,
      r.emoji,
      COUNT(*) AS total,
      SUM(CASE WHEN r.user_id = ? THEN 1 ELSE 0 END) AS mine
    FROM order_chat_reactions r
    JOIN order_chat_messages m ON m.id = r.message_id
    WHERE m.conversation_id = ?
    GROUP BY r.message_id, r.emoji
    `,
    [userId, conversationId]
  );

  const map = new Map<number, ReactionSummary[]>();
  for (const row of rows) {
    const summary: ReactionSummary = {
      emoji: row.emoji,
      count: Number(row.total ?? 0),
      reacted: Number(row.mine ?? 0) > 0,
    };
    const existing = map.get(row.message_id);
    if (existing) {
      existing.push(summary);
    } else {
      map.set(row.message_id, [summary]);
    }
  }
  return map;
}

async function loadReactionsForMessage(messageId: number, userId: number) {
  const [rows] = await db.query<ReactionSummaryRow[]>(
    `
    SELECT
      r.message_id,
      r.emoji,
      COUNT(*) AS total,
      SUM(CASE WHEN r.user_id = ? THEN 1 ELSE 0 END) AS mine
    FROM order_chat_reactions r
    WHERE r.message_id = ?
    GROUP BY r.message_id, r.emoji
    `,
    [userId, messageId]
  );

  return rows.map((row) => ({
    emoji: row.emoji,
    count: Number(row.total ?? 0),
    reacted: Number(row.mine ?? 0) > 0,
  }));
}

async function fetchOrder(orderId: number) {
  const [rows] = await db.query<OrderRow[]>(
    `
    SELECT
      o.id,
      o.order_number,
      o.user_id,
      o.state,
      o.delivery_title,
      o.delivery_message,
      o.delivered_at,
      u.username AS buyer_name,
      u.email AS buyer_email,
      u.avatar_url AS buyer_avatar,
      seller_user.id AS seller_id,
      seller_user.username AS seller_name,
      seller_user.email AS seller_email,
      seller_user.avatar_url AS seller_avatar,
      buyer_presence.status AS buyer_status,
      buyer_presence.last_active_at AS buyer_last_active_at,
      seller_presence.status AS seller_status,
      seller_presence.last_active_at AS seller_last_active_at
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN (
      SELECT
        oi.order_id,
        MIN(oi.id) AS first_item_id
      FROM order_items oi
      GROUP BY oi.order_id
    ) first_items ON first_items.order_id = o.id
    LEFT JOIN order_items oi_first ON oi_first.id = first_items.first_item_id
    LEFT JOIN products seller_product ON seller_product.id = oi_first.product_id
    LEFT JOIN users seller_user ON seller_user.id = seller_product.posted_by
    LEFT JOIN user_presence buyer_presence ON buyer_presence.user_id = u.id
    LEFT JOIN user_presence seller_presence ON seller_presence.user_id = seller_user.id
    WHERE o.id = ?
    LIMIT 1
    `,
    [orderId]
  );

  return rows[0] ?? null;
}

async function ensureConversation(orderId: number, topic: string) {
  const [existing] = await db.query<ConversationRow[]>(
    `SELECT id, order_id, topic, last_message_at FROM order_conversations WHERE order_id = ? LIMIT 1`,
    [orderId]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  const [insert] = await db.query<ResultSetHeader>(
    `INSERT INTO order_conversations (order_id, topic, last_message_at) VALUES (?, ?, NULL)`,
    [orderId, topic]
  );

  return {
    id: Number(insert.insertId),
    order_id: orderId,
    topic,
    last_message_at: null,
  };
}

function mapMessage(row: MessageRow, reactions: ReactionSummary[] = []) {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    attachmentUrl: row.attachment_url,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    isAdmin: row.is_admin === 1,
    type: (row.message_type ?? "text") as "text" | "sticker" | "emoji",
    stickerPath: row.sticker_path,
    deletedAt:
      row.deleted_at instanceof Date ? row.deleted_at.toISOString() : row.deleted_at,
    deletedBy: row.deleted_by,
    buyerSeenAt:
      row.buyer_seen_at instanceof Date
        ? row.buyer_seen_at.toISOString()
        : row.buyer_seen_at,
    sellerSeenAt:
      row.seller_seen_at instanceof Date
        ? row.seller_seen_at.toISOString()
        : row.seller_seen_at,
    isPinned: row.is_pinned === 1,
    editedAt:
      row.edited_at instanceof Date ? row.edited_at.toISOString() : row.edited_at,
    editedBy: row.edited_by,
    sender: {
      name: row.sender_name,
      email: row.sender_email,
      avatarUrl: row.sender_avatar,
    },
    reactions,
  };
}

async function fetchMessageWithSender(messageId: number) {
  const [rows] = await db.query<MessageRow[]>(
    `
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      m.body,
      m.attachment_url,
      m.created_at,
      m.is_admin,
      m.message_type,
      m.sticker_path,
      m.deleted_at,
      m.deleted_by,
      m.buyer_seen_at,
      m.seller_seen_at,
      m.is_pinned,
      m.edited_at,
      m.edited_by,
      u.username AS sender_name,
      u.email AS sender_email,
      u.avatar_url AS sender_avatar
    FROM order_chat_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
    LIMIT 1
    `,
    [messageId]
  );

  return rows[0] ?? null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routeParams = await ctx.params;

  const fallback = (() => {
    try {
      const url = new URL(req.url);
      const segments = url.pathname.split("/");
      return segments[segments.length - 2];
    } catch {
      return undefined;
    }
  })();

  const orderId = parseOrderId(routeParams?.id, fallback);
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  try {
  const order = await fetchOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const isOwner = order.user_id === auth.userId;
  const isSeller = Number(order.seller_id ?? 0) === auth.userId;
  const isAdmin = auth.role === "admin";
  if (!isOwner && !isAdmin && !isSeller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const topic = order.order_number ? `Order ${order.order_number}` : "Order chat";
    const conversation = await ensureConversation(order.id, topic);

    const [messageRows] = await db.query<MessageRow[]>(
      `
      SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        m.body,
        m.attachment_url,
        m.created_at,
        m.is_admin,
        m.message_type,
        m.sticker_path,
        m.deleted_at,
        m.deleted_by,
        m.buyer_seen_at,
        m.seller_seen_at,
        m.is_pinned,
        m.edited_at,
        m.edited_by,
        u.username AS sender_name,
        u.email AS sender_email,
        u.avatar_url AS sender_avatar
      FROM order_chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC, m.id ASC
      `,
      [conversation.id]
    );

    const reactionMap = await loadReactionMap(conversation.id, auth.userId);

    const seenColumn = isOwner ? "buyer_seen_at" : "seller_seen_at";
    const otherRoleCondition = "m.sender_id <> ?";
    await db.query(
      `
      UPDATE order_chat_messages m
      SET ${seenColumn} = NOW()
      WHERE m.conversation_id = ? AND ${seenColumn} IS NULL AND ${otherRoleCondition}
      `,
      [conversation.id, auth.userId]
    );

    await db.query(
      `UPDATE order_conversations SET ${
        isOwner ? "buyer_last_read_at" : "seller_last_read_at"
      } = NOW() WHERE id = ?`,
      [conversation.id]
    );

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        orderId: order.id,
        orderNumber: order.order_number,
        topic: conversation.topic,
        lastMessageAt:
          conversation.last_message_at instanceof Date
            ? conversation.last_message_at.toISOString()
            : conversation.last_message_at,
        buyer: {
          id: order.user_id,
          name: order.buyer_name,
          email: order.buyer_email,
          avatarUrl: order.buyer_avatar,
          presence: mapPresence(order.buyer_status, order.buyer_last_active_at),
        },
        seller: {
          id: order.seller_id,
          name: order.seller_name,
          email: order.seller_email,
          avatarUrl: order.seller_avatar,
          presence: mapPresence(order.seller_status, order.seller_last_active_at),
        },
        delivery: {
          title: order.delivery_title,
          message: order.delivery_message,
          deliveredAt:
            order.delivered_at instanceof Date
              ? order.delivered_at.toISOString()
              : order.delivered_at,
        },
      },
      messages: messageRows.map((row) => mapMessage(row, reactionMap.get(row.id) ?? [])),
    });
  } catch (err) {
    console.error("order chat GET error", err);
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routeParams = await ctx.params;

  const fallback = (() => {
    try {
      const url = new URL(req.url);
      const segments = url.pathname.split("/");
      return segments[segments.length - 2];
    } catch {
      return undefined;
    }
  })();

  const orderId = parseOrderId(routeParams?.id, fallback);
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  let body: string | null = null;
  let attachmentUrl: string | null = null;
  let messageType: "text" | "sticker" | "emoji" = "text";
  let stickerPath: string | null = null;

  try {
    const payload = await req.json();
    if (typeof payload?.message === "string") {
      body = payload.message.trim();
    }
    if (typeof payload?.attachmentUrl === "string") {
      attachmentUrl = payload.attachmentUrl.trim() || null;
    }
    if (typeof payload?.type === "string") {
      const t = payload.type.toLowerCase();
      if (t === "sticker" || t === "emoji" || t === "text") {
        messageType = t;
      }
    }
    if (typeof payload?.stickerPath === "string") {
      stickerPath = payload.stickerPath.trim() || null;
    }
  } catch {
    // ignore JSON errors
  }

  if (messageType === "sticker") {
    if (!stickerPath) {
      return NextResponse.json({ error: "Sticker is required" }, { status: 400 });
    }
    body = body ?? "";
  }

  const requiresBody = messageType === "text" || messageType === "emoji";
  if (requiresBody) {
    if (!body) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }
    if (body.length > 2000) {
      body = body.slice(0, 2000);
    }
  } else {
    body = body ?? "";
  }

  try {
    const order = await fetchOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = order.user_id === auth.userId;
    const isSeller = Number(order.seller_id ?? 0) === auth.userId;
    const isAdmin = auth.role === "admin";
    if (!isOwner && !isAdmin && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const topic = order.order_number ? `Order ${order.order_number}` : "Order chat";
    const conversation = await ensureConversation(order.id, topic);

    const [insert] = await db.query<ResultSetHeader>(
      `
      INSERT INTO order_chat_messages
        (conversation_id, sender_id, is_admin, body, attachment_url, message_type, sticker_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        conversation.id,
        auth.userId,
        auth.role === "admin" ? 1 : 0,
        body,
        attachmentUrl,
        messageType,
        stickerPath,
      ]
    );

    await db.query<ResultSetHeader>(
      `UPDATE order_conversations SET last_message_at = NOW() WHERE id = ?`,
      [conversation.id]
    );

    const [rows] = await db.query<MessageRow[]>(
      `
      SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        m.body,
        m.attachment_url,
        m.created_at,
        m.is_admin,
        m.message_type,
        m.sticker_path,
        m.deleted_at,
        m.deleted_by,
        m.buyer_seen_at,
        m.seller_seen_at,
        m.is_pinned,
        m.edited_at,
        m.edited_by,
        u.username AS sender_name,
        u.email AS sender_email,
        u.avatar_url AS sender_avatar
      FROM order_chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?
      LIMIT 1
      `,
      [insert.insertId]
    );

    const message = rows[0] ? mapMessage(rows[0], []) : null;

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      message,
    });
  } catch (err) {
    console.error("order chat POST error", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routeParams = await ctx.params;
  const fallback = (() => {
    try {
      const url = new URL(req.url);
      const segments = url.pathname.split("/");
      return segments[segments.length - 2];
    } catch {
      return undefined;
    }
  })();

  const orderId = parseOrderId(routeParams?.id, fallback);
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  type PatchPayload = {
    messageId?: number;
    emoji?: string;
    action?: string;
    body?: string;
    pinned?: boolean;
  };

  let payload: PatchPayload = {};
  try {
    payload = (await req.json()) ?? {};
  } catch {
    // ignore parse errors
  }

  const messageId = Number(payload?.messageId ?? 0);
  if (!Number.isFinite(messageId) || messageId <= 0) {
    return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
  }

  const rawAction = typeof payload?.action === "string" ? payload.action.toLowerCase() : null;
  const action: "reaction" | "pin" | "edit" =
    rawAction === "pin" || rawAction === "edit" ? rawAction : "reaction";

  const emoji = typeof payload?.emoji === "string" ? payload.emoji.trim() : "";
  const editBody = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (action === "reaction") {
    if (!emoji || emoji.length > 8) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }
  }

  if (action === "edit") {
    if (!editBody) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }
  }

  try {
    const order = await fetchOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = order.user_id === auth.userId;
    const isAdmin = auth.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [metaRows] = await db.query<MessageMetaRow[]>(
      `
      SELECT
        m.id,
        m.conversation_id,
        oc.order_id,
        m.sender_id,
        m.message_type,
        m.is_pinned,
        m.deleted_at
      FROM order_chat_messages m
      JOIN order_conversations oc ON oc.id = m.conversation_id
      WHERE m.id = ? AND oc.order_id = ?
      LIMIT 1
      `,
      [messageId, orderId]
    );

    const meta = metaRows[0];
    if (!meta) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (action === "reaction") {
      const [[existing]] = await db.query<RowDataPacket[]>(
        `
        SELECT id
        FROM order_chat_reactions
        WHERE message_id = ? AND user_id = ? AND emoji = ?
        LIMIT 1
        `,
        [messageId, auth.userId, emoji]
      );

      if (existing) {
        await db.query<ResultSetHeader>(
          `DELETE FROM order_chat_reactions WHERE id = ?`,
          [existing.id]
        );
      } else {
        await db.query<ResultSetHeader>(
          `INSERT INTO order_chat_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)`,
          [messageId, auth.userId, emoji]
        );
      }

      const reactions = await loadReactionsForMessage(messageId, auth.userId);
      return NextResponse.json({ success: true, action: "reaction", messageId, reactions });
    }

    if (action === "pin") {
      const desiredState =
        typeof payload?.pinned === "boolean" ? payload.pinned : meta.is_pinned !== 1;
      await db.query<ResultSetHeader>(
        `UPDATE order_chat_messages SET is_pinned = ? WHERE id = ?`,
        [desiredState ? 1 : 0, messageId]
      );

      const updated = await fetchMessageWithSender(messageId);
      const reactions = await loadReactionsForMessage(messageId, auth.userId);
      return NextResponse.json({
        success: true,
        action: "pin",
        message: updated ? mapMessage(updated, reactions) : null,
      });
    }

    if (action === "edit") {
      if (Number(meta.sender_id) !== auth.userId) {
        return NextResponse.json(
          { error: "You can only edit your own messages" },
          { status: 403 }
        );
      }

      if (meta.deleted_at) {
        return NextResponse.json(
          { error: "Removed messages cannot be edited" },
          { status: 400 }
        );
      }

      const type = (meta.message_type ?? "text").toLowerCase();
      if (type === "sticker") {
        return NextResponse.json(
          { error: "Sticker messages cannot be edited" },
          { status: 400 }
        );
      }

      const trimmed = editBody.slice(0, 2000);
      await db.query<ResultSetHeader>(
        `
        UPDATE order_chat_messages
        SET body = ?, edited_at = NOW(), edited_by = ?, message_type = 'text'
        WHERE id = ?
        `,
        [trimmed, auth.userId, messageId]
      );

      const updated = await fetchMessageWithSender(messageId);
      const reactions = await loadReactionsForMessage(messageId, auth.userId);
      return NextResponse.json({
        success: true,
        action: "edit",
        message: updated ? mapMessage(updated, reactions) : null,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    console.error("order chat PATCH error", err);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routeParams = await ctx.params;
  let body: { messageId?: number } = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }
  const messageId = Number(body.messageId ?? 0);
  if (!Number.isFinite(messageId) || messageId <= 0) {
    return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
  }

  const fallback = (() => {
    try {
      const url = new URL(req.url);
      const segments = url.pathname.split("/");
      return segments[segments.length - 2];
    } catch {
      return undefined;
    }
  })();

  const orderId = parseOrderId(routeParams?.id, fallback);
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  try {
    const order = await fetchOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = order.user_id === auth.userId;
    const isAdmin = auth.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [[messageRow]] = await db.query<RowDataPacket[]>(
      `
      SELECT m.id, m.sender_id, oc.order_id
      FROM order_chat_messages m
      JOIN order_conversations oc ON oc.id = m.conversation_id
      WHERE m.id = ? AND oc.order_id = ?
      LIMIT 1
      `,
      [messageId, orderId]
    );

    if (!messageRow) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (Number(messageRow.sender_id) !== auth.userId) {
      return NextResponse.json({ error: "You can only unsend your messages" }, { status: 403 });
    }

    await db.query<ResultSetHeader>(
      `
      UPDATE order_chat_messages
      SET deleted_at = NOW(), deleted_by = ?, body = '', attachment_url = NULL, sticker_path = NULL, is_pinned = 0
      WHERE id = ?
      `,
      [auth.userId, messageId]
    );
    await db.query<ResultSetHeader>(
      `DELETE FROM order_chat_reactions WHERE message_id = ?`,
      [messageId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("order chat DELETE error", err);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
