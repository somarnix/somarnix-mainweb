"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import QRCode from "qrcode";
import { Copy, Download, Link2, Send, Share2, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "../contexts/LanguageContext";
import { getSiteUrl, isLocalOrigin } from "../lib/siteUrl";

type ShareButtonProps = {
  path: string;
  title?: string | null;
  text?: string | null;
  imageUrl?: string | null;
  price?: string | number | null;
  comparePrice?: string | number | null;
  sellerName?: string | null;
  sellerLogoUrl?: string | null;
  stockBadge?: string | null;
  buyUrl?: string | null;
  contactUrl?: string | null;
  className?: string;
  iconClassName?: string;
  label?: string;
  stopPropagation?: boolean;
};

const SHARE_LOGO_URL = "/khqr-assets/somarnix-logo.png";

function buildBrowserAssetUrl(path: string) {
  if (typeof window === "undefined") return path;
  try {
    return new URL(path, window.location.origin).toString();
  } catch {
    return path;
  }
}

function buildPosterImageUrl(imageUrl: string | null | undefined) {
  const value = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    return buildBrowserAssetUrl(`/api/share-image?src=${encodeURIComponent(value)}`);
  }
  return buildBrowserAssetUrl(value);
}

function buildAbsoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  try {
    const preferredOrigin = getSiteUrl(window.location.origin);
    return new URL(path, preferredOrigin).toString();
  } catch {
    return path;
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawTelegramIcon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number
) {
  const radius = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#229ED9";
  ctx.fill();

  ctx.translate(centerX, centerY);
  ctx.rotate(-0.2);

  ctx.beginPath();
  ctx.moveTo(-radius * 0.34, -radius * 0.08);
  ctx.lineTo(radius * 0.34, -radius * 0.32);
  ctx.lineTo(radius * 0.04, radius * 0.34);
  ctx.lineTo(-radius * 0.02, radius * 0.09);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-radius * 0.02, radius * 0.09);
  ctx.lineTo(radius * 0.1, 0);
  ctx.lineTo(-radius * 0.18, -radius * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (words.length && lines.length === maxLines) {
    const lastIndex = lines.length - 1;
    const sourceText = lines[lastIndex] ?? "";
    let cropped = sourceText;
    while (cropped.length > 1 && ctx.measureText(`${cropped}...`).width > maxWidth) {
      cropped = cropped.slice(0, -1).trimEnd();
    }
    if (cropped !== sourceText) {
      lines[lastIndex] = `${cropped}...`;
    }
  }

  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = src;
  });
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}

function buildTelegramShareUrl(url: string, text: string) {
  const params = new URLSearchParams();
  params.set("url", url);
  if (text.trim()) {
    params.set("text", text.trim());
  }
  return `https://t.me/share/url?${params.toString()}`;
}

