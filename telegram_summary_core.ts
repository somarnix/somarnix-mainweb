import type { TelegramClient } from "telegram";

export type Currency = "USD" | "KHR" | "";

export type PaymentRecord = {
  amount: number;
  currency: Currency;
  buyerName: string;
  buyerTag: string;
  paymentChannel: string;
  merchantLabel: string;
  remark: string;
  trxId: string;
  apv: string;
  paidAt: Date;
  rawText: string;
};

export type SummaryTotals = {
  count: number;
  usd: number;
  khr: number;
  buyers: Set<string>;
  remarks: Set<string>;
  firstPaidAt: Date | null;
  lastPaidAt: Date | null;
  topBuyers: Map<string, { count: number; usd: number; khr: number }>;
};

export function extractId(value: string): string {
  const match = value.match(/-?\d+/);
  return match?.[0] || "";
}

export function parseCurrency(text: string): Currency {
  if (text.includes("$")) return "USD";
  if (text.includes("៛")) return "KHR";
  return "";
}

export function parseAmount(text: string): number {
  const match = text.match(/(?:៛|\$)([\d,.]+)\s+paid by/i);
  const raw = match?.[1]?.replace(/,/g, "").trim() || "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseRemark(text: string): string {
  const match =
    text.match(/Remark:\s*(.*?)\s*Trx\. ID:/i) ||
    text.match(/Remark:\s*(.*?)\s*APV:/i);
  return match?.[1]?.replace(/[.\s]+$/g, "").trim() || "";
}

export function parseTransactionId(text: string): string {
  const match = text.match(/Trx\. ID:\s*([0-9]+)/i);
  return match?.[1]?.trim() || "";
}

export function parseApv(text: string): string {
  const match = text.match(/APV:\s*([0-9A-Za-z]+)/i);
  return match?.[1]?.trim() || "";
}

export function parseBuyerName(text: string): string {
  const match = text.match(/paid by\s+(.*?)\s+on/i);
  const raw = match?.[1]?.trim() || "Unknown Buyer";
  return raw.replace(/\s*\([^)]*\)\s*$/g, "").trim() || raw;
}

export function parseBuyerTag(text: string): string {
  const match = text.match(/paid by\s+.*?(\([^)]*\))\s+on/i);
  return match?.[1]?.trim() || "";
}

export function parsePaymentChannel(text: string): string {
  const match = text.match(/\s+via\s+(.*?)\s+at\s+/i);
  return match?.[1]?.trim() || "";
}

export function parseMerchantLabel(text: string): string {
  const match = text.match(/\s+at\s+(.*?)\.\s*Trx\. ID:/i);
  return match?.[1]?.trim() || "";
}

