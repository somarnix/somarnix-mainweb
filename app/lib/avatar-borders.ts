export const AVATAR_BORDER_URLS = Array.from(
  { length: 15 },
  (_, index) => `/border/${index + 1}.svg`
);

type AvatarBorderFit = {
  insetClassName: string;
  borderClassName?: string;
  contentClassName?: string;
  contentShapeClassName?: string;
  imageClassName?: string;
};

const DEFAULT_BORDER_FIT: AvatarBorderFit = {
  insetClassName: "inset-[13%]",
  contentShapeClassName: "rounded-full",
};

const SQUARE_BORDER_FIT: AvatarBorderFit = {
  insetClassName: "inset-[12.5%]",
  borderClassName: "scale-[1.02]",
  contentShapeClassName: "rounded-full",
};

const ORNATE_BORDER_FIT: AvatarBorderFit = {
  insetClassName: "left-[14%] right-[14%] top-[11%] bottom-[18%]",
  borderClassName: "scale-[1.1] translate-x-[-2%] translate-y-[11%]",
  contentShapeClassName: "rounded-[34%]",
  imageClassName: "scale-[0.94] object-[center_20%]",
};

export function normalizeAvatarBorderUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return AVATAR_BORDER_URLS.includes(trimmed) ? trimmed : null;
}

export function getAvatarBorderFit(value: unknown): AvatarBorderFit | null {
  const normalized = normalizeAvatarBorderUrl(value);

  if (!normalized) {
    return null;
  }

  const borderId = Number(normalized.match(/\/(\d+)\.svg$/)?.[1] ?? 0);

  if (borderId === 1) {
    return SQUARE_BORDER_FIT;
  }

  if (borderId >= 2) {
    return ORNATE_BORDER_FIT;
  }

  return DEFAULT_BORDER_FIT;
}