function shouldUseNativeShare() {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

async function buildPosterDataUrl({
  title,
  subtitle,
  pageUrl,
  qrDataUrl,
  imageUrl,
  logoUrl,
  price,
  comparePrice,
  sellerName,
  sellerLogoUrl,
  stockBadge,
  ctaLabel,
  pageDomainLabel,
}: {
  title: string;
  subtitle: string;
  pageUrl: string;
  qrDataUrl: string;
  imageUrl?: string | null;
  logoUrl: string;
  price?: string | null;
  comparePrice?: string | null;
  sellerName?: string | null;
  sellerLogoUrl?: string | null;
  stockBadge?: string | null;
  ctaLabel?: string | null;
  pageDomainLabel?: string | null;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 860;
  canvas.height = 860;
  const ctx = canvas.getContext("2d");
  if (!ctx) return qrDataUrl;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;
  drawRoundedRect(ctx, 12, 12, 836, 836, 34);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = "transparent";

  const imageTop = 28;
  const imageHeight = 430;
  const imageWidth = 760;
  const imageLeft = 50;
  const contentTop = imageTop + imageHeight + 22;
  const leftColumnX = 56;
  const leftColumnWidth = 432;
  const qrCardX = 590;
  const qrCardY = contentTop + 12;
  const qrCardSize = 190;
  const sellerDisplayName = sellerName?.trim() || "SOMARNIX";
  const subtitleText = subtitle.trim() || pageUrl;
  const siteDomain = pageDomainLabel || "SOMARNIX.COM";

  let drewImage = false;
  if (imageUrl) {
    try {
      const cover = await loadImage(imageUrl);
      ctx.save();
      drawRoundedRect(ctx, imageLeft, imageTop, imageWidth, imageHeight, 28);
      ctx.clip();
      ctx.drawImage(cover, imageLeft, imageTop, imageWidth, imageHeight);
      ctx.restore();
      drewImage = true;
    } catch {
      drewImage = false;
    }
  }

  if (!drewImage) {
    const gradient = ctx.createLinearGradient(
      imageLeft,
      imageTop,
      imageLeft + imageWidth,
      imageTop + imageHeight
    );
    gradient.addColorStop(0, "#dbeafe");
    gradient.addColorStop(1, "#ede9fe");
    ctx.save();
    drawRoundedRect(ctx, imageLeft, imageTop, imageWidth, imageHeight, 28);
    ctx.clip();
    ctx.fillStyle = gradient;
    ctx.fillRect(imageLeft, imageTop, imageWidth, imageHeight);
    ctx.restore();
    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 44px Arial";
    ctx.fillText("SOMARNIX", imageLeft + 26, imageTop + 62);
  }

  if (stockBadge) {
    drawRoundedRect(ctx, imageLeft + 20, imageTop + imageHeight - 68, 160, 40, 18);
    ctx.fillStyle =
      stockBadge.toLowerCase().includes("out") || stockBadge.toLowerCase().includes("sold")
        ? "rgba(239, 68, 68, 0.94)"
        : "rgba(5, 150, 105, 0.94)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";
    ctx.fillText(stockBadge, imageLeft + 40, imageTop + imageHeight - 40);
  }

  try {
    const sellerLogo = await loadImage(sellerLogoUrl || logoUrl);
    ctx.save();
    drawRoundedRect(ctx, leftColumnX, contentTop + 8, 46, 46, 14);
    ctx.clip();
    ctx.drawImage(sellerLogo, leftColumnX, contentTop + 8, 46, 46);
    ctx.restore();
  } catch {
    // keep poster generation working if logo file cannot load
  }

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px Arial";
  ctx.fillText("SELLER", leftColumnX + 62, contentTop + 26);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px Arial";
  const sellerLines = wrapText(ctx, sellerDisplayName, leftColumnWidth - 62, 2);
  sellerLines.forEach((line, index) => {
    ctx.fillText(line, leftColumnX + 62, contentTop + 48 + index * 21);
  });

  const titleTop = contentTop + 100;
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 28px Arial";
  const titleLines = wrapText(ctx, title, leftColumnWidth, 2);
  titleLines.forEach((line, index) => {
    ctx.fillText(line, leftColumnX, titleTop + index * 32);
  });

  const subtitleTop = titleTop + titleLines.length * 32 + 8;
  ctx.fillStyle = "#334155";
  ctx.font = "17px Arial";
  const subtitleLines = wrapText(ctx, subtitleText, leftColumnWidth, 2);
  subtitleLines.forEach((line, index) => {
    ctx.fillText(line, leftColumnX, subtitleTop + index * 23);
  });

  let priceBottomY = subtitleTop + subtitleLines.length * 23;
  if (price) {
    const priceTop = subtitleTop + subtitleLines.length * 23 + 16;
    if (comparePrice) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "17px Arial";
      ctx.fillText(comparePrice, leftColumnX, priceTop);
      const compareWidth = ctx.measureText(comparePrice).width;
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftColumnX, priceTop - 8);
      ctx.lineTo(leftColumnX + compareWidth, priceTop - 8);
      ctx.stroke();
    }

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 34px Arial";
    ctx.fillText(price, leftColumnX, priceTop + (comparePrice ? 34 : 0));
    priceBottomY = priceTop + (comparePrice ? 34 : 0);
  }

  const bottomRowY = Math.max(priceBottomY + 40, contentTop + 214);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px Arial";
  ctx.fillText("Contact Admin:", leftColumnX, bottomRowY + 28);
  drawTelegramIcon(ctx, leftColumnX + 186, bottomRowY + 18, 46);

  const buttonX = leftColumnX + 236;
  drawRoundedRect(ctx, buttonX, bottomRowY - 2, 204, 48, 22);
  const buttonGradient = ctx.createLinearGradient(
    buttonX,
    bottomRowY - 2,
    buttonX + 204,
    bottomRowY + 46
  );
  buttonGradient.addColorStop(0, "#84cc16");
  buttonGradient.addColorStop(1, "#22c55e");
  ctx.fillStyle = buttonGradient;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(ctaLabel || "Buy Now", buttonX + 102, bottomRowY + 29);
  ctx.textAlign = "left";

  const qrImage = await loadImage(qrDataUrl);
  drawRoundedRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, 26);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.drawImage(qrImage, qrCardX + 10, qrCardY + 10, 170, 170);

  try {
    const centeredLogo = await loadImage(logoUrl);
    drawRoundedRect(ctx, qrCardX + 80, qrCardY + 80, 30, 30, 9);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();
    ctx.drawImage(centeredLogo, qrCardX + 84, qrCardY + 84, 22, 22);
  } catch {
    // keep poster generation working if logo file cannot load
  }

  const qrCenterX = qrCardX + qrCardSize / 2;
  const siteRowY = qrCardY + qrCardSize + 26;
  ctx.font = "bold 15px Arial";
  const domainWidth = ctx.measureText(siteDomain).width;
  const siteRowStartX = qrCenterX - (domainWidth + 38) / 2;
  try {
    const footerLogo = await loadImage(logoUrl);
    ctx.save();
    drawRoundedRect(ctx, siteRowStartX, siteRowY - 14, 28, 28, 8);
    ctx.clip();
    ctx.drawImage(footerLogo, siteRowStartX, siteRowY - 14, 28, 28);
    ctx.restore();
  } catch {
    // keep poster generation working if logo file cannot load
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#2563eb";
  ctx.fillText(siteDomain, siteRowStartX + 38, siteRowY + 6);

  ctx.textAlign = "center";
  ctx.fillStyle = "#3b82f6";
  ctx.font = "13px Arial";
  const displayUrl = pageUrl.length > 38 ? `${pageUrl.slice(0, 35).trimEnd()}...` : pageUrl;
  ctx.fillText(displayUrl, qrCenterX, siteRowY + 34);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

export function ShareButton({
  path,
  title,
  text,
  imageUrl,
  price,
  comparePrice,
  sellerName,
  sellerLogoUrl,
  stockBadge,
  buyUrl,
  contactUrl,
  className,
  iconClassName,
  label,
  stopPropagation = true,
}: ShareButtonProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [posterDataUrl, setPosterDataUrl] = useState<string>("");
  const [buildingPoster, setBuildingPoster] = useState(false);
  const [mounted, setMounted] = useState(false);
  const preferredOrigin =
    typeof window !== "undefined" ? getSiteUrl(window.location.origin) : "";
  const richPreviewUnavailable = !preferredOrigin || isLocalOrigin(preferredOrigin);
  const url = useMemo(() => buildAbsoluteUrl(path), [path]);
  const posterImageUrl = useMemo(() => buildPosterImageUrl(imageUrl), [imageUrl]);
  const posterSellerLogoUrl = useMemo(
    () => buildPosterImageUrl(sellerLogoUrl) || buildBrowserAssetUrl(SHARE_LOGO_URL),
    [sellerLogoUrl]
  );
  const shareTitle = title?.trim() || "SOMARNIX";
  const shareText = text?.trim() || shareTitle;
  const sharePrice =
    price === null || price === undefined || price === ""
      ? null
      : typeof price === "number"
      ? `$${price.toFixed(2)}`
      : String(price);
  const shareComparePrice =
    comparePrice === null || comparePrice === undefined || comparePrice === ""
      ? null
      : typeof comparePrice === "number"
      ? `$${comparePrice.toFixed(2)}`
      : String(comparePrice);
  const shareCtaLabel = t("detail.buyNow") || "Buy Now";
  const fallbackTelegramUrl = (process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_URL || "").trim();
  const resolvedBuyUrl = useMemo(() => {
    const raw = (buyUrl || path).trim();
    if (!raw) return url;
    if (/^https?:\/\//i.test(raw)) return raw;
    return buildAbsoluteUrl(raw);
  }, [buyUrl, path, url]);
  const resolvedContactUrl = useMemo(() => {
    const raw = (contactUrl || fallbackTelegramUrl).trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("@")) return `https://t.me/${raw.slice(1)}`;
    return buildAbsoluteUrl(raw);
  }, [contactUrl, fallbackTelegramUrl]);
  const shareDomainLabel = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./i, "").toUpperCase();
    } catch {
      return "SOMARNIX.COM";
    }
  }, [url]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
        try {
          const qr = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            errorCorrectionLevel: "H",
          });
        if (cancelled) return;
        setQrDataUrl(qr);
        setBuildingPoster(true);
        const poster = await buildPosterDataUrl({
          title: shareTitle,
          subtitle: shareText,
          pageUrl: url,
          qrDataUrl: qr,
          imageUrl: posterImageUrl || null,
          logoUrl: buildBrowserAssetUrl(SHARE_LOGO_URL),
          price: sharePrice,
          comparePrice: shareComparePrice,
          sellerName,
          sellerLogoUrl: posterSellerLogoUrl,
          stockBadge,
          ctaLabel: shareCtaLabel,
          pageDomainLabel: shareDomainLabel,
        });
        if (!cancelled) {
          setPosterDataUrl(poster);
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl("");
          setPosterDataUrl("");
        }
      } finally {
        if (!cancelled) {
          setBuildingPoster(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    posterImageUrl,
    posterSellerLogoUrl,
    sellerName,
    shareCtaLabel,
    shareDomainLabel,
    shareComparePrice,
    sharePrice,
    shareText,
    shareTitle,
    stockBadge,
    url,
  ]);

  const handleNativeShare = async () => {
    const captionLines = [
      `Product Link: ${url}`,
      resolvedContactUrl ? `Contact Admin: ${resolvedContactUrl}` : "",
      resolvedBuyUrl ? `Buy Now: ${resolvedBuyUrl}` : "",
    ].filter(Boolean);
    const telegramShareText = [shareTitle, ...captionLines].filter(Boolean).join("\n");
    const posterFile = posterDataUrl
      ? dataUrlToFile(
          posterDataUrl,
          `${shareTitle.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "share-card"}.png`
        )
      : null;
    try {
      if (
        shouldUseNativeShare() &&
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        if (
          posterFile &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [posterFile] })
        ) {
          await navigator.share({
            title: shareTitle,
            text: captionLines.join("\n"),
            files: [posterFile],
          });
          return;
        }
        await navigator.share({
          title: shareTitle,
          text: `${shareText}\n${url}`,
          url,
        });
        return;
      }
      openExternalLink(buildTelegramShareUrl(url, telegramShareText));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("abort") || message.includes("canceled") || message.includes("cancelled")) {
        return;
      }
      openExternalLink(buildTelegramShareUrl(url, telegramShareText));
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share.linkCopied"));
      if (richPreviewUnavailable) {
        toast.message(t("share.previewNeedsPublicUrl"));
      }
    } catch {
      toast.error(t("share.failed"));
    }
  };

  const handleDownload = () => {
    const href = posterDataUrl || qrDataUrl;
    if (!href) {
      toast.error(t("share.failed"));
      return;
    }
    const link = document.createElement("a");
    link.href = href;
    link.download = `${shareTitle.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "share-card"}.png`;
    link.click();
  };

  const openExternalLink = (targetUrl: string) => {
    if (!targetUrl) return;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 pt-8 backdrop-blur-sm sm:items-center sm:pt-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="my-auto w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.35)] dark:bg-slate-900 max-h-[calc(100dvh-2rem)] overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{t("share.button")}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">QR share card</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="overflow-hidden rounded-[1.75rem] bg-slate-50 shadow-inner dark:bg-slate-950">
                  {posterDataUrl ? (
                    <img
                      src={posterDataUrl}
                      alt={`${shareTitle} QR share card`}
                      className="w-full"
                    />
                  ) : (
                    <div className="flex min-h-[24rem] items-center justify-center bg-gradient-to-br from-blue-50 to-violet-50 text-sm text-slate-500">
                      {buildingPoster ? "Preparing QR card..." : "Preparing preview..."}
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => openExternalLink(resolvedContactUrl)}
                    disabled={!resolvedContactUrl}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Contact Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => openExternalLink(resolvedBuyUrl)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {shareCtaLabel}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyLink()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  <Link2 className="h-4 w-4" />
                  <span className="truncate">{url}</span>
                </button>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Download className="mb-2 h-5 w-5" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Copy className="mb-2 h-5 w-5" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleNativeShare()}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Share2 className="mb-2 h-5 w-5" />
                    Share
                  </button>
                </div>

                {buildingPoster ? (
                  <div className="mt-3 text-center text-xs text-slate-500">Preparing QR card...</div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        aria-label={label ?? t("share.button")}
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
          setOpen(true);
        }}
        className={
          className ??
          "absolute right-14 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/92 text-slate-500 shadow-[0_12px_26px_rgba(15,23,42,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:text-blue-600"
        }
      >
        <Share2 className={iconClassName ?? "h-5 w-5"} />
        {label ? <span className="ml-2">{label}</span> : null}
      </button>
      {modal}
    </>
  );
}
