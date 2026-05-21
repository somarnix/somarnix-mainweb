import type { CmsEntry } from "@/lib/cms";
import { CmsPostExtras } from "./CmsPostExtras";
import { NewsPageChrome } from "@/app/components/news/NewsPageChrome";
import { YouTubeApiPlayer } from "@/app/components/public/YouTubeApiPlayer";
import { getVerticalVideoPreview } from "@/app/lib/video-embed";
import Link from "next/link";
import { Clock, TrendingUp, UserRound } from "lucide-react";
import type { ReactNode } from "react";

const CMS_FONT_FAMILIES: Record<string, string> = {
  Arial: "Arial, Helvetica, sans-serif",
  Impact: "Impact, Haettenschweiler, sans-serif",
  Lobster: "Lobster, cursive",
  "EB Garamond": '"EB Garamond", Georgia, serif',
  Caveat: "Caveat, cursive",
  Georgia: "Georgia, serif",
  "Comic Sans MS": '"Comic Sans MS", cursive',
  "Courier New": '"Courier New", monospace',
  "Noto Sans Khmer": '"Noto Sans Khmer", "Khmer OS Battambang", "Khmer OS", Arial, sans-serif',
  "Noto Serif Khmer": '"Noto Serif Khmer", "Khmer OS Muol Light", serif',
  Battambang: "Battambang, Khmer OS Battambang, Khmer OS, Arial, sans-serif",
  "Kantumruy Pro": '"Kantumruy Pro", Khmer OS, Arial, sans-serif',
  Hanuman: "Hanuman, Khmer OS, serif",
  Siemreap: "Siemreap, Khmer OS, Arial, sans-serif",
  Moul: "Moul, Khmer OS Muol Light, serif",
  Koulen: "Koulen, Khmer OS Muol Light, Arial, sans-serif",
  Bayon: "Bayon, Khmer OS Muol Light, Arial, sans-serif",
  Bokor: "Bokor, Khmer OS Muol Light, serif",
  Dangrek: "Dangrek, Khmer OS Muol Light, Arial, sans-serif",
  Khmer: "Noto Sans Khmer, Khmer OS Battambang, Khmer OS, Arial, sans-serif",
  Lexend: "Lexend, Arial, sans-serif",
  Lora: "Lora, Georgia, serif",
  Merriweather: "Merriweather, Georgia, serif",
  Montserrat: "Montserrat, Arial, sans-serif",
  Nunito: "Nunito, Arial, sans-serif",
  Oswald: "Oswald, Arial, sans-serif",
  Pacifico: "Pacifico, cursive",
  "Playfair Display": '"Playfair Display", Georgia, serif',
  Roboto: "Roboto, Arial, sans-serif",
  "Roboto Mono": '"Roboto Mono", monospace',
  "Roboto Serif": '"Roboto Serif", Georgia, serif',
  Comfortaa: "Comfortaa, Arial, sans-serif",
};

function findMatchingFontClose(value: string, start: number) {
  let depth = 1;
  let index = start;

  while (index < value.length) {
    const nextOpen = value.indexOf("[font=", index);
    const nextClose = value.indexOf("[/font]", index);

    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      index = nextOpen + "[font=".length;
      continue;
    }

    depth -= 1;
    if (depth === 0) return nextClose;
    index = nextClose + "[/font]".length;
  }

  return -1;
}

function renderInline(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let index = 0;
  let key = 0;

  while (index < content.length) {
    if (content.startsWith("[font=", index)) {
      const nameEnd = content.indexOf("]", index + 6);
      const close = nameEnd > -1 ? findMatchingFontClose(content, nameEnd + 1) : -1;
      if (nameEnd > -1 && close > -1) {
        const fontName = content.slice(index + 6, nameEnd).trim();
        const inner = content.slice(nameEnd + 1, close);
        const fontFamily = CMS_FONT_FAMILIES[fontName];
        if (fontFamily) {
          nodes.push(
            <span key={key} style={{ fontFamily }}>
              {renderInline(inner)}
            </span>
          );
        } else {
          nodes.push(...renderInline(inner));
        }
        key += 1;
        index = close + "[/font]".length;
        continue;
      }
    }

    if (content.startsWith("**", index)) {
      const close = content.indexOf("**", index + 2);
      if (close > -1) {
        nodes.push(
          <strong key={key} className="font-black text-slate-950 dark:text-white">
            {renderInline(content.slice(index + 2, close))}
          </strong>
        );
        key += 1;
        index = close + 2;
        continue;
      }
    }

    if (content[index] === "*") {
      const close = content.indexOf("*", index + 1);
      if (close > -1) {
        nodes.push(
          <em key={key} className="italic">
            {renderInline(content.slice(index + 1, close))}
          </em>
        );
        key += 1;
        index = close + 1;
        continue;
      }
    }

    const nextMarkers = [
      content.indexOf("[font=", index + 1),
      content.indexOf("**", index + 1),
      content.indexOf("*", index + 1),
    ].filter((next) => next > -1);
    const next = nextMarkers.length ? Math.min(...nextMarkers) : content.length;
    nodes.push(content.slice(index, next));
    index = next;
  }

  return nodes;
}

function renderParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
      const first = lines[0] ?? "";
      if (first.startsWith("# ")) {
        return (
          <section key={index} className="pt-3">
            <h2 className="text-2xl font-black leading-snug text-slate-950 dark:text-white">
              {renderInline(first.slice(2))}
            </h2>
            {lines.slice(1).map((line, lineIndex) => (
              <p key={lineIndex} className="mt-3 leading-7 text-slate-700 dark:text-slate-300">
                {renderInline(line)}
              </p>
            ))}
          </section>
        );
      }

      if (first.startsWith("## ")) {
        return (
          <section key={index} className="pt-2">
            <h2 className="text-xl font-bold leading-snug text-slate-950 dark:text-white">
              {renderInline(first.slice(3))}
            </h2>
            {lines.slice(1).map((line, lineIndex) => (
              <p key={lineIndex} className="mt-3 leading-7 text-slate-700 dark:text-slate-300">
                {renderInline(line)}
              </p>
            ))}
          </section>
        );
      }

      if (first.startsWith("### ")) {
        return (
          <section key={index}>
            <h3 className="text-lg font-bold leading-snug text-slate-950 dark:text-white">
              {renderInline(first.slice(4))}
            </h3>
            {lines.slice(1).map((line, lineIndex) => (
              <p key={lineIndex} className="mt-3 leading-7 text-slate-700 dark:text-slate-300">
                {renderInline(line)}
              </p>
            ))}
          </section>
        );
      }

      if (lines.every((line) => line.startsWith("- "))) {
        return (
          <ul key={index} className="list-disc space-y-2 pl-6 text-slate-700 dark:text-slate-300">
            {lines.map((line, lineIndex) => (
              <li key={lineIndex}>{renderInline(line.slice(2))}</li>
            ))}
          </ul>
        );
      }

      if (lines.every((line) => line.startsWith("> "))) {
        return (
          <blockquote
            key={index}
            className="border-l-4 border-red-600 bg-white px-5 py-4 text-lg font-semibold leading-7 text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-200"
          >
            {lines.map((line, lineIndex) => (
              <p key={lineIndex}>{renderInline(line.slice(2))}</p>
            ))}
          </blockquote>
        );
      }

      return (
        <p key={index} className="leading-7 text-slate-700 dark:text-slate-300">
          {renderInline(lines.join(" "))}
        </p>
      );
    });
}

function entryHref(entry: CmsEntry) {
  return `/news/${entry.slug}`;
}

function normalizeCopySuffix(value: string) {
  return value.replace(/(?:\s*\(Copy\))+$/gi, " (Copy)").trim();
}

function getAuthorDisplay(entry: CmsEntry) {
  if (entry.authorUsername) return `@${entry.authorUsername}`;
  if (entry.authorName) return entry.authorName;
  return "SOMARNIX Desk";
}

function getAuthorInitial(authorName: string) {
  return authorName.replace(/^@/, "").trim().slice(0, 1).toUpperCase() || "S";
}

function getAuthorProfileHref(entry: CmsEntry) {
  if (entry.authorUsername) return `/blog/${encodeURIComponent(entry.authorUsername)}`;
  if (entry.authorId) return `/blog/${entry.authorId}`;
  return null;
}

function estimateReadMinutes(entry: CmsEntry) {
  const words = `${entry.title} ${entry.excerpt ?? ""} ${entry.content}`
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function formatRelativeTime(value: string | null) {
  if (!value) return null;
  const publishedMs = new Date(value).getTime();
  if (!Number.isFinite(publishedMs)) return null;

  const diffSeconds = Math.max(0, Math.floor((Date.now() - publishedMs) / 1000));
  const units = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "min", seconds: 60 },
  ];

  for (const unit of units) {
    const count = Math.floor(diffSeconds / unit.seconds);
    if (count >= 1) {
      return `${count} ${unit.label}${count > 1 && unit.label !== "min" ? "s" : ""} ago`;
    }
  }

  return "just now";
}

function formatPublishedMeta(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  const date = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
  const relative = formatRelativeTime(value);
  return relative ? `${date} · ${relative}` : date;
}

