"use client";

import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Facebook,
  Flame,
  Globe,
  Home,
  Menu,
  Moon,
  Newspaper,
  Play,
  Send,
  Share2,
  Sun,
  TrendingUp,
  Youtube,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import { LanguageSelect } from "@/app/components/LanguageSelect";
import { NewsAccountControls } from "@/app/components/news/NewsAccountControls";
import { YouTubeApiPlayer } from "@/app/components/public/YouTubeApiPlayer";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { Pagination } from "@/app/components/Pagination";
import { getVerticalVideoPreview } from "@/app/lib/video-embed";
import type { CmsEntry } from "@/lib/cms";

type NewsView = "home" | "news" | "shorts";

function useIsPhoneViewport() {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsPhone(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isPhone;
}

function formatDate(value: string | null) {
  if (!value) return "Today";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Today";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function getEntryHref(entry: CmsEntry) {
  return `/news/${entry.slug}`;
}

function getShareUrl(entry: CmsEntry) {
  const href = getEntryHref(entry);
  if (typeof window === "undefined") return href;
  return new URL(href, window.location.origin).toString();
}

function getImage(entry: CmsEntry | undefined) {
  return entry?.featuredImageUrl || "";
}

function isFutureEntry(entry: CmsEntry) {
  if (!entry.publishedAt) return false;
  const time = new Date(entry.publishedAt).getTime();
  return Number.isFinite(time) && time > Date.now();
}

function categoryLabel(entry: CmsEntry, fallback = "News") {
  if (entry.contentType === "short") return "Short";
  if (entry.contentType === "post") return "Post";
  return fallback;
}

function ShortMedia({ entry, className }: { entry: CmsEntry; className: string }) {
  const preview = getVerticalVideoPreview(entry.videoUrl);

  if (preview?.provider === "youtube") {
    return (
      <YouTubeApiPlayer videoUrl={entry.videoUrl} title={entry.title} className={className} />
    );
  }

  if (preview?.embedUrl) {
    return (
      <iframe
        src={preview.embedUrl}
        title={entry.title}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <div className={`flex items-center justify-center bg-slate-950 px-4 text-center text-xs font-black uppercase tracking-[0.16em] text-white ${className}`}>
      Video link required
    </div>
  );
}

function NewsImage({
  entry,
  className,
}: {
  entry: CmsEntry;
  className: string;
}) {
  const imageUrl = getImage(entry);

  if (!imageUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-[linear-gradient(135deg,#111827,#dc2626_52%,#f97316)] text-xs font-black uppercase tracking-[0.18em] text-white ${className}`}
      >
        SOMARNIX
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={entry.title}
      className={`object-cover ${className}`}
    />
  );
}

function SectionHeading({
  title,
  icon,
}: {
  title: string;
  icon?: "flame" | "trend" | "play";
}) {
  const Icon = icon === "flame" ? Flame : icon === "trend" ? TrendingUp : icon === "play" ? Play : null;

  return (
    <div className="mb-3 flex items-center gap-2 border-b-4 border-red-600 pb-2">
      {Icon ? <Icon className="size-5 text-red-600" /> : null}
      <h2 className="text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
        {title}
      </h2>
    </div>
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

function NewsUtilityBar() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("edugroit-theme") === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("edugroit-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.dispatchEvent(new Event("edugroit-theme-change"));
  };

  return (
    <div className="border-y border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 text-slate-700 dark:text-slate-300 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5 text-sm font-semibold">
          <div className="inline-flex items-center gap-2" data-no-auto-translate>
            <Globe className="size-4" />
            <LanguageSelect buttonClassName="bg-transparent p-0 text-sm" />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <div className="flex items-center gap-5">
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="transition hover:text-red-600"
          >
            <Youtube className="size-5" />
          </a>
          <a
            href="https://www.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="transition hover:text-blue-600"
          >
            <Facebook className="size-5" />
          </a>
          <a
            href="https://t.me/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
            className="transition hover:text-sky-500"
          >
            <Send className="size-5" />
          </a>
          <a
            href="https://www.tiktok.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="transition hover:text-slate-950 dark:hover:text-white"
          >
            <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function NewsMenuBar({
  activeView,
  onViewChange,
}: {
  activeView: NewsView;
  onViewChange: (view: NewsView) => void;
}) {
  const { t } = useLanguage();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categories: Array<{ label: string; href: string }> = [];
  const buttonClass = (view: NewsView) =>
    `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-black uppercase tracking-tight transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-900 sm:px-4 ${
      activeView === view
        ? "bg-slate-100 text-red-600 dark:bg-slate-900 dark:text-red-500"
        : "text-slate-900 dark:text-white"
    }`;

  return (
    <nav className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-2 sm:px-6 lg:min-h-14 lg:flex-row lg:items-center lg:gap-2 lg:px-8">
        <div className="flex min-h-9 shrink-0 items-center gap-1.5 lg:mr-3">
          <span className="text-xl font-black leading-none text-red-600 lg:text-lg">SM</span>
          <span className="whitespace-nowrap text-base font-black uppercase tracking-tight text-slate-950 dark:text-white lg:text-sm">
            Somarnix News
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 lg:flex-1">
          <div className="grid flex-1 grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1.5 sm:flex sm:flex-none sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setCategoryOpen((open) => !open)}
                aria-label={t("news.categories")}
                aria-expanded={categoryOpen}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-200 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-red-900 dark:hover:text-red-500"
              >
                <Menu className="size-5" />
              </button>

              {categoryOpen ? (
                <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {t("news.categories")}
                  </div>
                  {categories.length > 0 ? (
                    <div className="py-2">
                      {categories.map((category) => (
                        <Link
                          key={category.href}
                          href={category.href}
                          className="block rounded px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-100 hover:text-red-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {category.label}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {t("news.noCategories")}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onViewChange("home")}
              className={buttonClass("home")}
            >
              <Home className="size-4" />
              {t("nav.home")}
            </button>
            <button
              type="button"
              onClick={() => onViewChange("news")}
              className={buttonClass("news")}
            >
              <Newspaper className="size-4" />
              {t("nav.news")}
            </button>
            <button
              type="button"
              onClick={() => onViewChange("shorts")}
              className={buttonClass("shorts")}
            >
              <Play className="size-4" />
              {t("nav.shorts")}
            </button>
          </div>
        </div>
        <NewsAccountControls />
      </div>
    </nav>
  );
}

function FollowUsCard() {
  const links = [
    {
      label: "YouTube",
      href: "https://www.youtube.com/",
      icon: <Youtube className="size-4" />,
      hover: "hover:text-red-600",
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/",
      icon: <Facebook className="size-4" />,
      hover: "hover:text-blue-600",
    },
    {
      label: "Telegram",
      href: "https://t.me/",
      icon: <Send className="size-4" />,
      hover: "hover:text-sky-500",
    },
    {
      label: "TikTok",
      href: "https://www.tiktok.com/",
      icon: (
        <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      ),
      hover: "hover:text-slate-950 dark:hover:text-white",
    },
  ];

  return (
    <div className="border-t-2 border-slate-200 pt-3 dark:border-slate-800">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        Follow Us
      </div>
      <div className="flex items-center gap-3">
        {links.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            className={`flex size-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 shadow-sm transition ${item.hover} dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300`}
          >
            {item.icon}
          </a>
        ))}
      </div>
    </div>
  );
}

function MetaLine({ entry }: { entry: CmsEntry }) {
  return (
    <p className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
      <Clock className="size-3" />
      {formatDate(entry.publishedAt)}
    </p>
  );
}

function EntryShareButton({ entry }: { entry: CmsEntry }) {
  const [copied, setCopied] = useState(false);

  const shareEntry = async () => {
    const url = getShareUrl(entry);
    try {
      if (navigator.share) {
        await navigator.share({
          title: entry.title,
          text: entry.excerpt || entry.title,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void shareEntry();
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-red-500"
    >
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      <span>{copied ? "Copied" : "Share"}</span>
    </button>
  );
}

function SmallStory({ entry, number }: { entry: CmsEntry; number?: number }) {
  return (
    <Link
      href={getEntryHref(entry)}
      className="group flex gap-3 rounded p-2 transition hover:bg-slate-50 dark:hover:bg-slate-900"
    >
      {number ? (
        <span className="w-7 flex-shrink-0 text-3xl font-black leading-none text-slate-300 dark:text-slate-700">
          {number}
        </span>
      ) : (
        <NewsImage entry={entry} className="h-20 w-24 flex-shrink-0 rounded shadow-md" />
      )}
      <div className="min-w-0">
        <div className="text-xs font-black uppercase text-red-600">
          {categoryLabel(entry)}
        </div>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-slate-950 transition group-hover:text-red-600 dark:text-white">
          {entry.title}
        </h3>
        <MetaLine entry={entry} />
      </div>
    </Link>
  );
}

function StoryTile({ entry }: { entry: CmsEntry }) {
  return (
    <article className="group block min-w-0">
      <Link href={getEntryHref(entry)} className="block min-w-0">
        <NewsImage
          entry={entry}
          className="mb-3 aspect-[16/9] w-full rounded-md object-cover shadow-sm transition duration-300 group-hover:brightness-95"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.08em]">
          <span className="text-red-600">{categoryLabel(entry)}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-500 dark:text-slate-400">
            {formatDate(entry.publishedAt)}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-3 text-xl font-bold leading-snug text-slate-950 transition group-hover:text-red-600 dark:text-white">
          {entry.title}
        </h3>
        {entry.excerpt ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {entry.excerpt}
          </p>
        ) : null}
      </Link>
      <div className="mt-2">
        <EntryShareButton entry={entry} />
      </div>
    </article>
  );
}

function ShortsRail({ posts }: { posts: CmsEntry[] }) {
  const railRef = useRef<HTMLDivElement | null>(null);

  if (posts.length === 0) return null;

  const scrollRail = (direction: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) return;
    const amount = Math.max(rail.clientWidth * 0.85, 320);
    rail.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section id="shorts" className="scroll-mt-24 border-y-2 border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between border-b-4 border-red-600 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-red-600">SM</span>
            <h2 className="text-2xl font-black uppercase tracking-tight">Shorts</h2>
          </div>
          <span className="flex items-center gap-2 text-sm font-bold text-red-600">
            <span>Quick stories</span>
            <div className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => scrollRail("left")}
                aria-label="Scroll shorts left"
                className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-200 hover:text-red-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-red-900"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail("right")}
                aria-label="Scroll shorts right"
                className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-200 hover:text-red-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-red-900"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </span>
        </div>

        <div
          ref={railRef}
          className="flex snap-x gap-4 overflow-x-auto pb-3"
        >
          {posts.map((post, index) => (
            <Link key={`${post.id}-${index}`} href={getEntryHref(post)} className="group w-44 flex-shrink-0 snap-start">
              <div className="relative mb-2 aspect-[9/16] overflow-hidden rounded-lg bg-black shadow-lg">
                <ShortMedia entry={post} className="pointer-events-none h-full w-full border-0 object-cover transition duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 transition group-hover:scale-110">
                    <Play className="ml-1 size-6 fill-black text-black" />
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-1 text-xs font-bold text-white">
                  Short
                </div>
              </div>
              <h3 className="line-clamp-2 text-sm font-bold leading-tight transition group-hover:text-red-600">
                {post.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShortsOnlyView({ posts }: { posts: CmsEntry[] }) {
  if (posts.length === 0) return null;

  return (
    <section id="shorts" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between border-b-4 border-red-600 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-red-600">SM</span>
          <h1 className="text-3xl font-black uppercase tracking-tight">Shorts</h1>
        </div>
        <span className="text-sm font-bold text-red-600">Quick stories</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {posts.map((post, index) => (
          <article key={`${post.id}-shorts-page-${index}`} className="group block min-w-0">
            <div className="relative mb-3 aspect-[9/16] overflow-hidden rounded-lg bg-black shadow-md">
              <ShortMedia entry={post} className="h-full w-full border-0 object-cover" />
              <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/80 px-2 py-1 text-xs font-bold text-white">
                Short
              </div>
            </div>
            <Link href={getEntryHref(post)} className="block">
              <h2 className="line-clamp-3 text-base font-bold leading-snug text-slate-950 transition group-hover:text-red-600 dark:text-white">
                {post.title}
              </h2>
              <MetaLine entry={post} />
            </Link>
            <div className="mt-2">
              <EntryShareButton entry={post} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NewsOnlyView({ posts }: { posts: CmsEntry[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-4 border-red-600 pb-3">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">News</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Latest SOMARNIX stories
          </p>
        </div>
        <span className="text-sm font-bold text-red-600">{posts.length} stories</span>
      </div>

      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {posts.map((post, index) => (
          <article
            key={`${post.id}-news-page-${index}`}
            className="group min-w-0"
          >
            <Link href={getEntryHref(post)} className="block min-w-0">
              <NewsImage
                entry={post}
                className="mb-3 aspect-[16/9] w-full rounded-md object-cover shadow-sm transition duration-300 group-hover:brightness-95"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.08em]">
                <span className="text-red-600">{categoryLabel(post)}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatDate(post.publishedAt)}
                </span>
              </div>
              <h2 className="mt-2 line-clamp-3 text-xl font-bold leading-snug text-slate-950 transition group-hover:text-red-600 dark:text-white">
                {post.title}
              </h2>
              {post.excerpt ? (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {post.excerpt}
                </p>
              ) : null}
              <MetaLine entry={post} />
            </Link>
            <div className="mt-2">
              <EntryShareButton entry={post} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DenseGrid({ title, posts }: { title: string; posts: CmsEntry[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-6 border-t-2 border-slate-300 pt-4 dark:border-slate-700">
      <h2 className="mb-3 border-l-4 border-red-600 pl-3 text-xl font-black uppercase">
        {title}
      </h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {posts.map((post, index) => (
          <Link
            key={`${post.id}-${title}-${index}`}
            href={getEntryHref(post)}
            className="group grid gap-2 rounded-md p-1 transition hover:bg-white dark:hover:bg-slate-900 sm:grid-cols-[88px_minmax(0,1fr)]"
          >
            <NewsImage entry={post} className="aspect-[16/9] w-full rounded object-cover shadow-sm sm:h-16" />
            <div className="min-w-0">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.08em] text-red-600">
                {categoryLabel(post)}
              </div>
              <h3 className="line-clamp-3 text-sm font-bold leading-tight text-slate-950 transition group-hover:text-red-600 dark:text-white">
                {post.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NewsPage({ posts }: { posts: CmsEntry[] }) {
  const [activeView, setActiveView] = useState<NewsView>("home");
  const [newsPage, setNewsPage] = useState(1);
  const [shortsPage, setShortsPage] = useState(1);
  const isPhoneViewport = useIsPhoneViewport();
  const newsPageSize = isPhoneViewport ? 8 : 16;
  const shortsPageSize = isPhoneViewport ? 10 : 15;
  const newsPosts = posts.filter((post) => post.contentType !== "short");
  const shortPosts = posts.filter((post) => post.contentType === "short");
  const homePosts = newsPosts.slice(0, 24);
  const [featured] = homePosts;
  const breakingPosts = homePosts.slice(1, 16);
  const latestPosts = homePosts.slice(2, 18);
  const trendingPosts = [...homePosts]
    .sort((a, b) => b.sortOrder - a.sortOrder || b.id - a.id)
    .slice(0, 10);
  const shortsPosts = shortPosts.slice(0, 12);
  const allNewsPosts = newsPosts;
  const allShortsPosts = shortPosts;
  const futurePosts = newsPosts.filter(isFutureEntry).slice(0, 6);
  const newsTotalPages = Math.max(1, Math.ceil(allNewsPosts.length / newsPageSize));
  const shortsTotalPages = Math.max(1, Math.ceil(allShortsPosts.length / shortsPageSize));
  const visibleNewsPage = Math.min(newsPage, newsTotalPages);
  const visibleShortsPage = Math.min(shortsPage, shortsTotalPages);
  const newsPageStart = (visibleNewsPage - 1) * newsPageSize;
  const shortsPageStart = (visibleShortsPage - 1) * shortsPageSize;
  const pagedNewsPosts = allNewsPosts.slice(newsPageStart, newsPageStart + newsPageSize);
  const pagedShortsPosts = allShortsPosts.slice(shortsPageStart, shortsPageStart + shortsPageSize);

  useEffect(() => {
    const syncViewFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      setActiveView(
        view === "news" || view === "shorts" || window.location.hash === "#shorts"
          ? view === "news"
            ? "news"
            : "shorts"
          : "home"
      );
    };

    syncViewFromUrl();
    window.addEventListener("popstate", syncViewFromUrl);
    window.addEventListener("hashchange", syncViewFromUrl);
    return () => {
      window.removeEventListener("popstate", syncViewFromUrl);
      window.removeEventListener("hashchange", syncViewFromUrl);
    };
  }, []);

  const changeView = (view: NewsView) => {
    setActiveView(view);
    setNewsPage(1);
    setShortsPage(1);
    const target =
      view === "news" ? "/news?view=news" : view === "shorts" ? "/news?view=shorts" : "/news";
    window.history.pushState({ newsView: view }, "", target);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const changeNewsPage = (page: number) => {
    setNewsPage(page);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const changeShortsPage = (page: number) => {
    setShortsPage(page);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  if (!featured && shortPosts.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-center dark:bg-slate-950">
        <h1 className="text-4xl font-black">News</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">No news content is published yet.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <Advertisement label="Top Advertisement" size="leaderboard" />
      </div>

      <NewsUtilityBar />

      <NewsMenuBar activeView={activeView} onViewChange={changeView} />

      {activeView === "shorts" ? (
        <>
          <ShortsOnlyView posts={pagedShortsPosts} />
          <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <Pagination
              currentPage={visibleShortsPage}
              totalPages={shortsTotalPages}
              onPageChange={changeShortsPage}
              className="bg-white dark:bg-slate-900"
            />
          </div>
        </>
      ) : null}

      {activeView === "news" ? (
        <>
          <NewsOnlyView posts={pagedNewsPosts} />
          <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <Pagination
              currentPage={visibleNewsPage}
              totalPages={newsTotalPages}
              onPageChange={changeNewsPage}
              className="bg-white dark:bg-slate-900"
            />
          </div>
        </>
      ) : null}

      {activeView === "home" ? <ShortsRail posts={shortsPosts} /> : null}

      {activeView === "home" && featured ? (
      <>
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-12 xl:gap-6">
          <aside className="space-y-4 lg:col-span-3">
            <SectionHeading title="Breaking" />
            {breakingPosts.slice(0, 7).map((post, index) => (
              <SmallStory key={`${post.id}-breaking-${index}`} entry={post} />
            ))}
            <div className="space-y-1.5 border-t-2 border-slate-200 pt-3 dark:border-slate-800">
              {breakingPosts.slice(5, 9).map((post, index) => (
                <Link
                  key={`${post.id}-bullet-${index}`}
                  href={getEntryHref(post)}
                  className="block rounded px-1 py-1 text-[11px] font-bold leading-snug transition hover:bg-white hover:text-red-600 dark:hover:bg-slate-900"
                >
                  <span className="text-red-600">-</span>{" "}
                  <span className="line-clamp-2 align-top">{post.title}</span>
                </Link>
              ))}
            </div>
            <FollowUsCard />
            <div className="space-y-3">
              <Advertisement label="Sidebar Advertisement" size="rectangle" />
              <Advertisement label="Sidebar Advertisement" size="rectangle" />
            </div>
          </aside>

          <section className="lg:col-span-6">
            <Link href={getEntryHref(featured)} className="group block">
              <div className="relative overflow-hidden rounded-sm shadow-xl">
                <NewsImage
                  entry={featured}
                  className="h-80 w-full transition duration-500 group-hover:scale-105 lg:h-96"
                />
                <div className="absolute left-4 top-4 bg-red-600 px-3 py-1 text-xs font-black uppercase text-white shadow-lg">
                  Featured
                </div>
              </div>
              <h1 className="mt-5 line-clamp-5 break-words text-3xl font-black leading-tight transition group-hover:text-red-600 lg:text-4xl">
                {featured.title}
              </h1>
              {featured.excerpt ? (
                <p className="mt-4 line-clamp-3 text-base leading-7 text-slate-600 dark:text-slate-400">
                  {featured.excerpt}
                </p>
              ) : null}
              <MetaLine entry={featured} />
            </Link>

            <div className="mt-6 grid gap-x-4 gap-y-6 border-t-2 border-slate-300 pt-5 dark:border-slate-700 sm:grid-cols-2">
              {latestPosts.slice(0, 4).map((post, index) => (
                <Fragment key={`${post.id}-secondary-${index}`}>
                  <StoryTile entry={post} />
                  {index === 1 ? (
                    <div
                      className="sm:col-span-2"
                    >
                      <Advertisement label="Inline Advertisement" size="leaderboard" />
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </section>

          <aside className="space-y-5 lg:col-span-3">
            <div className="border-2 border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <SectionHeading title="Trending" icon="trend" />
              {trendingPosts.slice(0, 8).map((post, index) => (
                <SmallStory key={`${post.id}-trend-${index}`} entry={post} number={index + 1} />
              ))}
            </div>

            {activeView === "home" ? (
              <div className="border-2 border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <SectionHeading title="Featured Shorts" icon="play" />
                <div className="space-y-4">
                  {shortsPosts.slice(0, 3).map((post, index) => (
                    <Link key={`${post.id}-featured-short-${index}`} href={getEntryHref(post)} className="group block">
                      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded bg-slate-900 shadow-md">
                        <ShortMedia entry={post} className="pointer-events-none absolute inset-0 h-full w-full border-0 object-cover opacity-70" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <Play className="relative z-10 size-12 fill-white text-white transition group-hover:scale-110" />
                        <p className="absolute bottom-3 left-4 right-4 z-10 line-clamp-2 text-sm font-bold leading-snug text-white">
                          {post.title}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <Advertisement label="Right Rail Advertisement" size="rectangle" />
          </aside>
        </div>

        <DenseGrid title="Latest News" posts={latestPosts.slice(0, 12)} />
        <div className="mt-6">
          <Advertisement label="Latest News Advertisement" size="leaderboard" />
        </div>
        <DenseGrid title="Most Popular" posts={trendingPosts.slice(0, 12)} />
        <div className="mt-6">
          <Advertisement label="Sponsored Advertisement" />
        </div>
        {futurePosts.length > 0 ? <DenseGrid title="Future Posts" posts={futurePosts} /> : null}
        <DenseGrid title="Editor's Choice" posts={homePosts.slice(6, 18)} />
        <div className="mt-6">
          <Advertisement label="Editor's Choice Advertisement" size="leaderboard" />
        </div>
        <DenseGrid title="Recommended Reading" posts={homePosts.slice(8, 24)} />
        <div className="mt-6">
          <Advertisement label="Bottom Advertisement" size="leaderboard" />
        </div>
      </section>
      </>
      ) : null}
    </main>
  );
}
