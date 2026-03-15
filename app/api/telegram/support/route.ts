import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";
import { getOrderTelegramContext } from "@/lib/payment-review";
import {
  getTelegramSupportBotToken,
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
  text?: string;
  chat?: { id?: number | string };
  from?: TelegramUser;
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

type OrderOwnerRow = RowDataPacket & {
  id: number;
  user_id: number;
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

async function sendSupportText(chatId: number | string, text: string): Promise<void> {
  await callSupportBotApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid QR data URL");
  }
  const [, mimeType, base64Data] = match;
  const bytes = Buffer.from(base64Data, "base64");
  return new Blob([bytes], { type: mimeType });
}

async function sendSupportQrPhoto(
  req: Request,
  chatId: number | string,
  orderNumber: string,
  amount: number,
  currency: "KHR" | "USD"
): Promise<void> {
  const origin = new URL(req.url).origin;
  const normalizedAmount = currency === "KHR" ? Math.round(amount * 4000) : amount;
  const response = await fetch(`${origin}/api/payments/khqr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: normalizedAmount,
      currency,
      billNumber: orderNumber,
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | { qrDataUrl?: string; error?: string }
    | null;

  if (!response.ok || !data?.qrDataUrl) {
    throw new Error(data?.error || "Failed to generate support QR");
  }

  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set(
    "caption",
    [
      `<b>${currency} ABA Payment QR</b>`,
      `Bill Number: <code>${escapeHtml(orderNumber)}</code>`,
      currency === "USD"
        ? `Amount: $${escapeHtml(formatMoney(amount))}`
        : `Amount: ${escapeHtml(formatMoney(normalizedAmount))} KHR`,
      "",
      "After payment, send your APV and transfer screenshot in this chat.",
    ].join("\n")
  );
  form.set("parse_mode", "HTML");
  form.set("photo", dataUrlToBlob(data.qrDataUrl), `${orderNumber}.png`);

  await callSupportBotApi("sendPhoto", form);
}

async function fetchOwnedOrder(orderId: number, userId: number) {
  const [rows] = await db.query<OrderOwnerRow[]>(
    `SELECT id, user_id FROM orders WHERE id = ? AND user_id = ? LIMIT 1`,
    [orderId, userId]
  );
  return rows[0] ?? null;
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
      ? `If needed, return to checkout and open the Telegram payment button again.`
      : "The Telegram support link is not configured yet.",
  ].join("\n");
  await sendSupportText(chatId, message);
}

async function handleStartWithOrder(req: Request, chatId: number | string, payload: string) {
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

  const message = [
    "<b>ABA Payment Support</b>",
    "",
    `👤 <b>Buyer:</b> ${escapeHtml(context.buyerName)}`,
    `📧 <b>Email:</b> ${escapeHtml(context.buyerEmail)}`,
    `🏦 <b>Buyer's Bank:</b> Waiting for payer`,
    `🆔 <b>Order ID:</b> ${escapeHtml(String(context.orderId))}`,
    `🧾 <b>Bill Number:</b> <code>${escapeHtml(context.orderNumber)}</code>`,
    `💵 <b>Amount:</b> $${escapeHtml(formatMoney(context.amount))}`,
    `⏳ <b>Status:</b> ${escapeHtml(context.paymentState || "waiting")}`,
    `🕒 <b>Created:</b> ${escapeHtml(formatDateTime(context.createdAt))}`,
    "",
    "🛍 <b>Items</b>",
    ...context.itemSummary.map((item, index) => `${index + 1}. ${escapeHtml(item)}`),
    "",
    "After payment, send your APV and transfer screenshot in this chat.",
  ].join("\n");

  await sendSupportText(chatId, message);
  await sendSupportQrPhoto(req, chatId, context.orderNumber, context.amount, "KHR");
  await sendSupportQrPhoto(req, chatId, context.orderNumber, context.amount, "USD");
}

export async function POST(req: Request): Promise<Response> {
  if (!hasValidWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const message = body.message;
  if (!message?.chat?.id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const rawText = message.text?.trim() || "";
  if (!rawText.startsWith("/start")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payload = rawText.slice("/start".length).trim();
  if (!payload) {
    await sendGenericStartHelp(message.chat.id);
    return NextResponse.json({ ok: true });
  }

  await handleStartWithOrder(req, message.chat.id, payload);
  return NextResponse.json({ ok: true });
}
