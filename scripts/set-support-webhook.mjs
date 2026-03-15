import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(projectRoot, ".env.local"), override: true });

function getEnv(name) {
  return process.env[name]?.trim() || "";
}

function maskToken(token) {
  if (token.length < 12) return "***";
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

async function main() {
  const botToken = getEnv("TELEGRAM_SUPPORT_BOT_TOKEN");
  const secret = getEnv("TELEGRAM_SUPPORT_WEBHOOK_SECRET");
  const explicitWebhookUrl = getEnv("TELEGRAM_SUPPORT_WEBHOOK_URL");
  const appUrl = getEnv("APP_URL");
  const webhookUrl = explicitWebhookUrl || (appUrl ? `${appUrl.replace(/\/$/, "")}/api/telegram/support` : "");

  if (!botToken) {
    throw new Error("TELEGRAM_SUPPORT_BOT_TOKEN is required in .env.local");
  }
  if (!secret) {
    throw new Error("TELEGRAM_SUPPORT_WEBHOOK_SECRET is required in .env.local");
  }
  if (!webhookUrl) {
    throw new Error(
      "Set TELEGRAM_SUPPORT_WEBHOOK_URL in .env.local, or APP_URL so the webhook can be derived."
    );
  }
  if (/localhost|127\.0\.0\.1/i.test(webhookUrl)) {
    throw new Error(
      "Telegram cannot reach localhost. Set TELEGRAM_SUPPORT_WEBHOOK_URL to a public tunnel or domain."
    );
  }

  const url = new URL(`https://api.telegram.org/bot${botToken}/setWebhook`);
  url.searchParams.set("url", webhookUrl);
  url.searchParams.set("secret_token", secret);

  const response = await fetch(url, { method: "GET" });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.description || `${response.status} ${response.statusText}`);
  }

  console.log("Support webhook configured.");
  console.log(`Bot: ${maskToken(botToken)}`);
  console.log(`Webhook URL: ${webhookUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

