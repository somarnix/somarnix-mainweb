import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type ConversationListRow = RowDataPacket & {
  conversation_id: number;
  order_id: number;
  order_number: string;
  state: string | null;
  user_id: number;
  buyer_name: string | null;
  buyer_email: string;
  buyer_avatar: string | null;
  buyer_status: string | null;
  buyer_last_active_at: string | Date | null;
  seller_id: number | null;
  seller_name: string | null;
  seller_email: string | null;
  seller_avatar: string | null;
  seller_status: string | null;
  seller_last_active_at: string | Date | null;
  created_at: string | Date | null;
  last_message_at: string | Date | null;
  last_body: string | null;
  last_created_at: string | Date | null;
  last_is_admin: number | null;
  last_message_type: string | null;
  last_sticker_path: string | null;
  seller_unread: number | null;
  buyer_unread: number | null;
};

function formatDate(value: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const isAdmin = auth.role === "admin";

    const [rows] = await db.query<ConversationListRow[]>(
      `
      SELECT
        c.id AS conversation_id,
        o.id AS order_id,
        o.order_number,
        o.state,
        o.user_id,
        u.username AS buyer_name,
        u.email AS buyer_email,
        u.avatar_url AS buyer_avatar,
        buyer_presence.status AS buyer_status,
        buyer_presence.last_active_at AS buyer_last_active_at,
        seller_user.id AS seller_id,
        seller_user.username AS seller_name,
        seller_user.email AS seller_email,
        seller_user.avatar_url AS seller_avatar,
        seller_presence.status AS seller_status,
        seller_presence.last_active_at AS seller_last_active_at,
        o.created_at,
        c.last_message_at,
        lm.body AS last_body,
        lm.created_at AS last_created_at,
        lm.is_admin AS last_is_admin,
        lm.message_type AS last_message_type,
        lm.sticker_path AS last_sticker_path,
        unread.seller_unread,
        unread.buyer_unread
      FROM order_conversations c
      JOIN orders o ON o.id = c.order_id
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
      LEFT JOIN (
        SELECT m1.*
        FROM order_chat_messages m1
        INNER JOIN (
          SELECT conversation_id, MAX(id) AS max_id
          FROM order_chat_messages
          GROUP BY conversation_id
        ) m2 ON m2.conversation_id = m1.conversation_id AND m2.max_id = m1.id
      ) AS lm ON lm.conversation_id = c.id
      LEFT JOIN (
        SELECT
          conversation_id,
          SUM(CASE WHEN is_admin = 1 AND seller_seen_at IS NULL AND deleted_at IS NULL THEN 1 ELSE 0 END) AS seller_unread,
          SUM(CASE WHEN is_admin = 0 AND buyer_seen_at IS NULL AND deleted_at IS NULL THEN 1 ELSE 0 END) AS buyer_unread
        FROM order_chat_messages
        GROUP BY conversation_id
      ) unread ON unread.conversation_id = c.id
      WHERE o.state = 'completed'
        ${isAdmin ? "" : "AND o.user_id = ?"}
        AND lm.id IS NOT NULL
      ORDER BY COALESCE(c.last_message_at, lm.created_at, o.created_at) DESC, c.id DESC
      LIMIT 200
      `,
      isAdmin ? [] : [auth.userId]
    );

    const conversations = rows.map((row) => ({
      id: row.conversation_id,
      orderId: row.order_id,
      orderNumber: row.order_number,
      state: row.state,
      buyer: {
        id: row.user_id,
        name: row.buyer_name,
        email: row.buyer_email,
        avatarUrl: row.buyer_avatar,
        presence: {
          status: row.buyer_status,
          lastActiveAt:
            row.buyer_last_active_at instanceof Date
              ? row.buyer_last_active_at.toISOString()
              : row.buyer_last_active_at,
        },
      },
      seller: {
        id: row.seller_id,
        name: row.seller_name,
        email: row.seller_email,
        avatarUrl: row.seller_avatar,
        presence: {
          status: row.seller_status,
          lastActiveAt:
            row.seller_last_active_at instanceof Date
              ? row.seller_last_active_at.toISOString()
              : row.seller_last_active_at,
        },
      },
      lastMessage: row.last_body,
      lastMessageType: row.last_message_type,
      lastStickerPath: row.last_sticker_path,
      lastMessageAt: formatDate(
        row.last_created_at ?? row.last_message_at ?? row.created_at
      ),
      lastMessageFromAdmin: row.last_is_admin === 1,
      unreadCount: Number(
        (isAdmin ? row.seller_unread : row.buyer_unread) ?? 0
      ),
    }));

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("chat list error", err);
    return NextResponse.json(
      { error: "Failed to load conversations" },
      { status: 500 }
    );
  }
}
