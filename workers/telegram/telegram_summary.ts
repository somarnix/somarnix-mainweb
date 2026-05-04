import dotenv from "dotenv";
import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import {
  buildSummaryMessage,
  buildTotals,
  collectPaymentsForRange,
  extractId,
} from "./telegram_summary_core";

dotenv.config({ path: ".env.local" });
dotenv.config();

const apiId = Number(process.env.TELEGRAM_API_ID ?? 0);
const apiHash = process.env.TELEGRAM_API_HASH?.trim() || "";
const sessionString = process.env.TELEGRAM_SESSION_STRING || "";
const sourceGroupIdRaw =
  process.env.TELEGRAM_ABA_SOURCE_GROUP_ID?.trim() || process.env.TELEGRAM_GROUP_ID?.trim() || "";
const sourceBotUsername =
  process.env.TELEGRAM_ABA_SOURCE_BOT_USERNAME?.trim().replace(/^@/, "") || "PayWayByABA_bot";
const summaryBotToken = process.env.TELEGRAM_SUMMARY_BOT_TOKEN?.trim() || "";
const summaryChatIdRaw = process.env.TELEGRAM_SUMMARY_CHAT_ID?.trim() || "";

if (!apiId || !apiHash || !sourceGroupIdRaw) {
  throw new Error("Missing TELEGRAM_API_ID, TELEGRAM_API_HASH, or TELEGRAM_GROUP_ID.");
}

const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
  connectionRetries: 10,
  useWSS: true,
  deviceModel: "SOMARNIX Summary Worker",
  systemVersion: "Windows/Linux",
  appVersion: "1.0",
});

function parseMonthArgument(): string | null {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--month=")) {
      return arg.slice("--month=".length).trim();
    }
  }
  return null;
}

function parseDryRunArgument(): boolean {
  return process.argv.slice(2).includes("--dry-run");
}

function resolveMonthRange(monthArg: string | null): { start: Date; end: Date; label: string } {
  if (monthArg) {
    const match = monthArg.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      throw new Error("Invalid --month value. Use YYYY-MM, for example --month=2026-03.");
    }
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
    return {
      start,
      end,
      label: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
    };
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return {
    start,
    end,
    label: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
}

async function sendSummaryMessage(message: string): Promise<void> {
  if (!summaryBotToken || !summaryChatIdRaw) {
    throw new Error("Missing TELEGRAM_SUMMARY_BOT_TOKEN or TELEGRAM_SUMMARY_CHAT_ID.");
  }

  const response = await fetch(`https://api.telegram.org/bot${summaryBotToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: extractId(summaryChatIdRaw) || summaryChatIdRaw,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Telegram summary send failed: ${response.status} ${detail}`.trim());
  }
}

async function startSummaryWorker(): Promise<void> {
  console.log("[*] Starting Telegram summary worker...");

  await client.start({
    phoneNumber: async () => input.text("Enter your phone number (+855...): "),
    password: async () => input.text("Enter your 2FA password (if any): "),
    phoneCode: async () => input.text("Enter the Telegram code: "),
    onError: (error) => console.error(error),
  });

  console.log("[!] Telegram MTProto session connected.");
  if (!sessionString) {
    console.log("[!] Save this TELEGRAM_SESSION_STRING into .env.local:");
    console.log(client.session.save());
  }

  const monthArg = parseMonthArgument();
  const dryRun = parseDryRunArgument();
  const { start, end, label } = resolveMonthRange(monthArg);
  const payments = await collectPaymentsForRange(client, sourceGroupIdRaw, sourceBotUsername, start, end);
  const totals = buildTotals(payments);
  const message = buildSummaryMessage(
    payments,
    totals,
    label,
    start,
    end,
    sourceGroupIdRaw,
    sourceBotUsername,
    "ABA / PayWay Summary"
  );

  if (dryRun) {
    console.log("[*] Dry run enabled. Summary message:");
    console.log(message);
    return;
  }

  await sendSummaryMessage(message);
  console.log(`[+] Summary sent to ${extractId(summaryChatIdRaw) || summaryChatIdRaw} for ${label}.`);
}

void startSummaryWorker().catch((error) => {
  console.error("[!] Summary worker failed:", error);
  process.exitCode = 1;
});
