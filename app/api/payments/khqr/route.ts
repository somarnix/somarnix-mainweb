import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";
import { createKhqr, type KhqrCurrency, type KhqrInput } from "@/lib/khqr";
import { createStyledKhqrDataUrl, createStyledKhqrTelegramDataUrl } from "@/lib/khqr-style";

type KhqrBody = Partial<{
  bankAccount: unknown;
  merchantName: unknown;
  merchantCity: unknown;
  amount: unknown;
  currency: unknown;
  storeLabel: unknown;
  phoneNumber: unknown;
  billNumber: unknown;
  terminalLabel: unknown;
  abaMerchantId: unknown;
  paywayMerchantId: unknown;
  paywayTerminalId: unknown;
  renderTelegramImage: unknown;
}>;

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function asOptionalAmount(value: unknown): number | string | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

type SequenceRow = RowDataPacket & {
  currentValue: number;
};

async function ensureKhqrBillSequenceTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS khqr_bill_sequences (
      id TINYINT UNSIGNED NOT NULL,
      current_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
}

function toSequenceLetters(value: number): string {
  let current = value;
  let output = "";

  while (current >= 0) {
    output = String.fromCharCode(65 + (current % 26)) + output;
    current = Math.floor(current / 26) - 1;
  }

  return output;
}

function formatSequenceCode(sequenceNumber: number): string {
  const zeroBased = Math.max(0, sequenceNumber - 1);
  const groupSize = 999;
  const letters = toSequenceLetters(Math.floor(zeroBased / groupSize));
  const numeric = String((zeroBased % groupSize) + 1).padStart(3, "0");
  return `${letters}${numeric}`;
}

async function getNextBillNumber(): Promise<string> {
  await ensureKhqrBillSequenceTable();
  await db.query(
    `
    INSERT IGNORE INTO khqr_bill_sequences (id, current_value)
    VALUES (1, 0)
    `
  );
  await db.query(
    `
    UPDATE khqr_bill_sequences
    SET current_value = LAST_INSERT_ID(current_value + 1)
    WHERE id = 1
    `
  );

  const [rows] = await db.query<SequenceRow[]>("SELECT LAST_INSERT_ID() AS currentValue");
  const sequenceNumber = Number(rows[0]?.currentValue ?? 0);
  if (!Number.isFinite(sequenceNumber) || sequenceNumber <= 0) {
    throw new Error("Failed to generate the next KHQR bill number.");
  }

  return `APPGSTECHKH${formatSequenceCode(sequenceNumber)}`;
}

function getDefaults(currency: KhqrCurrency) {
  const khrAccount = process.env.KHQR_KHR_BANK_ACCOUNT || process.env.KHQR_BANK_ACCOUNT || "004275254";
  const usdAccount = process.env.KHQR_USD_BANK_ACCOUNT || process.env.KHQR_BANK_ACCOUNT || "001949680";

  return {
    bankAccount: currency === "USD" ? usdAccount : khrAccount,
    merchantName: process.env.KHQR_MERCHANT_NAME || "SOPANHAROTH LEM",
    merchantCity: process.env.KHQR_MERCHANT_CITY || "Phnom Penh",
    currency,
    storeLabel: process.env.KHQR_STORE_LABEL || "GSTECHKH",
    phoneNumber: process.env.KHQR_PHONE_NUMBER || "85578409140",
    terminalLabel: process.env.KHQR_TERMINAL_LABEL || "GSTECHKH",
    abaMerchantId: process.env.ABA_PAYWAY_ABA_MERCHANT_ID || "125071016042664",
    paywayMerchantId: process.env.ABA_PAYWAY_MERCHANT_ID || "1387988",
    paywayTerminalId: process.env.ABA_PAYWAY_TERMINAL_ID || "031877066",
  };
}

function buildInput(body: KhqrBody): KhqrInput {
  const currency = ((asOptionalString(body.currency) || process.env.KHQR_CURRENCY || "KHR").toUpperCase() as KhqrCurrency);
  const defaults = getDefaults(currency);

  return {
    bankAccount: asOptionalString(body.bankAccount) || defaults.bankAccount || "",
    merchantName: asOptionalString(body.merchantName) || defaults.merchantName || "",
    merchantCity: asOptionalString(body.merchantCity) || defaults.merchantCity,
    amount: asOptionalAmount(body.amount),
    currency: defaults.currency,
    storeLabel: asOptionalString(body.storeLabel) || defaults.storeLabel,
    phoneNumber: asOptionalString(body.phoneNumber) || defaults.phoneNumber,
    billNumber: asOptionalString(body.billNumber) || "",
    terminalLabel: asOptionalString(body.terminalLabel) || defaults.terminalLabel,
    abaMerchantId: asOptionalString(body.abaMerchantId) || defaults.abaMerchantId,
    paywayMerchantId: asOptionalString(body.paywayMerchantId) || defaults.paywayMerchantId,
    paywayTerminalId: asOptionalString(body.paywayTerminalId) || defaults.paywayTerminalId,
  };
}

async function handleKhqrRequest(body: KhqrBody) {
  try {
    const input = buildInput(body);
    if (!input.billNumber) {
      input.billNumber = await getNextBillNumber();
    }
    const result = await createKhqr(input);
    const styleInput = {
      payload: result.payload,
      merchantName: input.merchantName,
      amount: input.amount,
      currency: input.currency,
    };
    const renderTelegramImage =
      body.renderTelegramImage === true ||
      body.renderTelegramImage === "true" ||
      body.renderTelegramImage === 1 ||
      body.renderTelegramImage === "1";
    const styledQrDataUrl = await createStyledKhqrDataUrl(styleInput);
    const telegramQrDataUrl = renderTelegramImage
      ? await createStyledKhqrTelegramDataUrl(styleInput)
      : null;

    return NextResponse.json({
      success: true,
      ...result,
      rawQrDataUrl: result.qrDataUrl,
      qrDataUrl: styledQrDataUrl,
      telegramQrDataUrl: telegramQrDataUrl || null,
      meta: {
        provider: "aba_payway",
        bankAccount: input.bankAccount,
        merchantName: input.merchantName,
        merchantCity: input.merchantCity,
        amount: input.amount ?? null,
        currency: input.currency,
        storeLabel: input.storeLabel,
        phoneNumber: input.phoneNumber,
        billNumber: input.billNumber,
        terminalLabel: input.terminalLabel,
        abaMerchantId: input.abaMerchantId,
        paywayMerchantId: input.paywayMerchantId,
        paywayTerminalId: input.paywayTerminalId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate ABA PayWay QR";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as KhqrBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  return handleKhqrRequest(body);
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  return handleKhqrRequest({
    bankAccount: url.searchParams.get("bankAccount"),
    merchantName: url.searchParams.get("merchantName"),
    merchantCity: url.searchParams.get("merchantCity"),
    amount: url.searchParams.get("amount"),
    currency: url.searchParams.get("currency"),
    storeLabel: url.searchParams.get("storeLabel"),
    phoneNumber: url.searchParams.get("phoneNumber"),
    billNumber: url.searchParams.get("billNumber"),
    terminalLabel: url.searchParams.get("terminalLabel"),
    abaMerchantId: url.searchParams.get("abaMerchantId"),
    paywayMerchantId: url.searchParams.get("paywayMerchantId"),
    paywayTerminalId: url.searchParams.get("paywayTerminalId"),
  });
}
