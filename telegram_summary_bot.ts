import dotenv from "dotenv";
import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import {
  buildPaymentsCsv,
  buildSummaryMessage,
  buildTotals,
  collectPaymentsForRange,
  sendBotHtmlMessage,
  sendBotDocument,
  searchPayments,
} from "./telegram_summary_core";

dotenv.config({ path: ".env.local" });
dotenv.config();

type BotUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat?: {
      id: number;
      type?: string;
      title?: string;
      username?: string;
      first_name?: string;
    };
    from?: {
      id: number;
      is_bot?: boolean;
      first_name?: string;
      username?: string;
    };
  };
};

type SearchScope = "aba" | "bakong";

const apiId = Number(process.env.TELEGRAM_API_ID ?? 0);
const apiHash = process.env.TELEGRAM_API_HASH?.trim() || "";
const sessionString = process.env.TELEGRAM_SESSION_STRING || "";
const abaSourceGroupId =
  process.env.TELEGRAM_ABA_SOURCE_GROUP_ID?.trim() || process.env.TELEGRAM_GROUP_ID?.trim() || "";
const abaSourceBotUsername =
  process.env.TELEGRAM_ABA_SOURCE_BOT_USERNAME?.trim().replace(/^@/, "") || "PayWayByABA_bot";
const bakongSourceGroupId =
  process.env.TELEGRAM_BAKONG_SOURCE_GROUP_ID?.trim() ||
  process.env.TELEGRAM_CHAT_ID?.trim() ||
  process.env.TELEGRAM_GROUP_ID?.trim() ||
  "";
const bakongSourceBotUsername =
  process.env.TELEGRAM_BAKONG_SOURCE_BOT_USERNAME?.trim().replace(/^@/, "") || "PayWay_by_BAKONG_bot";
