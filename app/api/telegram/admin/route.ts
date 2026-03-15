import { NextResponse } from "next/server";

import { reviewPaymentDecision } from "@/lib/payment-review";
import {
  answerTelegramCallbackQuery,
  clearTelegramInlineKeyboard,
  getTelegramAdminBotConfig,
  sendTelegramAdminSystemMessage,
  sendTelegramPaymentDecisionNotification,
} from "@/lib/telegram";

export const runtime = "nodejs";

type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramCallbackQuery = {
  id?: string;
  from?: TelegramUser;
  data?: string;
  message?: {
    message_id?: number;
    chat?: { id?: number | string };
  };
};

type TelegramMessage = {
  text?: string;
  chat?: { id?: number | string };
  from?: TelegramUser;
};

type TelegramUpdate = {
  callback_query?: TelegramCallbackQuery;
  message?: TelegramMessage;
};

function parseNumericSet(raw: string): Set<number> {
  return new Set(
    raw
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value !== 0)
  );
}

function isAuthorizedTelegramUser(userId: number): boolean {
  const allowed = parseNumericSet(process.env.TELEGRAM_ADMIN_ALLOWED_USER_IDS?.trim() || "");
  if (allowed.size === 0) return false;
  return allowed.has(userId);
}

function getActorLabel(user: TelegramUser | undefined): string {
  const parts = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const username = user?.username ? `@${user.username}` : "";
  const display = parts || username || `telegram:${String(user?.id ?? "unknown")}`;
  return display;
}

function hasValidWebhookSecret(req: Request): boolean {
  const expectedSecret = process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET?.trim() || "";
  if (!expectedSecret) return false;

  const incomingHeaderSecret = req.headers.get("x-telegram-bot-api-secret-token")?.trim() || "";
  return incomingHeaderSecret === expectedSecret;
}

async function sendStartHelp(chatId: number | string): Promise<void> {
  const config = getTelegramAdminBotConfig();
  if (!config) return;

  const message = [
    "<b>Payment Admin Bot</b>",
    "",
    "Use the Approve and Decline buttons directly from payment review messages.",
    "This bot only accepts actions from allowlisted Telegram admin user IDs.",
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
}

export async function POST(req: Request): Promise<Response> {
  if (!hasValidWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (body.message?.text?.trim() === "/start" && body.message.chat?.id) {
    await sendStartHelp(body.message.chat.id);
    return NextResponse.json({ ok: true });
  }

  const callback = body.callback_query;
  if (!callback?.id || !callback.from?.id || !callback.data) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!isAuthorizedTelegramUser(Number(callback.from.id))) {
    await answerTelegramCallbackQuery(callback.id, "Not authorized");
    return NextResponse.json({ ok: true, unauthorized: true });
  }

  const match = /^payment:(approve|decline):(\d+)$/.exec(callback.data.trim());
  if (!match) {
    await answerTelegramCallbackQuery(callback.id, "Unsupported action");
    return NextResponse.json({ ok: true, ignored: true });
  }

  const decision = match[1] as "approve" | "decline";
  const paymentId = Number(match[2]);
  const actorLabel = getActorLabel(callback.from);

  try {
    const result = await reviewPaymentDecision({
      paymentId,
      decision,
      actorId: null,
      actorLabel: `Telegram ${actorLabel}`,
      note:
        decision === "approve"
          ? `Approved from Telegram by ${actorLabel}`
          : `Declined from Telegram by ${actorLabel}`,
    });

    if (
      callback.message?.chat?.id !== undefined &&
      typeof callback.message.message_id === "number"
    ) {
      try {
        await clearTelegramInlineKeyboard(callback.message.chat.id, callback.message.message_id);
      } catch (error) {
        console.error("Telegram inline keyboard clear failed:", error);
      }
    }

    if (result.orderContext) {
      try {
        await sendTelegramPaymentDecisionNotification({
          orderId: result.orderContext.orderId,
          orderNumber: result.orderContext.orderNumber,
          amount: result.orderContext.amount,
          buyerName: result.orderContext.buyerName,
          buyerEmail: result.orderContext.buyerEmail,
          bankName: result.orderContext.bankName,
          accountNumber: result.orderContext.accountNumber,
          paymentApv: result.orderContext.paymentApv,
          paidAt: result.orderContext.paidAt,
          itemSummary: result.orderContext.itemSummary,
          decision: decision === "approve" ? "approved" : "declined",
          decisionNote:
            decision === "approve"
              ? `Approved from Telegram by ${actorLabel}`
              : `Declined from Telegram by ${actorLabel}`,
          decisionSource: `Telegram admin ${actorLabel}`,
        });
      } catch (error) {
        console.error("Telegram decision notification failed:", error);
      }
    }

    await answerTelegramCallbackQuery(
      callback.id,
      decision === "approve" ? "Payment approved" : "Payment declined"
    );

    return NextResponse.json({ ok: true, paymentId, decision });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";

    await answerTelegramCallbackQuery(callback.id, message);
    try {
      await sendTelegramAdminSystemMessage(`<b>Telegram action failed:</b> ${message}`);
    } catch {
      // ignore notification errors
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
