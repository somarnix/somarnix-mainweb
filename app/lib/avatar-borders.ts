export const AVATAR_BORDER_URLS = Array.from(
  { length: 15 },
  (_, index) => `/border/${index + 1}.svg`
);

export function normalizeAvatarBorderUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return AVATAR_BORDER_URLS.includes(trimmed) ? trimmed : null;
}
