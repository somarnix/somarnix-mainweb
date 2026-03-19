"use client";

import { getAvatarBorderFit } from "../lib/avatar-borders";
import { cn } from "./ui/utils";

type ProfileAvatarProps = {
  src?: string | null;
  alt: string;
  fallback?: string | null;
  borderUrl?: string | null;
  className?: string;
  insetClassName?: string;
  contentClassName?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  borderClassName?: string;
};

function getFallbackText(value?: string | null) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "U";
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

export function ProfileAvatar({
  src,
  alt,
  fallback,
  borderUrl,
  className,
  insetClassName,
  contentClassName,
  imageClassName,
  fallbackClassName,
  borderClassName,
}: ProfileAvatarProps) {
  const hasBorder = typeof borderUrl === "string" && borderUrl.trim().length > 0;
  const borderFit = getAvatarBorderFit(borderUrl);
  const contentInsetClass = hasBorder
    ? cn("absolute", borderFit?.insetClassName ?? "inset-[13%]", insetClassName)
    : "absolute inset-0";
  const contentShapeClass = hasBorder
    ? borderFit?.contentShapeClassName ?? "rounded-full"
    : "rounded-full";
  const fallbackText = getFallbackText(fallback ?? alt);

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          contentInsetClass,
          "overflow-hidden",
          contentShapeClass,
          borderFit?.contentClassName,
          contentClassName
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className={cn("h-full w-full object-cover", borderFit?.imageClassName, imageClassName)}
          />
        ) : (
          <div
            aria-label={alt}
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold",
              contentShapeClass,
              fallbackClassName
            )}
          >
            {fallbackText}
          </div>
        )}
      </div>

      {hasBorder ? (
        <img
          src={borderUrl}
          alt=""
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.18)]",
            borderFit?.borderClassName,
            borderClassName
          )}
        />
      ) : null}
    </div>
  );
}
