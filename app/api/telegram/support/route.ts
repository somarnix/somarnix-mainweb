import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";
import { syncExpiredUnconfirmedOrders } from "@/lib/order-expiry";
import { submitOrderPayment } from "@/lib/payment-submission";
import { getOrderTelegramContext } from "@/lib/payment-review";
import {
  createTelegramSupportConfirmCallbackData,
  getTelegramSupportBotToken,
  verifyTelegramSupportConfirmCallbackData,
  verifyTelegramSupportStartPayload,
} from "@/lib/telegram-support";

export const runtime = "nodejs";
type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  message_id?: number;
  text?: string;
  caption?: string;
  photo?: Array<{ file_id?: string; width?: number; height?: number }>;
  chat?: {
    id?: number | string;
    type?: "private" | "group" | "supergroup" | "channel";
    title?: string;
  };
  from?: TelegramUser;
};

type TelegramCallbackQuery = {
  id?: string;
  data?: string;
  from?: TelegramUser;
  message?: TelegramMessage;
};

type TelegramUpdate = {
  callback_query?: TelegramCallbackQuery;
  message?: TelegramMessage;
};

type OrderOwnerRow = RowDataPacket & {
  id: number;
  user_id: number;
};

type SupportSessionRow = RowDataPacket & {
  chat_id: string;
  order_id: number;
  user_id: number;
  proof_photo_file_id: string | null;
};

function hasValidWebhookSecret(req: Request): boolean {
  const expectedSecret = process.env.TELEGRAM_SUPPORT_WEBHOOK_SECRET?.trim() || "";
  if (!expectedSecret) return false;

  const incomingHeaderSecret = req.headers.get("x-telegram-bot-api-secret-token")?.trim() || "";
  return incomingHeaderSecret === expectedSecret;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function callSupportBotApi<T>(
  method: string,
  payload: Record<string, unknown> | FormData
): Promise<T> {
  const botToken = getTelegramSupportBotToken();
  if (!botToken) {
    throw new Error("TELEGRAM_SUPPORT_BOT_TOKEN is required");
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    ...(payload instanceof FormData
      ? { body: payload }
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
  });

  const data = (await response.json().catch(() => null)) as
    | { ok?: boolean; result?: T; description?: string }
    | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.description || `${response.status} ${response.statusText}`);
  }

  return data.result as T;
}

async function sendSupportText(
  chatId: number | string,
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<void> {
  await callSupportBotApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendSupportPhoto(
  chatId: number | string,
  photoFileId: string,
  caption: string
): Promise<void> {
  await callSupportBotApi("sendPhoto", {
    chat_id: chatId,
    photo: photoFileId,
    caption,
    parse_mode: "HTML",
  });
}

function getSupportReviewChatId(): string {
  return (
    process.env.TELEGRAM_SUPPORT_GROUP_ID?.trim() ||
    process.env.TELEGRAM_GROUP_ID?.trim() ||
    process.env.TELEGRAM_ABA_SOURCE_GROUP_ID?.trim() ||
    ""
  );
}

async function ensureSupportSessionsTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS telegram_support_sessions (
      chat_id VARCHAR(80) NOT NULL,
      order_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      proof_photo_file_id VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_id)
    )
  `);

  try {
    await db.query(`
      ALTER TABLE telegram_support_sessions
      ADD COLUMN proof_photo_file_id VARCHAR(255) NULL AFTER user_id
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (!message.includes("duplicate column")) {
      throw error;
    }
  }
}

async function saveSupportSession(
  chatId: number | string,
  orderId: number,
  userId: number
): Promise<void> {
  await ensureSupportSessionsTable();
  await db.query(
    `
    INSERT INTO telegram_support_sessions (chat_id, order_id, user_id)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      order_id = VALUES(order_id),
      user_id = VALUES(user_id),
      proof_photo_file_id = NULL
    `,
    [String(chatId), orderId, userId]
  );
}

async function getSupportSession(chatId: number | string): Promise<SupportSessionRow | null> {
  await ensureSupportSessionsTable();
  const [rows] = await db.query<SupportSessionRow[]>(
    `
    SELECT chat_id, order_id, user_id, proof_photo_file_id
    FROM telegram_support_sessions
    WHERE chat_id = ?
    LIMIT 1
    `,
    [String(chatId)]
  );
  return rows[0] ?? null;
}

async function saveSupportProofPhoto(chatId: number | string, fileId: string): Promise<void> {
  await ensureSupportSessionsTable();
  await db.query(
    `
    UPDATE telegram_support_sessions
    SET proof_photo_file_id = ?
    WHERE chat_id = ?
    `,
    [fileId, String(chatId)]
  );
}

