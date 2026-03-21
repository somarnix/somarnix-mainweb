"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "../contexts/LanguageContext";
import { getSiteUrl, isLocalOrigin } from "../lib/siteUrl";

type ShareButtonProps = {
  path: string;
  title?: string | null;
  text?: string | null;
  className?: string;
  iconClassName?: string;
  label?: string;
  stopPropagation?: boolean;
};

function buildAbsoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  try {
    const preferredOrigin = getSiteUrl(window.location.origin);
    return new URL(path, preferredOrigin).toString();
  } catch {
    return path;
  }
}

export function ShareButton({
  path,
  title,
  text,
  className,
  iconClassName,
  label,
  stopPropagation = true,
}: ShareButtonProps) {
  const { t } = useLanguage();
  const preferredOrigin =
    typeof window !== "undefined" ? getSiteUrl(window.location.origin) : "";
  const richPreviewUnavailable = !preferredOrigin || isLocalOrigin(preferredOrigin);

  return (
    <button
      type="button"
      aria-label={label ?? t("share.button")}
      onClick={async (event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }

        const url = buildAbsoluteUrl(path);
        const payload = {
          url,
        };

        try {
          if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
            await navigator.share(payload);
            return;
          }

          if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            toast.success(t("share.linkCopied"));
            if (richPreviewUnavailable) {
              toast.message(t("share.previewNeedsPublicUrl"));
            }
            return;
          }

          throw new Error("Clipboard unavailable");
        } catch (error) {
          const message = error instanceof Error ? error.message.toLowerCase() : "";
          if (message.includes("abort") || message.includes("canceled") || message.includes("cancelled")) {
            return;
          }
          if (richPreviewUnavailable) {
            toast.message(t("share.previewNeedsPublicUrl"));
          }
          toast.error(t("share.failed"));
        }
      }}
      className={
        className ??
        "absolute right-14 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/92 text-slate-500 shadow-[0_12px_26px_rgba(15,23,42,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:text-blue-600"
      }
    >
      <Share2 className={iconClassName ?? "h-5 w-5"} />
      {label ? <span className="ml-2">{label}</span> : null}
    </button>
  );
}
