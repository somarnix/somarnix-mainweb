import { createHmac, timingSafeEqual } from "crypto";

import { getJwtSecret } from "@/lib/security";

type SupportPayload = {
  orderId: number;
  userId: number;
};

function getSupportSecret(): string {
  return `${getJwtSecret()}:telegram-support`;
}

function toBase36(value: number): string {
  return Math.floor(value).toString(36);
}

function fromBase36(value: string): number {
  return parseInt(value, 36);
}

function buildSignature(orderIdPart: string, userIdPart: string): string {
  return createHmac("sha256", getSupportSecret())
    .update(`${orderIdPart}:${userIdPart}`)
    .digest("hex")
    .slice(0, 20);
}

export function createTelegramSupportStartPayload(orderId: number, userId: number): string {
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("Invalid orderId for Telegram support payload");
  }
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Invalid userId for Telegram support payload");
  }

  const orderIdPart = toBase36(orderId);
  const userIdPart = toBase36(userId);
  const signature = buildSignature(orderIdPart, userIdPart);
  return `ord_${orderIdPart}_${userIdPart}_${signature}`;
}

export function verifyTelegramSupportStartPayload(raw: string): SupportPayload | null {
  const match = /^ord_([0-9a-z]+)_([0-9a-z]+)_([0-9a-f]{20})$/i.exec(raw.trim());
  if (!match) return null;

  const [, orderIdPart, userIdPart, providedSignature] = match;
  const expectedSignature = buildSignature(orderIdPart.toLowerCase(), userIdPart.toLowerCase());
  const providedBuffer = Buffer.from(providedSignature.toLowerCase(), "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  const orderId = fromBase36(orderIdPart);
  const userId = fromBase36(userIdPart);
  if (!Number.isFinite(orderId) || orderId <= 0) return null;
  if (!Number.isFinite(userId) || userId <= 0) return null;

  return { orderId, userId };
}

export function buildTelegramSupportDeepLink(orderId: number, userId: number): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_URL?.trim() ||
    process.env.TELEGRAM_SUPPORT_URL?.trim() ||
    "";
  if (!baseUrl) return "";

  const url = new URL(baseUrl);
  url.searchParams.set("start", createTelegramSupportStartPayload(orderId, userId));
  return url.toString();
}

export function getTelegramSupportBotToken(): string {
  return process.env.TELEGRAM_SUPPORT_BOT_TOKEN?.trim() || "";
}