async function clearSupportSession(chatId: number | string): Promise<void> {
  await ensureSupportSessionsTable();
  await db.query(`DELETE FROM telegram_support_sessions WHERE chat_id = ?`, [String(chatId)]);
}

async function answerSupportCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  await callSupportBotApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

async function tryAnswerSupportCallbackQuery(
  callbackQueryId: string,
  text: string
): Promise<void> {
  try {
    await answerSupportCallbackQuery(callbackQueryId, text);
  } catch (error) {
    console.error("Telegram support callback answer failed:", error);
  }
}

async function fetchOwnedOrder(orderId: number, userId: number) {
  const [rows] = await db.query<OrderOwnerRow[]>(
    `SELECT id, user_id FROM orders WHERE id = ? AND user_id = ? LIMIT 1`,
    [orderId, userId]
  );
  return rows[0] ?? null;
}

function getTelegramDisplayName(user?: TelegramUser): string {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (user?.username) return `@${user.username}`;
  if (user?.id) return `Telegram user ${user.id}`;
  return "Telegram user";
}

function buildSupportReviewCaption(
  context: Awaited<ReturnType<typeof getOrderTelegramContext>>,
  user?: TelegramUser
): string {
  if (!context) {
    return "<b>Payment proof confirmed</b>";
  }

  const senderLabel = getTelegramDisplayName(user);
  const usernameLine = user?.username
    ? `<b>Telegram Username:</b> @${escapeHtml(user.username)}`
    : null;
  const telegramIdLine = user?.id ? `<b>Telegram ID:</b> <code>${escapeHtml(String(user.id))}</code>` : null;
  const confirmedAt = formatDateTime(new Date().toISOString());

  return [
    "<b>ABA Payment Support</b>",
    "",
    "<b>Payment proof confirmed in Telegram.</b>",
    "The screenshot below was uploaded by the buyer and confirmed from the support bot.",
    "",
    `<b>Buyer:</b> ${escapeHtml(context.buyerName)}`,
    `<b>Email:</b> ${escapeHtml(context.buyerEmail)}`,
    `<b>Telegram Sender:</b> ${escapeHtml(senderLabel)}`,
    usernameLine,
    telegramIdLine,
    `<b>Buyer's Bank:</b> ${escapeHtml(context.bankName || "Waiting for payer")}`,
    `<b>Order ID:</b> ${escapeHtml(String(context.orderId))}`,
    `<b>Order ID Number:</b> #${escapeHtml(String(context.orderId))}`,
    `<b>Bill Number:</b> <code>${escapeHtml(context.orderNumber)}</code>`,
    `<b>Amount:</b> $${escapeHtml(formatMoney(context.amount))}`,
    `<b>Status:</b> Confirmed in Telegram`,
    `<b>Created:</b> ${escapeHtml(formatDateTime(context.createdAt))}`,
    `<b>Confirmed At:</b> ${escapeHtml(confirmedAt)}`,
    "",
    "<b>Items</b>",
    ...context.itemSummary.map((item, index) => `${index + 1}. ${escapeHtml(item)}`),
    "",
    "#TelegramProof #PaymentConfirmed",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

async function sendGenericStartHelp(chatId: number | string): Promise<void> {
  const baseSupportUrl =
    process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_URL?.trim() ||
    process.env.TELEGRAM_SUPPORT_URL?.trim() ||
    "";
  const message = [
    "<b>ABA Payment Support Bot</b>",
    "",
    "Open this bot from your website checkout so the order details and QR are linked automatically.",
    baseSupportUrl
      ? "If needed, return to checkout and open the Telegram payment button again."
      : "The Telegram support link is not configured yet.",
  ].join("\n");
  await sendSupportText(chatId, message);
}

async function handleChatIdRequest(message: TelegramMessage): Promise<void> {
  const chatId = message.chat?.id;
  if (!chatId) return;

  const chatType = message.chat?.type || "unknown";
  const chatTitle = message.chat?.title?.trim() || "Direct chat";

  await sendSupportText(
    chatId,
    [
      "<b>Telegram Chat Information</b>",
      "",
      `<b>Chat Title:</b> ${escapeHtml(chatTitle)}`,
      `<b>Chat Type:</b> ${escapeHtml(chatType)}`,
      `<b>Chat ID:</b> <code>${escapeHtml(String(chatId))}</code>`,
      "",
      "Copy this Chat ID into <code>TELEGRAM_SUPPORT_GROUP_ID</code> in your .env.local file.",
    ].join("\n")
  );
}

async function handleStartWithOrder(chatId: number | string, payload: string): Promise<void> {
  await syncExpiredUnconfirmedOrders();

  const verified = verifyTelegramSupportStartPayload(payload);
  if (!verified) {
    await sendSupportText(
      chatId,
      "<b>Invalid support link.</b>\n\nPlease return to checkout and open Telegram again from the payment page."
    );
    return;
  }

  const order = await fetchOwnedOrder(verified.orderId, verified.userId);
  if (!order) {
    await sendSupportText(
      chatId,
      "<b>Order not found.</b>\n\nThis payment link is no longer valid. Please go back to the website checkout and try again."
    );
    return;
  }

  const context = await getOrderTelegramContext(order.id);
  if (!context) {
    await sendSupportText(
      chatId,
      "<b>Order details are unavailable right now.</b>\n\nPlease try again in a moment."
    );
    return;
  }

  if (context.state === "cancelled") {
    await sendSupportText(
      chatId,
      "<b>This order expired.</b>\n\nThe 2-hour payment window ended before confirmation. Please create a new checkout order on the website."
    );
    return;
  }

  const message = [
    "<b>ABA Payment Support</b>",
    "",
    `<b>Buyer:</b> ${escapeHtml(context.buyerName)}`,
    `<b>Email:</b> ${escapeHtml(context.buyerEmail)}`,
    `<b>Buyer's Bank:</b> ${escapeHtml(context.bankName || "Waiting for payer")}`,
    `<b>Order ID:</b> ${escapeHtml(String(context.orderId))}`,
    `<b>Order ID Number:</b> #${escapeHtml(String(context.orderId))}`,
    `<b>Bill Number:</b> <code>${escapeHtml(context.orderNumber)}</code>`,
    `<b>Amount:</b> $${escapeHtml(formatMoney(context.amount))}`,
    `<b>Status:</b> ${escapeHtml(context.paymentState || "waiting")}`,
    `<b>Created:</b> ${escapeHtml(formatDateTime(context.createdAt))}`,
    "",
    "<b>Items</b>",
    ...context.itemSummary.map((item, index) => `${index + 1}. ${escapeHtml(item)}`),
    "",
    "<b>Photo Upload Note</b>",
    "Upload your payment photo in this Telegram chat.",
    "<b>The uploaded photo must be clear and not blurry.</b>",
    "After you upload a clear photo, the bot will show the <b>Confirm Payment</b> button.",
  ].join("\n");

  await saveSupportSession(chatId, verified.orderId, verified.userId);
  await sendSupportText(chatId, message);
}

async function handleSupportProofPhoto(
  chatId: number | string,
  photos: Array<{ file_id?: string; width?: number; height?: number }>
): Promise<void> {
  await syncExpiredUnconfirmedOrders();

  const session = await getSupportSession(chatId);
  if (!session) {
    await sendSupportText(
      chatId,
      "<b>No active payment order found.</b>\n\nPlease open Telegram again from your website checkout before sending payment proof."
    );
    return;
  }

  const order = await fetchOwnedOrder(Number(session.order_id), Number(session.user_id));
  if (!order) {
    await clearSupportSession(chatId);
    await sendSupportText(
      chatId,
      "<b>Order not found.</b>\n\nPlease return to the website checkout and start again."
    );
    return;
  }

  const context = await getOrderTelegramContext(order.id);
  if (!context || context.state === "cancelled") {
    await clearSupportSession(chatId);
    await sendSupportText(
      chatId,
      "<b>This order expired.</b>\n\nThe 2-hour payment window ended before confirmation. Please create a new checkout order on the website."
    );
    return;
  }

  const bestPhoto = [...photos].reverse().find((photo) => typeof photo.file_id === "string" && photo.file_id.trim());
  if (!bestPhoto?.file_id) {
    await sendSupportText(
      chatId,
      "<b>Photo upload failed.</b>\n\nPlease send your payment proof photo again."
    );
    return;
  }

  await saveSupportProofPhoto(chatId, bestPhoto.file_id);

  await sendSupportText(
    chatId,
    [
      "<b>Photo received.</b>",
      "",
      "Please make sure the proof image is clear and fully readable.",
      "<b>Blurred or unclear photos are not allowed.</b>",
      "If the image is unclear, send a new clear photo before confirming.",
      "",
      "When your proof is clear, tap <b>Confirm Money</b> below.",
    ].join("\n"),
    {
      inline_keyboard: [
        [
          {
            text: "Confirm Money",
            callback_data: createTelegramSupportConfirmCallbackData(order.id, Number(session.user_id)),
          },
        ],
      ],
    }
  );
}

async function handleConfirmCallback(
  callbackId: string,
  chatId: number | string,
  rawData: string,
  fromUser?: TelegramUser
): Promise<void> {
  await syncExpiredUnconfirmedOrders();

  const verified = verifyTelegramSupportConfirmCallbackData(rawData);
  if (!verified) {
    await tryAnswerSupportCallbackQuery(callbackId, "Invalid confirmation");
    await sendSupportText(
      chatId,
      "<b>Invalid confirmation.</b>\n\nPlease send your proof photo again and tap the new Confirm Money button."
    );
    return;
  }

  const session = await getSupportSession(chatId);
  if (
    !session ||
    Number(session.order_id) !== verified.orderId ||
    Number(session.user_id) !== verified.userId
  ) {
    await tryAnswerSupportCallbackQuery(callbackId, "Session expired");
    await sendSupportText(
      chatId,
      "<b>Payment session not found.</b>\n\nPlease open Telegram again from the website checkout and resend your proof photo."
    );
    return;
  }

  if (!session.proof_photo_file_id) {
    await tryAnswerSupportCallbackQuery(callbackId, "Upload photo first");
    await sendSupportText(
      chatId,
      "<b>No payment photo found.</b>\n\nPlease upload a clear payment proof photo before tapping Confirm Money."
    );
    return;
  }

  const order = await fetchOwnedOrder(verified.orderId, verified.userId);
  if (!order) {
    await clearSupportSession(chatId);
    await tryAnswerSupportCallbackQuery(callbackId, "Order not found");
    await sendSupportText(
      chatId,
      "<b>Order not found.</b>\n\nPlease return to the website checkout and start again."
    );
    return;
  }

  const context = await getOrderTelegramContext(order.id);
  if (!context || context.state === "cancelled") {
    await clearSupportSession(chatId);
    await tryAnswerSupportCallbackQuery(callbackId, "Order expired");
    await sendSupportText(
      chatId,
      "<b>This order expired.</b>\n\nThe 2-hour payment window ended before confirmation. Please create a new checkout order on the website."
    );
    return;
  }

  try {
    const payerName =
      [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(" ").trim() ||
      context.buyerName;

    const result = await submitOrderPayment({
      orderId: verified.orderId,
      userId: verified.userId,
      accountName: payerName,
      accountNumber: context.orderNumber,
      paymentApv: "TELEGRAM_PROOF",
      method: "ABA Bank",
      paidAt: new Date().toISOString(),
    });

    await tryAnswerSupportCallbackQuery(
      callbackId,
      result.duplicate ? "Already confirmed" : "Payment confirmed"
    );

    if (!result.duplicate) {
      const reviewChatId = getSupportReviewChatId();
      if (reviewChatId) {
        try {
          await sendSupportPhoto(
            reviewChatId,
            session.proof_photo_file_id,
            buildSupportReviewCaption(context, fromUser)
          );
        } catch (telegramError) {
          console.error("Telegram support group proof notification failed:", telegramError);
        }
      }
    }

    await sendSupportText(
      chatId,
      result.duplicate
        ? "<b>Payment was already confirmed earlier.</b>\n\nYour order remains in <b>Order is Preparing</b>."
        : "<b>Payment confirmed.</b>\n\nYour order is now in <b>Order is Preparing</b>.\nIf the proof image is blurry or unclear, admin may ask you to send a clearer photo."
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to confirm payment";
    await tryAnswerSupportCallbackQuery(callbackId, "Unable to confirm");
    await sendSupportText(
      chatId,
      `<b>Unable to confirm payment.</b>\n\n${escapeHtml(message)}`
    );
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!hasValidWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => null)) as TelegramUpdate | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const callback = body.callback_query;
    if (callback?.id && callback.data && callback.message?.chat?.id) {
      await handleConfirmCallback(
        callback.id,
        callback.message.chat.id,
        callback.data,
        callback.from
      );
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (Array.isArray(message.photo) && message.photo.length > 0) {
      await handleSupportProofPhoto(message.chat.id, message.photo);
      return NextResponse.json({ ok: true });
    }

    const rawText = message.text?.trim() || "";
    if (/^\/(?:chatid|groupid|id)(?:@[\w_]+)?$/i.test(rawText)) {
      await handleChatIdRequest(message);
      return NextResponse.json({ ok: true });
    }

    if (!rawText.startsWith("/start")) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payload = rawText.slice("/start".length).trim();
    if (!payload) {
      await sendGenericStartHelp(message.chat.id);
      return NextResponse.json({ ok: true });
    }

    await handleStartWithOrder(message.chat.id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram support webhook failed:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
