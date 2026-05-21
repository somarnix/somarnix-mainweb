"use client";

import Link from "next/link";
import {
  Facebook,
  Globe,
  Home,
  Moon,
  Newspaper,
  Play,
  Send,
  Sun,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LanguageSelect } from "@/app/components/LanguageSelect";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { NewsAccountControls } from "./NewsAccountControls";

function NewsTopAdvertisement({ label }: { label: string }) {
  return (
    <div className="px-4 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-28 max-w-7xl items-center justify-center rounded border border-dashed border-slate-300 bg-white text-center text-xs font-black uppercase tracking-[0.22em] text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
        {label}
      </div>
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
        <div className="flex min-w-0 items-center gap-5 text-sm font-semibold">
          <div className="inline-flex min-w-0 items-center gap-2" data-no-auto-translate>
            <Globe className="size-4 shrink-0" />
            <LanguageSelect buttonClassName="bg-transparent p-0 text-sm" />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex shrink-0 items-center gap-2 rounded px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-5">
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

function NewsNavigationBar({ showLinks }: { showLinks: boolean }) {
  const { t } = useLanguage();
  const linkClass =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-black uppercase tracking-tight text-slate-900 transition hover:bg-slate-100 hover:text-red-600 dark:text-white dark:hover:bg-slate-900 dark:hover:text-red-500 sm:px-4";

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
          {showLinks ? (
            <div className="grid flex-1 grid-cols-3 gap-1.5 sm:flex sm:flex-none sm:flex-wrap sm:items-center sm:gap-2">
              <Link href="/news" className={linkClass}>
                <Home className="size-4" />
                {t("nav.home")}
              </Link>
              <Link href="/news?view=news" className={linkClass}>
                <Newspaper className="size-4" />
                {t("nav.news")}
              </Link>
              <Link href="/news?view=shorts" className={linkClass}>
                <Play className="size-4" />
                {t("nav.shorts")}
              </Link>
            </div>
          ) : null}
        </div>

        <NewsAccountControls />
      </div>
    </nav>
  );
}

export function NewsPageChrome({
  advertisementLabel = "Top Advertisement",
  showNavigationLinks = true,
}: {
  advertisementLabel?: string;
  showNavigationLinks?: boolean;
}) {
  return (
    <>
      <NewsTopAdvertisement label={advertisementLabel} />
      <NewsUtilityBar />
      <NewsNavigationBar showLinks={showNavigationLinks} />
    </>
  );
}
