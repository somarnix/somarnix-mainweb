export type SupportFaqRecord = {
  id: number;
  questionEn: string;
  questionKm: string;
  answerEn: string;
  answerKm: string;
  videoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function normalizeSupportFaqRecord(input: Partial<SupportFaqRecord> & { id: number }): SupportFaqRecord {
  return {
    id: Number(input.id) || 0,
    questionEn: typeof input.questionEn === "string" ? input.questionEn.trim() : "",
    questionKm: typeof input.questionKm === "string" ? input.questionKm.trim() : "",
    answerEn: typeof input.answerEn === "string" ? input.answerEn.trim() : "",
    answerKm: typeof input.answerKm === "string" ? input.answerKm.trim() : "",
    videoUrl:
      typeof input.videoUrl === "string" && input.videoUrl.trim().length > 0
        ? input.videoUrl.trim()
        : null,
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    isActive: Boolean(input.isActive),
    createdAt: typeof input.createdAt === "string" ? input.createdAt : null,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
  };
}

export function getSupportFaqQuestion(item: SupportFaqRecord, language: "en" | "km") {
  if (language === "km") {
    return item.questionKm || item.questionEn;
  }
  return item.questionEn || item.questionKm;
}

export function getSupportFaqAnswer(item: SupportFaqRecord, language: "en" | "km") {
  if (language === "km") {
    return item.answerKm || item.answerEn;
  }
  return item.answerEn || item.answerKm;
}

export function getSupportFaqSearchText(item: SupportFaqRecord) {
  return [
    item.questionEn,
    item.questionKm,
    item.answerEn,
    item.answerKm,
    item.videoUrl ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function getEmbedVideoUrl(rawUrl: string | null | undefined): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (url.pathname.startsWith("/embed/")) return trimmed;
    }

    if (host === "youtu.be") {
      const videoId = url.pathname.replace(/^\/+/, "");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (host.includes("vimeo.com")) {
      const videoId = url.pathname.split("/").filter(Boolean).pop();
      if (videoId) return `https://player.vimeo.com/video/${videoId}`;
    }

    return null;
  } catch {
    return null;
  }
}
