type TelegramTarget = {
  botToken: string;
  chatId: string;
};

type OrderTelegramInput = {
  orderId: number;
  orderNumber: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
  itemSummary: string[];
};

type PaymentReviewTelegramInput = {
  paymentId: number;
  orderId: number;
  orderNumber: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  bankName: string;
  accountNumber: string;
  paymentApv: string;
  paidAt: string;
  itemSummary: string[];
};

type PaymentDecisionTelegramInput = {
  orderId: number;
  orderNumber: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  bankName: string;
  accountNumber: string;
  paymentApv: string;
  paidAt: string;
  itemSummary: string[];
  decision: "approved" | "declined";
  decisionNote: string;
  decisionSource: string;
};

type OrderStatusTelegramInput = {
  orderId: number;
  orderNumber: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  state: string;
  result: string;
  itemSummary: string[];
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramCallbackReplyMarkup = {
  inline_keyboard: Array<
    Array<
      | { text: string; callback_data: string }
      | { text: string; url: string }
    >
  >;
};

const ICONS = {
  receipt: "\u{1F9FE}",
  sparkles: "\u2728",
  bust: "\u{1F464}",
  mail: "\u{1F4E7}",
  bank: "\u{1F3E6}",
  id: "\u{1F194}",
  money: "\u{1F4B5}",
  hourglass: "\u23F3",
  clock: "\u{1F552}",
  shopping: "\u{1F6CD}",
  creditCard: "\u{1F4B3}",
  cardIndex: "\u{1F522}",
  check: "\u2705",
  cross: "\u274C",
  package: "\u{1F4E6}",
  robot: "\u{1F916}",
  tools: "\u{1F6E0}",
  rocket: "\u{1F680}",
};

function getEnvTrimmed(name: string): string {
  return process.env[name]?.trim() || "";
}

function getNotifyTarget(): TelegramTarget | null {
  const botToken = getEnvTrimmed("TELEGRAM_NOTIFY_BOT_TOKEN") || getEnvTrimmed("TELEGRAM_BOT_TOKEN");
  const chatId = getEnvTrimmed("TELEGRAM_NOTIFY_CHAT_ID") || getEnvTrimmed("TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) return null;
  return { botToken, chatId };
}

function getAdminTarget(): TelegramTarget | null {
  const botToken =
    getEnvTrimmed("TELEGRAM_ADMIN_BOT_TOKEN") ||
    getEnvTrimmed("TELEGRAM_NOTIFY_BOT_TOKEN") ||
    getEnvTrimmed("TELEGRAM_BOT_TOKEN");
  const chatId =
    getEnvTrimmed("TELEGRAM_ADMIN_CHAT_ID") ||
    getEnvTrimmed("TELEGRAM_NOTIFY_CHAT_ID") ||
    getEnvTrimmed("TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) return null;
  return { botToken, chatId };
}

function listUniqueTargets(preferAdmin = false): TelegramTarget[] {
  const targets = preferAdmin
    ? [getAdminTarget(), getNotifyTarget()]
    : [getNotifyTarget(), getAdminTarget()];

  const seenChatIds = new Set<string>();
  const unique: TelegramTarget[] = [];
  for (const target of targets) {
    if (!target) continue;
    const chatKey = String(target.chatId);
    if (seenChatIds.has(chatKey)) continue;
    seenChatIds.add(chatKey);
    unique.push(target);
  }
  return unique;
}

export function isTelegramConfigured(): boolean {
  return listUniqueTargets().length > 0;
}

export function getTelegramAdminBotConfig(): TelegramTarget | null {
  return getAdminTarget();
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

function formatItems(items: string[]): string {
  if (items.length === 0) return "1. N/A";
  return items.map((item, index) => `${index + 1}. ${escapeHtml(item)}`).join("\n");
}

async function callTelegramApi<T>(
  botToken: string,
  method: string,
  payload: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as TelegramApiResponse<T> | null;
  if (!response.ok || !data?.ok) {
    const detail = data?.description || `${response.status} ${response.statusText}`;
    throw new Error(`Telegram ${method} failed: ${detail}`);
  }

  return data.result as T;
}

async function sendTelegramHtmlMessageToTarget(
  target: TelegramTarget,
  message: string,
  replyMarkup?: TelegramCallbackReplyMarkup
): Promise<void> {
  await callTelegramApi(target.botToken, "sendMessage", {
    chat_id: target.chatId,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function broadcastTelegramHtmlMessage(
  message: string,
  options?: {
    preferAdmin?: boolean;
    replyMarkup?: TelegramCallbackReplyMarkup;
    adminOnly?: boolean;
    notifyOnly?: boolean;
  }
): Promise<void> {
  const targets = options?.adminOnly
    ? (() => {
        const admin = getAdminTarget();
        return admin ? [admin] : [];
      })()
    : options?.notifyOnly
      ? (() => {
          const notify = getNotifyTarget();
          return notify ? [notify] : [];
        })()
      : listUniqueTargets(options?.preferAdmin);

  for (const target of targets) {
    await sendTelegramHtmlMessageToTarget(target, message, options?.replyMarkup);
  }
}

function getAdminOrderActions(orderId: number, paymentId: number): TelegramCallbackReplyMarkup {
  const buttons: TelegramCallbackReplyMarkup["inline_keyboard"] = [
    [
      { text: "Approve", callback_data: `payment:approve:${paymentId}` },
      { text: "Decline", callback_data: `payment:decline:${paymentId}` },
    ],
  ];

  const appBaseUrl = getEnvTrimmed("APP_BASE_URL");
  if (appBaseUrl) {
    buttons.push([
      {
        text: "Open Order",
        url: `${appBaseUrl.replace(/\/$/, "")}/admin-pages/orders?orderId=${orderId}`,
      },
    ]);
  }

  return { inline_keyboard: buttons };
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text: string
): Promise<void> {
  const admin = getAdminTarget();
  if (!admin) return;

  await callTelegramApi(admin.botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export async function clearTelegramInlineKeyboard(
  chatId: string | number,
  messageId: number
): Promise<void> {
  const admin = getAdminTarget();
  if (!admin) return;

  await callTelegramApi(admin.botToken, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}

export async function sendTelegramAdminSystemMessage(message: string): Promise<void> {
  const admin = getAdminTarget();
  if (!admin) return;
  await sendTelegramHtmlMessageToTarget(admin, message);
}

export async function sendTelegramOrderCreatedNotification(
  input: OrderTelegramInput
): Promise<void> {
  const message = [
    `${ICONS.receipt} <b>KHQR Auto Payment System</b>`,
    `${ICONS.sparkles} <b>New Payment Order Created</b>`,
    "",
    `${ICONS.bust} <b>Buyer:</b> ${escapeHtml(input.buyerName)}`,
    `${ICONS.mail} <b>Email:</b> ${escapeHtml(input.buyerEmail)}`,
    `${ICONS.bank} <b>Buyer's Bank:</b> Waiting for payer`,
    `${ICONS.id} <b>Order ID:</b> ${escapeHtml(String(input.orderId))}`,
    `${ICONS.receipt} <b>Bill Number:</b> ${escapeHtml(input.orderNumber)}`,
    `${ICONS.money} <b>Amount:</b> $${escapeHtml(formatMoney(input.amount))}`,
    `${ICONS.hourglass} <b>Status:</b> Awaiting payment`,
    `${ICONS.clock} <b>Created:</b> ${escapeHtml(formatDateTime(input.createdAt))}`,
    "",
    `${ICONS.shopping} <b>Items</b>`,
    formatItems(input.itemSummary),
    "",
    "#PaymentOrder #AwaitingPayment",
  ].join("\n");

  await broadcastTelegramHtmlMessage(message, { notifyOnly: true });
}

export async function sendTelegramPaymentReviewNotification(
  input: PaymentReviewTelegramInput
): Promise<void> {
  const message = [
    `${ICONS.creditCard} <b>Payment Proof Submitted</b>`,
    "",
    `${ICONS.id} <b>Order ID:</b> ${escapeHtml(String(input.orderId))}`,
    `${ICONS.receipt} <b>Bill Number:</b> ${escapeHtml(input.orderNumber)}`,
    `${ICONS.bust} <b>Buyer:</b> ${escapeHtml(input.buyerName)}`,
    `${ICONS.mail} <b>Email:</b> ${escapeHtml(input.buyerEmail)}`,
    `${ICONS.bank} <b>Bank:</b> ${escapeHtml(input.bankName)}`,
    `${ICONS.cardIndex} <b>Account Number:</b> ${escapeHtml(input.accountNumber)}`,
    `${ICONS.creditCard} <b>Payment APV:</b> ${escapeHtml(input.paymentApv)}`,
    `${ICONS.money} <b>Amount:</b> $${escapeHtml(formatMoney(input.amount))}`,
    `${ICONS.clock} <b>Submitted:</b> ${escapeHtml(formatDateTime(input.paidAt))}`,
    `${ICONS.hourglass} <b>Status:</b> Waiting admin review`,
    "",
    `${ICONS.shopping} <b>Items</b>`,
    formatItems(input.itemSummary),
    "",
    "#Payment #WaitingReview",
  ].join("\n");

  await broadcastTelegramHtmlMessage(message, {
    preferAdmin: true,
    adminOnly: true,
    replyMarkup: getAdminOrderActions(input.orderId, input.paymentId),
  });
}

export async function sendTelegramPaymentDecisionNotification(
  input: PaymentDecisionTelegramInput
): Promise<void> {
  const decisionLabel = input.decision === "approved" ? "Payment Approved" : "Payment Declined";
  const icon = input.decision === "approved" ? ICONS.check : ICONS.cross;
  const resultLabel = input.decision === "approved" ? "Successful" : "Declined";

  const message = [
    `${icon} <b>${decisionLabel}</b>`,
    "",
    `${ICONS.id} <b>Order ID:</b> ${escapeHtml(String(input.orderId))}`,
    `${ICONS.receipt} <b>Bill Number:</b> ${escapeHtml(input.orderNumber)}`,
    `${ICONS.bust} <b>Buyer:</b> ${escapeHtml(input.buyerName)}`,
    `${ICONS.mail} <b>Email:</b> ${escapeHtml(input.buyerEmail)}`,
    `${ICONS.bank} <b>Bank:</b> ${escapeHtml(input.bankName)}`,
    `${ICONS.cardIndex} <b>Account Number:</b> ${escapeHtml(input.accountNumber)}`,
    `${ICONS.creditCard} <b>Payment APV:</b> ${escapeHtml(input.paymentApv)}`,
    `${ICONS.money} <b>Amount:</b> $${escapeHtml(formatMoney(input.amount))}`,
    `${ICONS.clock} <b>Paid At:</b> ${escapeHtml(formatDateTime(input.paidAt))}`,
    `${ICONS.package} <b>Result:</b> ${escapeHtml(resultLabel)}`,
    `${ICONS.robot} <b>Source:</b> ${escapeHtml(input.decisionSource)}`,
    `${ICONS.tools} <b>Review Note:</b> ${escapeHtml(input.decisionNote)}`,
    "",
    `${ICONS.shopping} <b>Items</b>`,
    formatItems(input.itemSummary),
    "",
    input.decision === "approved" ? "#Payment #Approved" : "#Payment #Declined",
  ].join("\n");

  await broadcastTelegramHtmlMessage(message, { notifyOnly: true });
}

export async function sendTelegramPaymentSubmittedNotification(
  input: PaymentReviewTelegramInput
): Promise<void> {
  await sendTelegramPaymentReviewNotification(input);
}

export async function sendTelegramOrderStatusNotification(
  input: OrderStatusTelegramInput
): Promise<void> {
  const stateLabel = input.state.replace(/_/g, " ");
  const resultLabel = input.result.replace(/_/g, " ");
  const message = [
    `${ICONS.package} <b>Order Status Updated</b>`,
    "",
    `${ICONS.receipt} <b>Bill Number:</b> ${escapeHtml(input.orderNumber)}`,
    `${ICONS.id} <b>Order ID:</b> ${escapeHtml(String(input.orderId))}`,
    `${ICONS.bust} <b>Buyer:</b> ${escapeHtml(input.buyerName)}`,
    `${ICONS.mail} <b>Email:</b> ${escapeHtml(input.buyerEmail)}`,
    `${ICONS.money} <b>Amount:</b> $${escapeHtml(formatMoney(input.amount))}`,
    `${ICONS.package} <b>State:</b> ${escapeHtml(stateLabel)}`,
    `${ICONS.tools} <b>Result:</b> ${escapeHtml(resultLabel)}`,
    "",
    `${ICONS.shopping} <b>Items</b>`,
    formatItems(input.itemSummary),
    "",
    "#OrderUpdate",
  ].join("\n");

  await broadcastTelegramHtmlMessage(message, { notifyOnly: true });
}

export async function sendTelegramSystemReadyNotification(systemLabel: string): Promise<void> {
  const message = [
    `${ICONS.rocket} <b>Payment System Started</b>`,
    "",
    `${ICONS.robot} <b>System:</b> ${escapeHtml(systemLabel)}`,
    `${ICONS.clock} <b>Time:</b> ${escapeHtml(formatDateTime(new Date().toISOString()))}`,
    "",
    `${ICONS.check} System is ready to accept payments.`,
    "",
    "#SystemReady #PaymentBot",
  ].join("\n");

  await broadcastTelegramHtmlMessage(message, { notifyOnly: true });
}