const summaryBotToken = process.env.TELEGRAM_SUMMARY_BOT_TOKEN?.trim() || "";
const allowedChatIds = new Set(
  (process.env.TELEGRAM_SUMMARY_ALLOWED_CHAT_IDS?.trim() || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const allowedUserIds = new Set(
  (process.env.TELEGRAM_SUMMARY_ALLOWED_USER_IDS?.trim() || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const REQUEST_INTERVAL_MS = Number(process.env.TELEGRAM_SUMMARY_RATE_LIMIT_MS ?? "2500");

if (!apiId || !apiHash || !abaSourceGroupId || !summaryBotToken) {
  throw new Error(
    "Missing TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_GROUP_ID, or TELEGRAM_SUMMARY_BOT_TOKEN."
  );
}

const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
  connectionRetries: 10,
  useWSS: true,
  deviceModel: "GSTECH Summary Menu Bot",
  systemVersion: "Windows/Linux",
  appVersion: "1.0",
});

const pendingSearchByChat = new Map<string, SearchScope>();
const lastRequestByChat = new Map<string, number>();

const KEYBOARD = {
  keyboard: [
    [{ text: "💙 ABA Today" }, { text: "💙 ABA Month" }],
    [{ text: "🟥 Bakong Today" }, { text: "🟥 Bakong Month" }],
    [{ text: "📊 All Banks Month" }, { text: "📤 ABA Excel CSV" }],
    [{ text: "📤 Bakong Excel CSV" }, { text: "🔎 Search ABA Order" }],
    [{ text: "🔎 Search Bakong Order" }, { text: "🛡 Security" }],
    [{ text: "❓ Help" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return {
    start,
    end,
    label: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
}

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return {
    start,
    end,
    label: "Today",
  };
}

async function botApi<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${summaryBotToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Bot API ${method} failed: ${response.status} ${detail}`.trim());
  }

  const data = (await response.json()) as { ok: boolean; result: T; description?: string };
  if (!data.ok) {
    throw new Error(`Bot API ${method} rejected the request: ${data.description || "Unknown error"}`);
  }
  return data.result;
}

async function sendMenu(chatId: string, text: string): Promise<void> {
  await sendBotHtmlMessage(summaryBotToken, chatId, text, KEYBOARD);
}

async function sendHelp(chatId: string): Promise<void> {
  const message = [
    "📘 <b>Bank Summary Control Center</b>",
    "",
    "Features:",
    "• 💙 ABA Today",
    "• 💙 ABA Month",
    "• 🟥 Bakong Today",
    "• 🟥 Bakong Month",
    "• 📊 All Banks Month",
    "• 📤 ABA Excel CSV",
    "• 📤 Bakong Excel CSV",
    "• 🔎 Search ABA Order",
    "• 🔎 Search Bakong Order",
    "• 🛡 Security",
    "",
    "This bot keeps ABA / PayWay and Bakong separate, supports search, and can export Excel-friendly CSV reports.",
  ].join("\n");
  await sendMenu(chatId, message);
}

function currentMonthFilename(prefix: string): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${prefix}-${stamp}.csv`;
}

function rateLimitExceeded(chatId: string): boolean {
  const now = Date.now();
  const previous = lastRequestByChat.get(chatId) || 0;
  if (now - previous < REQUEST_INTERVAL_MS) {
    return true;
  }
  lastRequestByChat.set(chatId, now);
  return false;
}

function isAuthorized(chatId: string, userId: string): boolean {
  const chatAllowed = allowedChatIds.size === 0 || allowedChatIds.has(chatId);
  const userAllowed = allowedUserIds.size === 0 || allowedUserIds.has(userId);
  return chatAllowed && userAllowed;
}

async function sendSummary(
  chatId: string,
  summaryTitle: string,
  sourceGroupId: string,
  sourceBotUsername: string,
  label: string,
  start: Date,
  end: Date
): Promise<void> {
  const payments = await collectPaymentsForRange(client, sourceGroupId, sourceBotUsername, start, end);
  const totals = buildTotals(payments);
  const message = buildSummaryMessage(
    payments,
    totals,
    label,
    start,
    end,
    sourceGroupId,
    sourceBotUsername,
    summaryTitle
  );
  await sendBotHtmlMessage(summaryBotToken, chatId, message, KEYBOARD);
}

async function sendAllBanksMonthSummary(chatId: string): Promise<void> {
  const range = currentMonthRange();
  const abaPayments = await collectPaymentsForRange(
    client,
    abaSourceGroupId,
    abaSourceBotUsername,
    range.start,
    range.end
  );
  const bakongPayments = await collectPaymentsForRange(
    client,
    bakongSourceGroupId,
    bakongSourceBotUsername,
    range.start,
    range.end
  );
  const abaTotals = buildTotals(abaPayments);
  const bakongTotals = buildTotals(bakongPayments);
  const message = [
    "🏦 <b>All Banks Operations Summary</b>",
    `🗓 <b>Period:</b> ${range.label}`,
    "",
    "<b>ABA / PayWay</b>",
    `✅ Success: ${abaTotals.count}`,
    `💵 USD: ${abaTotals.usd.toFixed(2)}`,
    `៛ KHR: ${Math.round(abaTotals.khr)}`,
    "",
    "<b>Bakong</b>",
    `✅ Success: ${bakongTotals.count}`,
    `💵 USD: ${bakongTotals.usd.toFixed(2)}`,
    `៛ KHR: ${Math.round(bakongTotals.khr)}`,
    "",
    "<b>Combined</b>",
    `✅ Success: ${abaTotals.count + bakongTotals.count}`,
    `💵 USD: ${(abaTotals.usd + bakongTotals.usd).toFixed(2)}`,
    `៛ KHR: ${Math.round(abaTotals.khr + bakongTotals.khr)}`,
  ].join("\n");
  await sendBotHtmlMessage(summaryBotToken, chatId, message, KEYBOARD);
}

async function exportSourceCsv(
  chatId: string,
  sourceLabel: string,
  sourceGroupId: string,
  sourceBotUsername: string,
  filenamePrefix: string
): Promise<void> {
  const range = currentMonthRange();
  const payments = await collectPaymentsForRange(client, sourceGroupId, sourceBotUsername, range.start, range.end);
  const csv = buildPaymentsCsv(payments, sourceLabel);
  await sendBotDocument(
    summaryBotToken,
    chatId,
    currentMonthFilename(filenamePrefix),
    csv,
    `${sourceLabel} export for ${range.label}`
  );
}

async function promptSearch(chatId: string, scope: SearchScope): Promise<void> {
  pendingSearchByChat.set(chatId, scope);
  const label = scope === "aba" ? "ABA / PayWay" : "Bakong";
  await sendMenu(chatId, `🔎 Send the ${label} order ID, bill number, APV, remark, or transaction ID to search.`);
}

async function performSearch(chatId: string, query: string, scope: SearchScope): Promise<void> {
  const isAba = scope === "aba";
  const payments = await searchPayments(
    client,
    isAba ? abaSourceGroupId : bakongSourceGroupId,
    isAba ? abaSourceBotUsername : bakongSourceBotUsername,
    query,
    10
  );

  if (payments.length === 0) {
    await sendMenu(chatId, `No ${isAba ? "ABA / PayWay" : "Bakong"} payment records found for: <code>${query}</code>`);
    return;
  }

  const rows = payments.map(
    (payment, index) =>
      `${index + 1}. <b>${payment.buyerName}</b> | ${payment.currency || "-"} ${payment.amount} | ` +
      `Trx: <code>${payment.trxId || "N/A"}</code> | APV: <code>${payment.apv || "N/A"}</code> | ` +
      `Remark: ${payment.remark || "N/A"} | Time: ${payment.paidAt.toISOString().slice(0, 19).replace("T", " ")}`
  );
  await sendBotHtmlMessage(
    summaryBotToken,
    chatId,
    [
      `🔎 <b>${isAba ? "ABA / PayWay" : "Bakong"} Search Result</b>`,
      `Query: <code>${query}</code>`,
      "",
      ...rows,
    ].join("\n"),
    KEYBOARD
  );
}

async function sendSecurity(chatId: string): Promise<void> {
  const message = [
    "🛡 <b>Security Profile</b>",
    "",
    "• Menu-only bot flow",
    "• Optional allowed chat list",
    "• Optional allowed user list",
    `• Rate limit: ${REQUEST_INTERVAL_MS} ms`,
    "• Read-only access to Telegram source messages",
    "• No payment mutation or transfer actions",
    "",
    "Real security still depends on keeping bot tokens and Telegram session strings private and rotated.",
  ].join("\n");
  await sendMenu(chatId, message);
}

async function handleText(chatId: string, userId: string, text: string): Promise<void> {
  const normalized = text.trim();
  const pendingScope = pendingSearchByChat.get(chatId);

  if (pendingScope && !normalized.startsWith("/")) {
    pendingSearchByChat.delete(chatId);
    await performSearch(chatId, normalized, pendingScope);
    return;
  }

  if (normalized === "/start" || normalized === "/menu") {
    await sendMenu(
      chatId,
      "👋 <b>Welcome to GSTECHKHBanks Summary</b>\n\nUse the operation buttons below for ABA / PayWay, Bakong, export, and order search."
    );
    return;
  }

  if (normalized === "💙 ABA Month") {
    const range = currentMonthRange();
    await sendSummary(
      chatId,
      "ABA / PayWay Summary",
      abaSourceGroupId,
      abaSourceBotUsername,
      range.label,
      range.start,
      range.end
    );
    return;
  }

  if (normalized === "💙 ABA Today") {
    const range = todayRange();
    await sendSummary(
      chatId,
      "ABA / PayWay Summary",
      abaSourceGroupId,
      abaSourceBotUsername,
      range.label,
      range.start,
      range.end
    );
    return;
  }

  if (normalized === "🟥 Bakong Month") {
    const range = currentMonthRange();
    await sendSummary(
      chatId,
      "Bakong Summary",
      bakongSourceGroupId,
      bakongSourceBotUsername,
      range.label,
      range.start,
      range.end
    );
    return;
  }

  if (normalized === "🟥 Bakong Today") {
    const range = todayRange();
    await sendSummary(
      chatId,
      "Bakong Summary",
      bakongSourceGroupId,
      bakongSourceBotUsername,
      range.label,
      range.start,
      range.end
    );
    return;
  }

  if (normalized === "📊 All Banks Month") {
    await sendAllBanksMonthSummary(chatId);
    return;
  }

  if (normalized === "📤 ABA Excel CSV") {
    await exportSourceCsv(chatId, "ABA / PayWay", abaSourceGroupId, abaSourceBotUsername, "aba-payway-report");
    return;
  }

  if (normalized === "📤 Bakong Excel CSV") {
    await exportSourceCsv(chatId, "Bakong", bakongSourceGroupId, bakongSourceBotUsername, "bakong-report");
    return;
  }

  if (normalized === "🔎 Search ABA Order") {
    await promptSearch(chatId, "aba");
    return;
  }

  if (normalized === "🔎 Search Bakong Order") {
    await promptSearch(chatId, "bakong");
    return;
  }

  if (normalized === "🛡 Security") {
    await sendSecurity(chatId);
    return;
  }

  if (normalized === "❓ Help") {
    await sendHelp(chatId);
    return;
  }

  await sendMenu(chatId, "Use the buttons below. This bot is menu-based.");
}

async function processUpdate(update: BotUpdate): Promise<void> {
  const message = update.message;
  const chatId = message?.chat?.id ? String(message.chat.id) : "";
  const userId = message?.from?.id ? String(message.from.id) : "";
  const text = message?.text?.trim() || "";

  if (!chatId || !text) {
    return;
  }

  if (!isAuthorized(chatId, userId)) {
    await sendBotHtmlMessage(summaryBotToken, chatId, "Access denied for this chat or user.", KEYBOARD);
    return;
  }

  if (rateLimitExceeded(chatId)) {
    await sendMenu(chatId, "Please wait a moment before sending another request.");
    return;
  }

  await handleText(chatId, userId, text);
}

async function pollUpdates(): Promise<void> {
  let offset = 0;

  while (true) {
    try {
      const updates = await botApi<BotUpdate[]>("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message"],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await processUpdate(update);
        } catch (error) {
          console.error("[!] Failed to process bot update:", error);
          const chatId = update.message?.chat?.id ? String(update.message.chat.id) : "";
          if (chatId) {
            await sendMenu(chatId, "Failed to build summary. Check the worker logs and try again.");
          }
        }
      }
    } catch (error) {
      console.error("[!] Summary bot polling failed:", error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function startSummaryBot(): Promise<void> {
  console.log("[*] Starting Telegram summary menu bot...");

  await client.start({
    phoneNumber: async () => input.text("Enter your phone number (+855...): "),
    password: async () => input.text("Enter your 2FA password (if any): "),
    phoneCode: async () => input.text("Enter the Telegram code: "),
    onError: (error) => console.error(error),
  });

  console.log("[!] MTProto session connected for summary reads.");
  if (!sessionString) {
    console.log("[!] Save this TELEGRAM_SESSION_STRING into .env.local:");
    console.log(client.session.save());
  }

  await pollUpdates();
}

void startSummaryBot().catch((error) => {
  console.error("[!] Summary menu bot failed:", error);
  process.exitCode = 1;
});
