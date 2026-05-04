import { readFile } from "fs/promises";
import path from "path";

import QRCode from "qrcode";
import type { Browser, Page } from "puppeteer";

import type { KhqrCurrency } from "@/lib/khqr";

type StyleAssetName =
  | "aba-pay-logo.png"
  | "usd.png"
  | "khr.png"
  | "khqr.png"
  | "somarnix-logo.png";

type StyledKhqrInput = {
  payload: string;
  merchantName: string;
  amount: number | string | null | undefined;
  currency: KhqrCurrency;
};

const assetCache = new Map<StyleAssetName, Promise<string | null>>();
const styledSvgCache = new Map<string, Promise<string>>();
const styledTelegramPngCache = new Map<string, Promise<string | null>>();
let styledKhqrBrowserPromise: Promise<Browser | null> | null = null;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function loadAssetDataUri(fileName: StyleAssetName): Promise<string | null> {
  const existing = assetCache.get(fileName);
  if (existing) return existing;

  const promise = readFile(path.join(process.cwd(), "public", "khqr-assets", fileName))
    .then((buffer) => `data:image/png;base64,${buffer.toString("base64")}`)
    .catch(() => null);

  assetCache.set(fileName, promise);
  return promise;
}

function parseAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(amount: number, currency: KhqrCurrency): string {
  if (currency === "USD") {
    const parts = amount.toFixed(2).split(".");
    const grouped = Number(parts[0]).toLocaleString("en-US").replace(/,/g, ".");
    return `${grouped},${parts[1]}`;
  }

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function estimateAmountWidth(amountText: string): number {
  return Math.max(80, Math.round(amountText.length * 13.2));
}

function buildStyledKhqrCacheKey(input: StyledKhqrInput): string {
  return JSON.stringify({
    payload: input.payload,
    merchantName: input.merchantName,
    amount: input.amount ?? "",
    currency: input.currency,
  });
}

async function buildStyledKhqrSvg(input: StyledKhqrInput): Promise<string> {
  const amount = parseAmount(input.amount);
  const [abaPayLogo, usdIcon, khrIcon, khqrIcon, customLogo] = await Promise.all([
    loadAssetDataUri("aba-pay-logo.png"),
    loadAssetDataUri("usd.png"),
    loadAssetDataUri("khr.png"),
    loadAssetDataUri("khqr.png"),
    loadAssetDataUri("somarnix-logo.png"),
  ]);

  const qrDataUrl = await QRCode.toDataURL(input.payload, {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 280,
  });

  const merchantName = escapeXml((input.merchantName || "Unknown").trim() || "Unknown");
  const amountText = escapeXml(formatAmount(amount, input.currency));
  const currencyText = escapeXml(input.currency);
  const amountWidth = estimateAmountWidth(amountText);
  const currencyX = 30 + amountWidth + 5;
  const currencyWidth = input.currency === "USD" ? 28 : 30;
  const amountBadgeIcon = customLogo || (input.currency === "USD" ? usdIcon : khrIcon) || khqrIcon;
  const centerIcon =
    amount > 0
      ? customLogo || (input.currency === "USD" ? usdIcon : khrIcon) || khqrIcon
      : khqrIcon || customLogo || (input.currency === "USD" ? usdIcon : khrIcon);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
  <defs>
    <clipPath id="card-radius">
      <rect x="0" y="0" width="300" height="450" rx="15" ry="15" />
    </clipPath>
  </defs>
  <g clip-path="url(#card-radius)">
    <rect x="0" y="0" width="300" height="450" fill="#ffffff" />
    <rect x="0" y="0" width="300" height="60" fill="#cc0000" />
    <polygon points="210,0 300,0 300,90" fill="#cc0000" />
    ${abaPayLogo ? `<image href="${abaPayLogo}" x="105" y="19" width="90" height="22" preserveAspectRatio="xMidYMid meet" />` : ""}
    <text x="32" y="104" fill="#111111" font-size="18" font-family="Arial, Helvetica, sans-serif">${merchantName}</text>
    <text x="30" y="134" fill="#111111" font-size="22" font-weight="700" font-family="Arial, Helvetica, sans-serif">${amountText}</text>
    <text x="${currencyX}" y="135" fill="#111111" font-size="14" font-family="Arial, Helvetica, sans-serif">${currencyText}</text>
    ${amountBadgeIcon ? `<image href="${amountBadgeIcon}" x="${currencyX + currencyWidth + 6}" y="108" width="24" height="24" preserveAspectRatio="xMidYMid meet" />` : ""}
    <line x1="0" y1="150" x2="300" y2="150" stroke="#8f8f8f" stroke-width="1" stroke-dasharray="2 4" />
    <image href="${qrDataUrl}" x="10" y="160" width="280" height="280" preserveAspectRatio="xMidYMid meet" />
    <circle cx="150" cy="300" r="23" fill="#ffffff" stroke="#d0d5dd" stroke-width="2" />
    ${centerIcon ? `<image href="${centerIcon}" x="132" y="282" width="36" height="36" preserveAspectRatio="xMidYMid meet" />` : ""}
  </g>
</svg>`;
}

function toSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

async function getStyledKhqrBrowser(): Promise<Browser | null> {
  if (styledKhqrBrowserPromise) return styledKhqrBrowserPromise;

  styledKhqrBrowserPromise = (async () => {
    try {
      const puppeteer = await import("puppeteer");
      return await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    } catch (error) {
      console.error("Styled KHQR browser launch failed:", error);
      return null;
    }
  })();

  return styledKhqrBrowserPromise;
}

async function rasterizeSvgDataUrlToPngDataUrl(svgDataUrl: string): Promise<string | null> {
  const browser = await getStyledKhqrBrowser();
  if (!browser) return null;

  const page: Page = await browser.newPage();
  try {
    await page.setViewport({
      width: 300,
      height: 450,
      deviceScaleFactor: 2,
    });
    await page.goto(svgDataUrl, { waitUntil: "networkidle0" });
    const pngBytes = await page.screenshot({ type: "png" });
    return `data:image/png;base64,${Buffer.from(pngBytes).toString("base64")}`;
  } catch (error) {
    console.error("Styled KHQR PNG render failed:", error);
    return null;
  } finally {
    await page.close().catch(() => undefined);
  }
}

export async function createStyledKhqrDataUrl(input: StyledKhqrInput): Promise<string> {
  const cacheKey = buildStyledKhqrCacheKey(input);
  const existing = styledSvgCache.get(cacheKey);
  if (existing) return existing;

  const promise = buildStyledKhqrSvg(input).then((svg) => toSvgDataUrl(svg));
  styledSvgCache.set(cacheKey, promise);
  return promise;
}

export async function createStyledKhqrTelegramDataUrl(
  input: StyledKhqrInput
): Promise<string | null> {
  const cacheKey = buildStyledKhqrCacheKey(input);
  const existing = styledTelegramPngCache.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    const svgDataUrl = await createStyledKhqrDataUrl(input);
    return rasterizeSvgDataUrlToPngDataUrl(svgDataUrl);
  })();
  styledTelegramPngCache.set(cacheKey, promise);
  return promise;
}
