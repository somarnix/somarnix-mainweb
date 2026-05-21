"use client";

import Link from "next/link";
import {
  Bookmark,
  Facebook,
  Globe,
  LogIn,
  Menu,
  Moon,
  Newspaper,
  Play,
  Send,
  Sun,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LanguageSelect } from "@/app/components/LanguageSelect";
import { NewsAccountControls } from "@/app/components/news/NewsAccountControls";
import { useAuth } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { Pagination } from "@/app/components/Pagination";

type SavedNewsItem = {
  id: number;
  contentType: "page" | "post";
  title: string;
  excerpt: string | null;
  href: string;
  featuredImageUrl: string | null;
  publishedAt: string | null;
};

type SavedFilter = "all" | "news" | "shorts";

function savedFilterForItem(item: SavedNewsItem): Exclude<SavedFilter, "all"> {
  return item.contentType === "post" ? "news" : "shorts";
}

function savedFilterLabel(filter: SavedFilter) {
  if (filter === "news") return "News";
  if (filter === "shorts") return "Shorts";
  return "All saved";
}

function getSavedPageSize(filter: SavedFilter, isPhone: boolean) {
  if (filter === "shorts") return isPhone ? 10 : 15;
  return isPhone ? 8 : 16;
}

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
  if (!value) return "News";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "News";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function SavedNewsImage({ item }: { item: SavedNewsItem }) {
  if (item.featuredImageUrl) {
    return (
      <img
        src={item.featuredImageUrl}
        alt={item.title}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#111827,#dc2626_52%,#f97316)] text-xs font-black uppercase tracking-[0.18em] text-white">
      SOMARNIX
    </div>
  );
}

function Advertisement() {
  return (
    <div className="mx-auto flex h-28 max-w-7xl items-center justify-center rounded border border-dashed border-slate-300 bg-white text-center text-xs font-black uppercase tracking-[0.22em] text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
      Top Advertisement
    </div>
  );
}

function SavedNewsUtilityBar() {
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

function SavedNewsMenuBar({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: SavedFilter;
  onFilterChange: (filter: SavedFilter) => void;
  counts: Record<SavedFilter, number>;
}) {
  const { t } = useLanguage();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const linkClass =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-black uppercase tracking-tight transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-900 sm:px-4";
  const buttonClass = (filter: SavedFilter) =>
    `${linkClass} ${
      activeFilter === filter
        ? "bg-slate-100 text-red-600 dark:bg-slate-900 dark:text-red-500"
        : "text-slate-900 dark:text-white"
    }`;
  const filters: Array<{ value: SavedFilter; label: string }> = [
    { value: "all", label: "All saved" },
    { value: "news", label: t("nav.news") },
    { value: "shorts", label: t("nav.shorts") },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-2 sm:px-6 lg:min-h-14 lg:flex-row lg:items-center lg:gap-2 lg:px-8">
        <Link
          href="/news"
          className="flex min-h-9 shrink-0 items-center gap-1.5 lg:mr-3"
        >
          <span className="text-xl font-black leading-none text-red-600 lg:text-lg">SM</span>
          <span className="whitespace-nowrap text-base font-black uppercase tracking-tight text-slate-950 dark:text-white lg:text-sm">
            Somarnix News
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 lg:flex-1">
          <div className="grid flex-1 grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)] gap-1.5 sm:flex sm:flex-none sm:flex-wrap sm:items-center sm:gap-2">
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
                  <div className="py-2">
                    {filters.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => {
                          onFilterChange(filter.value);
                          setCategoryOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm font-bold transition ${
                          activeFilter === filter.value
                            ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                            : "text-slate-800 hover:bg-slate-100 hover:text-red-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {counts[filter.value]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onFilterChange("news")}
              className={buttonClass("news")}
            >
              <Newspaper className="size-4" />
              {t("nav.news")}
            </button>
            <button
              type="button"
              onClick={() => onFilterChange("shorts")}
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

export function SavedNewsPage() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<SavedNewsItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<SavedFilter>("all");
  const [page, setPage] = useState(1);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPhoneViewport = useIsPhoneViewport();
  const counts: Record<SavedFilter, number> = {
    all: items.length,
    news: items.filter((item) => savedFilterForItem(item) === "news").length,
    shorts: items.filter((item) => savedFilterForItem(item) === "shorts").length,
  };
  const filteredItems =
    activeFilter === "all"
      ? items
      : items.filter((item) => savedFilterForItem(item) === activeFilter);
  const pageSize = getSavedPageSize(activeFilter, isPhoneViewport);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    let active = true;
    const loadSavedNews = async () => {
      try {
        setItemsLoading(true);
        setError(null);
        const res = await fetch("/api/cms/favorites", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load saved news");
        if (active) setItems(Array.isArray(data.entries) ? data.entries : []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load saved news");
        setItems([]);
      } finally {
        if (active) setItemsLoading(false);
      }
    };
    void loadSavedNews();
    return () => {
      active = false;
    };
  }, [isAuthenticated, loading]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="px-4 pt-3 sm:px-6 lg:px-8">
        <Advertisement />
      </div>
      <SavedNewsUtilityBar />

      <SavedNewsMenuBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-4 border-red-600 pb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
              {activeFilter === "all" ? t("news.saved") : `${savedFilterLabel(activeFilter)} Saved`}
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {activeFilter === "all"
                ? t("news.savedSubtitle")
                : `Saved ${savedFilterLabel(activeFilter).toLowerCase()} from SOMARNIX News.`}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {filteredItems.length}
          </span>
        </div>

        {loading || itemsLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-lg bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              />
            ))}
          </div>
        ) : !isAuthenticated ? (
          <div className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <Bookmark className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h2 className="mt-4 text-2xl font-black">{t("news.loginToViewSaved")}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {t("news.loginToViewSavedDesc")}
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4" />
              {t("nav.login")}
            </Link>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-5 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <Bookmark className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h2 className="mt-4 text-2xl font-black">
              {activeFilter === "all" ? t("news.noSaved") : `No saved ${savedFilterLabel(activeFilter).toLowerCase()}`}
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {t("news.noSavedHint")}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedItems.map((item) => (
                <article key={item.id} className="group min-w-0">
                  <Link href={item.href} className="block min-w-0">
                    <div className="mb-3 aspect-[16/10] overflow-hidden rounded-lg bg-slate-900 shadow-md">
                      <SavedNewsImage item={item} />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em]">
                      <span className="text-red-600">{savedFilterLabel(savedFilterForItem(item))}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatDate(item.publishedAt)}
                      </span>
                    </div>
                    <h2 className="mt-2 line-clamp-3 text-xl font-bold leading-snug transition group-hover:text-red-600">
                      {item.title}
                    </h2>
                    {item.excerpt ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {item.excerpt}
                      </p>
                    ) : null}
                  </Link>
                </article>
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  className="bg-white dark:bg-slate-900"
                />
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
