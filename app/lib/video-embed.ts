export function normalizeExternalVideoUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function cleanYouTubeId(value: string | null | undefined) {
  const id = String(value ?? "").trim().split(/[?&#/]/)[0];
  return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : "";
}

function getYouTubeId(url: URL) {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") return cleanYouTubeId(parts[0]);
  if (!host.includes("youtube.com")) return "";

  return (
    cleanYouTubeId(url.searchParams.get("v")) ||
    cleanYouTubeId(parts[0] === "shorts" ? parts[1] : "") ||
    cleanYouTubeId(parts[0] === "embed" ? parts[1] : "") ||
    cleanYouTubeId(parts[0] === "live" ? parts[1] : "") ||
    cleanYouTubeId(parts[0] === "v" ? parts[1] : "")
  );
}

export function getYouTubeVideoId(value: string | null | undefined) {
  const raw = normalizeExternalVideoUrl(String(value ?? ""));
  if (!raw) return "";

  try {
    return getYouTubeId(new URL(raw));
  } catch {
    return "";
  }
}

function getYouTubeEmbedUrl(youtubeId: string) {
  const embedUrl = new URL(`https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}`);
  embedUrl.searchParams.set("playsinline", "1");
  embedUrl.searchParams.set("rel", "0");
  if (typeof window !== "undefined" && window.location.origin) {
    embedUrl.searchParams.set("origin", window.location.origin);
  }
  return embedUrl.toString();
}

export type VerticalVideoPreview = {
  provider: "youtube" | "facebook" | "tiktok";
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string;
};

export function getVerticalVideoPreview(value: string | null | undefined, facebookWidth = 360): VerticalVideoPreview | null {
  const raw = normalizeExternalVideoUrl(String(value ?? ""));
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const youtubeId = getYouTubeId(url);

    if (youtubeId) {
      return {
        provider: "youtube",
        embedUrl: getYouTubeEmbedUrl(youtubeId),
        watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`,
      };
    }
    if (host.includes("facebook.com") || host.includes("fb.watch")) {
      return {
        provider: "facebook",
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&width=${facebookWidth}`,
        watchUrl: raw,
        thumbnailUrl: "",
      };
    }
    if (host.includes("tiktok.com")) {
      const videoId = url.pathname.match(/\/video\/(\d+)/)?.[1];
      return videoId
        ? {
            provider: "tiktok",
            embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
            watchUrl: raw,
            thumbnailUrl: "",
          }
        : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function getVerticalVideoEmbedUrl(value: string | null | undefined, facebookWidth = 360) {
  return getVerticalVideoPreview(value, facebookWidth)?.embedUrl ?? "";
}
