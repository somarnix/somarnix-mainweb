"use client";

import { cn } from "./ui/utils";

export const DEFAULT_PROFILE_COVERS = [
  "/cover-profile/cover-1.jpg",
  "/cover-profile/cover-2.jpg",
  "/cover-profile/cover-3.jpg",
  "/cover-profile/cover-4.jpg",
  "/cover-profile/cover-5.jpg",
  "/cover-profile/cover-6.jpg",
  "/cover-profile/cover-7.jpg",
  "/cover-profile/cover-8.jpg",
  "/cover-profile/cover-9.jpg",
  "/cover-profile/cover-10.jpeg",
] as const;

export function getDefaultProfileCover(seed?: number | null) {
  const safeSeed = Number.isFinite(Number(seed)) ? Math.abs(Number(seed)) : 1;
  return DEFAULT_PROFILE_COVERS[safeSeed % DEFAULT_PROFILE_COVERS.length] ?? DEFAULT_PROFILE_COVERS[0];
}

type ProfileCoverArtProps = {
  src?: string | null;
  alt: string;
  positionX?: number | null;
  positionY?: number | null;
  scale?: number | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ProfileCoverArt({
  src,
  alt,
  positionX = 50,
  positionY = 50,
  scale = 1,
  className,
  imageClassName,
  fallbackClassName,
}: ProfileCoverArtProps) {
  const normalizedX = clamp(Number(positionX ?? 50), 0, 100);
  const normalizedY = clamp(Number(positionY ?? 50), 0, 100);
  const normalizedScale = clamp(Number(scale ?? 1), 1, 3);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={cn(
            "absolute inset-0 h-full w-full select-none object-cover",
            imageClassName
          )}
          style={{
            objectPosition: `${normalizedX}% ${normalizedY}%`,
            transform: `scale(${normalizedScale})`,
            transformOrigin: "center center",
          }}
        />
      ) : (
        <div
          aria-label={alt}
          className={cn(
            "absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600",
            fallbackClassName
          )}
        />
      )}
    </div>
  );
}