export function normalizeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return new Date(0);
  if (numeric > 10_000_000_000) return new Date(numeric);
  return new Date(numeric * 1000);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatKhr(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return "N/A";
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function extractUsername(sender: unknown): string {
  if (!sender || typeof sender !== "object") return "";
  const maybeUsername = (sender as { username?: unknown }).username;
  return typeof maybeUsername === "string" ? maybeUsername : "";
}

export async function resolveSourceDialog(client: TelegramClient, targetGroupId: string) {
  const exactId = extractId(targetGroupId);
  const comparableIds = new Set<string>([
    exactId,
    exactId.replace(/^-100/, ""),
    exactId.replace(/^-/, ""),
  ]);

  for await (const dialog of client.iterDialogs({})) {
    const dialogId = dialog.id?.toString() || "";
    const candidateIds = new Set<string>([
      dialogId,
      `-${dialogId}`,
      `-100${dialogId}`,
    ]);
    for (const candidate of candidateIds) {
      if (comparableIds.has(candidate)) {
        return dialog.entity ?? dialog.inputEntity;
      }
    }
  }

  throw new Error(`Could not find Telegram dialog for source group ${targetGroupId}.`);
}

export function parsePaymentRecord(text: string, paidAt: Date): PaymentRecord | null {
  const amount = parseAmount(text);
  const trxId = parseTransactionId(text);
  if (!amount || !trxId) {
    return null;
  }

  return {
    amount,
    currency: parseCurrency(text),
    buyerName: parseBuyerName(text),
    buyerTag: parseBuyerTag(text),
    paymentChannel: parsePaymentChannel(text),
    merchantLabel: parseMerchantLabel(text),
    remark: parseRemark(text),
    trxId,
    apv: parseApv(text),
    paidAt,
    rawText: text,
  };
}

export async function collectPaymentsForRange(
  client: TelegramClient,
  sourceGroupId: string,
  sourceBotUsername: string,
  start: Date,
  end: Date
): Promise<PaymentRecord[]> {
  const dialog = await resolveSourceDialog(client, sourceGroupId);
  const payments: PaymentRecord[] = [];

  for await (const message of client.iterMessages(dialog, {})) {
    const paidAt = normalizeDate((message as { date?: unknown }).date);
    if (paidAt < start) {
      break;
    }
    if (paidAt >= end) {
      continue;
    }

    const rawText =
      typeof (message as { text?: unknown }).text === "string"
        ? ((message as { text: string }).text || "")
        : typeof (message as { message?: unknown }).message === "string"
          ? ((message as { message: string }).message || "")
          : "";
    if (!rawText) {
      continue;
    }

    const sender = await (message as { getSender: () => Promise<unknown> }).getSender();
    if (extractUsername(sender) !== sourceBotUsername) {
      continue;
    }

    const payment = parsePaymentRecord(rawText, paidAt);
    if (payment) {
      payments.push(payment);
    }
  }

  return payments.sort((left, right) => left.paidAt.getTime() - right.paidAt.getTime());
}

export function buildTotals(payments: PaymentRecord[]): SummaryTotals {
  const totals: SummaryTotals = {
    count: 0,
    usd: 0,
    khr: 0,
    buyers: new Set<string>(),
    remarks: new Set<string>(),
    firstPaidAt: null,
    lastPaidAt: null,
    topBuyers: new Map<string, { count: number; usd: number; khr: number }>(),
  };

  for (const payment of payments) {
    totals.count += 1;
    if (payment.currency === "USD") totals.usd += payment.amount;
    if (payment.currency === "KHR") totals.khr += payment.amount;
    totals.buyers.add(payment.buyerName);
    if (payment.remark) totals.remarks.add(payment.remark);
    totals.firstPaidAt = totals.firstPaidAt ?? payment.paidAt;
    totals.lastPaidAt = payment.paidAt;

    const buyerTotals = totals.topBuyers.get(payment.buyerName) || { count: 0, usd: 0, khr: 0 };
    buyerTotals.count += 1;
    if (payment.currency === "USD") buyerTotals.usd += payment.amount;
    if (payment.currency === "KHR") buyerTotals.khr += payment.amount;
    totals.topBuyers.set(payment.buyerName, buyerTotals);
  }

  return totals;
}

function formatBuyerTotals(name: string, totals: { count: number; usd: number; khr: number }): string {
  const amountParts: string[] = [];
  if (totals.usd > 0) amountParts.push(formatUsd(totals.usd));
  if (totals.khr > 0) amountParts.push(`${formatKhr(totals.khr)} KHR`);
  const amounts = amountParts.length > 0 ? amountParts.join(" | ") : "No amount";
  return `${escapeHtml(name)} x${totals.count} | ${escapeHtml(amounts)}`;
}

export function buildSummaryMessage(
  payments: PaymentRecord[],
  totals: SummaryTotals,
  periodLabel: string,
  start: Date,
  end: Date,
  sourceGroupId: string,
  sourceBotUsername: string,
  summaryTitle = "GSTECHKHBanks Summary"
): string {
  const topBuyerLines = Array.from(totals.topBuyers.entries())
    .sort((left, right) => {
      const amountLeft = left[1].usd + left[1].khr / 4000;
      const amountRight = right[1].usd + right[1].khr / 4000;
      return amountRight - amountLeft;
    })
    .slice(0, 5)
    .map((entry, index) => `${index + 1}. ${formatBuyerTotals(entry[0], entry[1])}`);

  const recentPayments = payments
    .slice(-5)
    .reverse()
    .map((payment, index) => {
      const amountLabel =
        payment.currency === "USD"
          ? formatUsd(payment.amount)
          : payment.currency === "KHR"
            ? `${formatKhr(payment.amount)} KHR`
            : String(payment.amount);
      const remarkPart = payment.remark ? ` | ${payment.remark}` : "";
      return `${index + 1}. ${escapeHtml(payment.buyerName)} | ${escapeHtml(amountLabel)}${escapeHtml(
        remarkPart
      )}`;
    });
  const successCount = totals.count;
  const failedCount = 0;
  const successRate = successCount + failedCount > 0 ? ((successCount / (successCount + failedCount)) * 100).toFixed(2) : "0.00";

  return [
    `📊 <b>${escapeHtml(summaryTitle)}</b>`,
    `🗓 <b>Period:</b> ${escapeHtml(periodLabel)}`,
    `📅 <b>Range:</b> ${escapeHtml(formatDateTime(start))} to ${escapeHtml(formatDateTime(end))}`,
    `💬 <b>Source Group:</b> <code>${escapeHtml(extractId(sourceGroupId) || sourceGroupId)}</code>`,
    `🤖 <b>Source Bot:</b> @${escapeHtml(sourceBotUsername)}`,
    "",
    `💳 <b>Payments Count:</b> ${totals.count}`,
    `✅ <b>Successful Payments:</b> ${successCount}`,
    `❌ <b>Failed Payments:</b> ${failedCount}`,
    `📈 <b>Success Rate:</b> ${successRate}%`,
    `👥 <b>Unique Buyers:</b> ${totals.buyers.size}`,
    `🧾 <b>Unique Remarks:</b> ${totals.remarks.size}`,
    `💵 <b>USD Total:</b> ${escapeHtml(formatUsd(totals.usd))}`,
    `៛ <b>KHR Total:</b> ${escapeHtml(formatKhr(totals.khr))} KHR`,
    `🕒 <b>First Payment:</b> ${escapeHtml(formatDateTime(totals.firstPaidAt))}`,
    `🕓 <b>Last Payment:</b> ${escapeHtml(formatDateTime(totals.lastPaidAt))}`,
    "",
    "<b>Top Buyers</b>",
    ...(topBuyerLines.length > 0 ? topBuyerLines : ["No payments found."]),
    "",
    "<b>Recent Payments</b>",
    ...(recentPayments.length > 0 ? recentPayments : ["No payments found."]),
    "",
    `#BankSummary #${escapeHtml(periodLabel.replace(/\s+/g, ""))}`,
  ].join("\n");
}

export async function searchPayments(
  client: TelegramClient,
  sourceGroupId: string,
  sourceBotUsername: string,
  query: string,
  limit = 10
): Promise<PaymentRecord[]> {
  const dialog = await resolveSourceDialog(client, sourceGroupId);
  const payments: PaymentRecord[] = [];

  for await (const message of client.iterMessages(dialog, { search: query })) {
    const paidAt = normalizeDate((message as { date?: unknown }).date);
    const rawText =
      typeof (message as { text?: unknown }).text === "string"
        ? ((message as { text: string }).text || "")
        : typeof (message as { message?: unknown }).message === "string"
          ? ((message as { message: string }).message || "")
          : "";
    if (!rawText) {
      continue;
    }

    const sender = await (message as { getSender: () => Promise<unknown> }).getSender();
    if (extractUsername(sender) !== sourceBotUsername) {
      continue;
    }

    const payment = parsePaymentRecord(rawText, paidAt);
    if (!payment) {
      continue;
    }

    payments.push(payment);
    if (payments.length >= limit) {
      break;
    }
  }

  return payments.sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime());
}

