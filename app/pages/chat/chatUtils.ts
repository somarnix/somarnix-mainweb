import type { PresenceInfo } from "./chatTypes";

export const QUICK_EMOJI = ["😀", "😂", "😍", "😎", "🙏", "👍", "🔥", "🎉"];

export function formatRelative(date: string | null, lang: "en" | "km") {
  if (!date) return lang === "km" ? "មិនទាន់មាន" : "No messages";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleString(lang === "km" ? "km-KH" : undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizePresence(
  source?: { status?: string | null; lastActiveAt?: string | null },
  fallbackStatus?: string | null,
  fallbackLastActive?: string | null
): PresenceInfo | undefined {
  const status = source?.status ?? fallbackStatus ?? null;
  const rawLastActive = source?.lastActiveAt ?? fallbackLastActive ?? null;
  const lastActive = rawLastActive;
  if (!status && !lastActive) {
    return undefined;
  }
  return {
    status,
    lastActiveAt: lastActive,
  };
}
