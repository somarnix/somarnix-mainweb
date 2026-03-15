import crypto from "crypto";

import QRCode from "qrcode";

export type KhqrCurrency = "KHR" | "USD";

export type KhqrInput = {
  bankAccount: string;
  merchantName: string;
  merchantCity: string;
  amount?: number | string | null;
  currency: KhqrCurrency;
  storeLabel: string;
  phoneNumber: string;
  billNumber: string;
  terminalLabel: string;
  abaMerchantId?: string;
  paywayMerchantId?: string;
  paywayTerminalId?: string;
};

export type KhqrResult = {
  payload: string;
  md5: string;
  qrDataUrl: string;
};

const TAGS = {
  payloadFormatIndicator: "00",
  pointOfInitiationMethod: "01",
  abaMerchantAccountInformation: "30",
  merchantCategoryCode: "52",
  transactionCurrency: "53",
  transactionAmount: "54",
  countryCode: "58",
  merchantName: "59",
  merchantCity: "60",
  additionalData: "62",
  paywayRouting: "68",
  crc: "63",
} as const;

const CURRENCY_CODES: Record<KhqrCurrency, string> = {
  KHR: "116",
  USD: "840",
};

function padLength(value: string): string {
  return String(value.length).padStart(2, "0");
}

function tlv(tag: string, value: string): string {
  return `${tag}${padLength(value)}${value}`;
}

function sanitizeText(value: string, fieldName: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters.`);
  }
  return normalized;
}

function sanitizeNumericText(value: string, fieldName: string, maxLength: number): string {
  const normalized = value.replace(/\D/g, "");
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} digits.`);
  }
  return normalized;
}

function normalizePhoneNumber(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("855")) {
    digits = digits.slice(3);
  }
  if (digits && !digits.startsWith("0")) {
    digits = `0${digits}`;
  }
  return digits;
}

function formatAmount(amount: number | string): string {
  const numeric =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount).trim());

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const formatted = numeric.toFixed(2).replace(/\.?0+$/, "");
  if (formatted.length > 13) {
    throw new Error("Amount is too long.");
  }
  return formatted;
}

function crc16Ccitt(data: string): string {
  let crc = 0xffff;

  for (const byte of Buffer.from(data, "utf8")) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i += 1) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildKhqrPayload(input: KhqrInput): string {
  const merchantName = sanitizeText(input.merchantName, "Merchant name", 25);
  const merchantCity = sanitizeText(input.merchantCity, "Merchant city", 15);
  const billNumber = sanitizeText(input.billNumber, "Bill number", 25);
  const storeLabel = sanitizeText(input.storeLabel, "Store label", 25);
  const terminalLabel = sanitizeText(input.terminalLabel, "Terminal label", 25);
  const phoneNumber = sanitizeText(normalizePhoneNumber(input.phoneNumber), "Phone number", 25);
  const abaMerchantId = sanitizeNumericText(
    input.abaMerchantId || "",
    "ABA merchant ID",
    32
  );
  const paywayMerchantId = sanitizeNumericText(
    input.paywayMerchantId || "",
    "PayWay merchant ID",
    25
  );
  const paywayTerminalId = sanitizeNumericText(
    input.paywayTerminalId || "",
    "PayWay terminal ID",
    25
  );
  const currency = input.currency.toUpperCase() as KhqrCurrency;

  if (!(currency in CURRENCY_CODES)) {
    throw new Error("Currency must be KHR or USD.");
  }

  const amount = input.amount;
  if (amount === undefined || amount === null || `${amount}`.trim() === "") {
    throw new Error("Amount is required.");
  }

  const merchantAccountInfo = tlv(
    TAGS.abaMerchantAccountInformation,
    [tlv("00", "abaakhppxxx@abaa"), tlv("01", abaMerchantId), tlv("02", "ABA Bank")].join("")
  );

  const additionalData = tlv(
    TAGS.additionalData,
    [
      tlv("01", billNumber),
      tlv("02", phoneNumber),
      tlv("03", storeLabel),
      tlv("07", terminalLabel),
      tlv(
        TAGS.paywayRouting,
        [tlv("00", "PAYWAY@ABA"), tlv("01", paywayMerchantId), tlv("02", paywayTerminalId)].join("")
      ),
    ].join("")
  );

  const parts = [
    tlv(TAGS.payloadFormatIndicator, "01"),
    "010212",
    merchantAccountInfo,
    tlv(TAGS.merchantCategoryCode, "8999"),
    tlv(TAGS.transactionCurrency, CURRENCY_CODES[currency]),
    tlv(TAGS.transactionAmount, formatAmount(amount)),
    tlv(TAGS.countryCode, "KH"),
    tlv(TAGS.merchantName, merchantName),
    tlv(TAGS.merchantCity, merchantCity),
    additionalData,
  ];

  const partialPayload = parts.join("");
  const crc = crc16Ccitt(`${partialPayload}${TAGS.crc}04`);
  return `${partialPayload}${TAGS.crc}04${crc}`;
}

export async function createKhqr(input: KhqrInput): Promise<KhqrResult> {
  const payload = buildKhqrPayload(input);
  const md5 = crypto.createHash("md5").update(payload).digest("hex");
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
  });

  return {
    payload,
    md5,
    qrDataUrl,
  };
}
