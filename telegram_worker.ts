import { NewMessage, NewMessageEvent } from "telegram/events";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from "input";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const apiId = Number(process.env.TELEGRAM_API_ID ?? 0);
const apiHash = process.env.TELEGRAM_API_HASH?.trim() || "";
const sessionString = process.env.TELEGRAM_SESSION_STRING || "";
const webhookUrl =
  process.env.NEXTJS_API_URL?.trim() || "http://localhost:3000/api/webhooks/payway";
const webhookSecret = process.env.PAYWAY_WEBHOOK_SECRET?.trim() || "";
const groupIdRaw = process.env.TELEGRAM_GROUP_ID?.trim() || "";
const targetGroupId = groupIdRaw || null;

if (!apiId || !apiHash || !targetGroupId || !webhookSecret) {
  throw new Error(
    "Missing TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_GROUP_ID, or PAYWAY_WEBHOOK_SECRET."
  );
}
const ensuredTargetGroupId = targetGroupId;

const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
  connectionRetries: 10,
  useWSS: true,
  deviceModel: "GSTECH Server",
  systemVersion: "Windows/Linux",
  appVersion: "1.0",
});

function parseCurrency(text: string): "USD" | "KHR" | "" {
  if (text.includes("$")) return "USD";
  if (text.includes("៛")) return "KHR";
  return "";
}

function parseAmount(text: string): string {
  const match = text.match(/(?:៛|\$)([\d,.]+)\s+paid by/i);
  return match?.[1]?.replace(/,/g, "").trim() || "";
}

function parseRemark(text: string): string {
  const match =
    text.match(/Remark:\s*(.*?)\s*Trx\. ID:/i) ||
    text.match(/Remark:\s*(.*?)\s*APV:/i);
  return match?.[1]?.replace(/[.\s]+$/g, "").trim() || "";
}

function parseTransactionId(text: string): string {
  const match = text.match(/Trx\. ID:\s*([0-9]+)/i);
  return match?.[1]?.trim() || "";
}

function parseApv(text: string): string {
  const match = text.match(/APV:\s*([0-9A-Za-z]+)/i);
  return match?.[1]?.trim() || "";
}

function parseBuyerName(text: string): string {
  const match = text.match(/paid by\s+(.*?)\s+on/i);
  return match?.[1]?.trim() || "ABA Transfer";
}

async function startListener(): Promise<void> {
  console.log("[*] Starting PayWay Telegram worker...");

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

  client.addEventHandler(
    async (event: NewMessageEvent) => {
      const message = event.message;
      const sender = await message.getSender();
      const senderUsername =
        sender && "username" in sender && typeof sender.username === "string"
          ? sender.username
          : "";
      const messageChatId =
        message.chatId && typeof (message.chatId as { toString?: () => string }).toString === "function"
          ? message.chatId.toString()
          : String(message.chatId ?? "");

      if (messageChatId !== ensuredTargetGroupId) return;
      if (senderUsername !== "PayWayByABA_bot") return;

      const messageText = message.text || "";
      const amount = parseAmount(messageText);
      const trxId = parseTransactionId(messageText);
      const remark = parseRemark(messageText);
      const apv = parseApv(messageText);
      const buyerName = parseBuyerName(messageText);
      const currency = parseCurrency(messageText);

      if (!amount || !trxId) {
        console.log("[!] Skipping payment message without amount or transaction id.");
        return;
      }

      console.log(
        `[+] PayWay message parsed: trx=${trxId} amount=${amount} currency=${currency || "-"} remark=${remark}`
      );

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-payway-secret": webhookSecret,
          },
          body: JSON.stringify({
            trx_id: trxId,
            amount,
            currency,
            remark,
            apv,
            buyer_name: buyerName,
            raw_text: messageText,
            paid_at: new Date(Number(message.date) * 1000).toISOString(),
          }),
        });

        const result = await response.json().catch(() => ({}));
        console.log("[+] Website API response:", result);
      } catch (error) {
        console.error("[!] Failed to call website API:", error);
      }
    },
    new NewMessage({})
  );

  console.log(`[*] Listening to Telegram group ${ensuredTargetGroupId.toString()}...`);
}

void startListener();