function RelatedStory({ entry, number }: { entry: CmsEntry; number?: number }) {
  const title = normalizeCopySuffix(entry.title);
  const publishedMeta = formatPublishedMeta(entry.publishedAt);

  return (
    <Link
      href={entryHref(entry)}
      className="group flex gap-3 rounded px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-900"
    >
      {number ? (
        <span className="w-7 flex-shrink-0 text-3xl font-black leading-none text-slate-300 dark:text-slate-700">
          {number}
        </span>
      ) : entry.featuredImageUrl ? (
        <img
          src={entry.featuredImageUrl}
          alt={title}
          className="size-20 flex-shrink-0 rounded object-cover shadow-md"
        />
      ) : (
        <div className="size-20 flex-shrink-0 rounded bg-red-600" />
      )}
      <div className="min-w-0">
        <h4 className="line-clamp-3 text-sm font-bold leading-tight transition group-hover:text-red-600">
          {title}
        </h4>
        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
          {publishedMeta ?? (entry.contentType === "post" ? "Post" : "Page")}
        </p>
      </div>
    </Link>
  );
}

function RecommendationImage({
  entry,
  className,
}: {
  entry: CmsEntry;
  className: string;
}) {
  if (entry.featuredImageUrl) {
    const title = normalizeCopySuffix(entry.title);

    return (
      <img
        src={entry.featuredImageUrl}
        alt={title}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-[linear-gradient(135deg,#111827,#dc2626_52%,#f97316)] text-xs font-black uppercase tracking-[0.18em] text-white ${className}`}
    >
      SOMARNIX
    </div>
  );
}

function UpNextCard({ entry }: { entry: CmsEntry }) {
  const title = normalizeCopySuffix(entry.title);
  const publishedMeta = formatPublishedMeta(entry.publishedAt);

  return (
    <Link href={entryHref(entry)} className="group block">
      <RecommendationImage
        entry={entry}
        className="mb-4 aspect-[16/9] w-full rounded object-cover shadow-md transition group-hover:opacity-90"
      />
      <h3 className="line-clamp-3 text-xl font-bold leading-snug text-slate-950 transition group-hover:text-red-600 dark:text-white">
        {title}
      </h3>
      <p className="mt-3 text-sm font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {estimateReadMinutes(entry)} min read
      </p>
      {publishedMeta ? (
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {publishedMeta}
        </p>
      ) : null}
    </Link>
  );
}

function PopularStory({ entry, number }: { entry: CmsEntry; number: number }) {
  const title = normalizeCopySuffix(entry.title);
  const publishedMeta = formatPublishedMeta(entry.publishedAt);

  return (
    <Link
      href={entryHref(entry)}
      className="grid grid-cols-[32px_minmax(0,1fr)] gap-4 border-b border-slate-200 py-4 transition hover:text-red-600 dark:border-slate-800"
    >
      <span className="text-2xl font-black leading-none text-slate-950 dark:text-white">
        {number}
      </span>
      <div className="min-w-0">
        <h3 className="line-clamp-3 text-lg font-semibold leading-snug">
          {title}
        </h3>
        {publishedMeta ? (
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {publishedMeta}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function ArticleRecommendations({ entries }: { entries: CmsEntry[] }) {
  const upNext = entries.slice(0, 9);
  const popular = entries.slice(0, 8);

  if (entries.length === 0) return null;

  return (
    <section className="mx-auto mt-10 max-w-7xl border-t border-slate-200 px-4 py-10 dark:border-slate-800 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)]">
        <div>
          <h2 className="mb-6 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Up next
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {upNext.map((item) => (
              <UpNextCard key={`up-next-${item.id}`} entry={item} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-6 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Most popular
          </h2>
          <div className="border-t border-slate-200 dark:border-slate-800">
            {popular.map((item, index) => (
              <PopularStory
                key={`popular-${item.id}-${index}`}
                entry={item}
                number={index + 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Advertisement({
  label = "Advertisement",
  size = "banner",
}: {
  label?: string;
  size?: "banner" | "rectangle" | "leaderboard";
}) {
  const heightClass =
    size === "rectangle" ? "h-64" : size === "leaderboard" ? "h-28" : "h-24";

  return (
    <div
      className={`${heightClass} flex items-center justify-center rounded border border-dashed border-slate-300 bg-white text-center text-xs font-black uppercase tracking-[0.22em] text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500`}
    >
      {label}
    </div>
  );
}

export function CmsContentView({
  entry,
  relatedEntries = [],
}: {
  entry: CmsEntry;
  relatedEntries?: CmsEntry[];
}) {
  const eyebrow = entry.contentType === "short" ? "Shorts" : entry.contentType === "post" ? "News" : "CMS Story";
  const displayTitle = normalizeCopySuffix(entry.title);
  const authorDisplay = getAuthorDisplay(entry);
  const authorProfileHref = getAuthorProfileHref(entry);
  const shortPreview = entry.contentType === "short" ? getVerticalVideoPreview(entry.videoUrl, 420) : null;
  const date = entry.publishedAt
    ? new Intl.DateTimeFormat("en", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(entry.publishedAt))
    : null;
  const related = relatedEntries.filter((item) => item.id !== entry.id).slice(0, 6);
  const recommendations = relatedEntries.filter((item) => item.id !== entry.id).slice(0, 12);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <NewsPageChrome advertisementLabel="Top Advertisement" showNavigationLinks={false} />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <article className="min-w-0">
          <Link
            href="/news"
            className="mt-6 inline-block bg-red-600 px-3 py-1 text-xs font-black uppercase text-white shadow-md transition hover:bg-red-700"
          >
            {eyebrow}
          </Link>

          <h1 className="mt-4 max-w-5xl text-3xl font-black leading-snug tracking-tight sm:text-4xl lg:text-[2.75rem]">
            {displayTitle}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-b-2 border-slate-300 pb-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            <Link
              href={authorProfileHref ?? "#"}
              aria-disabled={!authorProfileHref}
              className={`flex items-center gap-2 ${
                authorProfileHref
                  ? "rounded-full transition hover:text-red-600"
                  : "pointer-events-none"
              }`}
            >
              {entry.authorAvatarUrl ? (
                <img
                  src={entry.authorAvatarUrl}
                  alt={authorDisplay}
                  className="size-9 rounded-full object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
                />
              ) : (
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white shadow-sm dark:bg-white dark:text-slate-950">
                  {entry.authorId ? getAuthorInitial(authorDisplay) : <UserRound className="size-4" />}
                </span>
              )}
              <span>
                By <span className="font-bold text-slate-800 dark:text-slate-200">{authorDisplay}</span>
              </span>
            </Link>
            <span>-</span>
            {date ? (
              <span className="flex items-center gap-1">
                <Clock className="size-4" />
                {date}
              </span>
            ) : null}
          </div>

          {entry.excerpt ? (
            <p className="mt-6 text-lg font-serif leading-8 text-slate-800 dark:text-slate-200">
              {entry.excerpt}
            </p>
          ) : null}

          {entry.contentType === "short" ? (
            shortPreview?.provider === "youtube" ? (
            <YouTubeApiPlayer
              videoUrl={entry.videoUrl}
              title={displayTitle}
              className="my-8 aspect-[9/16] max-w-sm rounded-xl shadow-xl"
            />
            ) : shortPreview?.embedUrl ? (
            <div className="my-8 max-w-sm overflow-hidden rounded-xl bg-black shadow-xl">
              <iframe
                src={shortPreview.embedUrl}
                title={displayTitle}
                className="aspect-[9/16] w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            ) : (
              <div className="my-8 max-w-sm rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                This short needs a supported YouTube, Facebook, or TikTok video link.
              </div>
            )
          ) : entry.featuredImageUrl ? (
            <img
              src={entry.featuredImageUrl}
              alt={displayTitle}
              className="my-8 h-96 w-full rounded object-cover shadow-xl lg:h-[500px]"
            />
          ) : null}

          <Advertisement label="In Article Advertisement" size="leaderboard" />

          <div
            className="space-y-5 text-base leading-7 text-slate-800 dark:text-slate-200 sm:text-lg"
            style={{ fontFamily: 'Arial, "Noto Sans Khmer", "Khmer OS Battambang", sans-serif' }}
          >
            {renderParagraphs(entry.content)}
          </div>

          <div className="my-8">
            <Advertisement label="Mid Article Advertisement" />
          </div>

          <CmsPostExtras
            postId={entry.id}
            title={displayTitle}
            excerpt={entry.excerpt}
          />
        </article>

        <aside className="space-y-6">
          <section className="border-2 border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2 border-b-2 border-red-600 pb-3">
              <TrendingUp className="size-5 text-red-600" />
              <h2 className="text-lg font-black uppercase">Trending Now</h2>
            </div>
            <div className="space-y-2">
              {(related.length > 0 ? related : [entry]).slice(0, 5).map((item, index) => (
                <RelatedStory key={`${item.id}-trend-${index}`} entry={item} number={index + 1} />
              ))}
            </div>
          </section>

          <Advertisement label="Sidebar Advertisement" size="rectangle" />

          <section className="border-2 border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 border-b-2 border-slate-300 pb-3 text-lg font-black uppercase dark:border-slate-700">
              More News
            </h2>
            <div className="space-y-3">
              {(related.length > 0 ? related : [entry]).slice(0, 4).map((item, index) => (
                <RelatedStory key={`${item.id}-more-${index}`} entry={item} />
              ))}
            </div>
          </section>

          <Advertisement label="More News Advertisement" size="rectangle" />
        </aside>
      </div>

      <ArticleRecommendations entries={recommendations} />
    </main>
  );
}