export function buildPaymentsCsv(payments: PaymentRecord[], sourceLabel: string): string {
  const toCsvCell = (value: string | number, excelText = false): string => {
    const stringValue = String(value ?? "");
    const normalized = excelText ? `="${stringValue.replace(/"/g, '""')}"` : stringValue;
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const rows = [
    [
      "source",
      "paid_at",
      "buyer_name",
      "buyer_tag",
      "payment_channel",
      "merchant_label",
      "currency",
      "amount",
      "remark",
      "trx_id",
      "apv",
      "raw_text",
    ],
    ...payments.map((payment) => [
      sourceLabel,
      formatDateTime(payment.paidAt),
      payment.buyerName,
      payment.buyerTag,
      payment.paymentChannel,
      payment.merchantLabel,
      payment.currency,
      String(payment.amount),
      payment.remark,
      payment.trxId,
      payment.apv,
      payment.rawText,
    ]),
  ];

  return rows
    .map((row, index) => {
      if (index === 0) {
        return row.map((value) => toCsvCell(value)).join(",");
      }

      return [
        toCsvCell(row[0]),
        toCsvCell(row[1]),
        toCsvCell(row[2]),
        toCsvCell(row[3]),
        toCsvCell(row[4]),
        toCsvCell(row[5]),
        toCsvCell(row[6]),
        toCsvCell(row[7]),
        toCsvCell(row[8]),
        toCsvCell(row[9], true),
        toCsvCell(row[10], true),
        toCsvCell(row[11]),
      ].join(",");
    })
    .join("\n");
}

export async function sendBotHtmlMessage(
  botToken: string,
  chatId: string,
  message: string,
  replyMarkup?: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: extractId(chatId) || chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Telegram send failed: ${response.status} ${detail}`.trim());
  }
}

export async function sendBotDocument(
  botToken: string,
  chatId: string,
  filename: string,
  content: string,
  caption = ""
): Promise<void> {
  const formData = new FormData();
  formData.set("chat_id", extractId(chatId) || chatId);
  formData.set("caption", caption);
  formData.set("disable_content_type_detection", "true");
  formData.set("document", new Blob([content], { type: "text/csv;charset=utf-8" }), filename);

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Telegram document send failed: ${response.status} ${detail}`.trim());
  }
}
