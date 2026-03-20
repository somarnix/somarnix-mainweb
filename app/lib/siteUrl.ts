function normalizeUrl(raw: string) {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function getSiteUrl(fallbackOrigin?: string) {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    fallbackOrigin ||
    "http://localhost:3000";

  return normalizeUrl(raw);
}

export function getGoogleRedirectUrl(fallbackOrigin?: string) {
  const explicit = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URL;
  if (explicit) {
    return normalizeUrl(explicit);
  }

  return `${getSiteUrl(fallbackOrigin)}/api/auth/google`;
}

export function isLocalOrigin(origin?: string | null) {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    );
  } catch {
    return false;
  }
}
