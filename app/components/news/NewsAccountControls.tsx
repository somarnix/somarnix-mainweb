"use client";

import Link from "next/link";
import { Bookmark, ExternalLink, LogIn, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { ProfileAvatar } from "@/app/components/ProfileAvatar";

function resolveDisplayName(
  ...values: Array<string | null | undefined>
) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "Account";
}

export function NewsAccountControls() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const displayName = user
    ? resolveDisplayName(
        `${user.firstName ?? ""} ${user.lastName ?? ""}`,
        user.username,
        user.email
      )
    : "";
  const fallback = displayName.slice(0, 2).toUpperCase() || "U";

  const handleLogout = async () => {
    await logout();
    setOpen(false);
  };

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    let active = true;
    const loadSavedCount = async () => {
      try {
        const res = await fetch("/api/cms/favorites", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!active || !res.ok) return;
        setSavedCount(Array.isArray(data.entries) ? data.entries.length : 0);
      } catch {
        if (active) setSavedCount(0);
      }
    };
    void loadSavedCount();
    return () => {
      active = false;
    };
  }, [isAuthenticated, open]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href="/"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black uppercase tracking-tight text-slate-900 shadow-sm transition hover:border-red-200 hover:bg-slate-50 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-red-900 dark:hover:bg-slate-800 dark:hover:text-red-500"
      >
        <ExternalLink className="size-4" />
        <span>{t("nav.viewWebsite")}</span>
      </Link>

      {loading ? (
        <div className="h-10 w-28 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      ) : isAuthenticated && user ? (
        <div className="relative" data-no-auto-translate>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-900 shadow-sm transition hover:border-red-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-red-900 dark:hover:bg-slate-800"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <div className="relative">
              <ProfileAvatar
                src={user.avatarUrl}
                alt={displayName}
                fallback={fallback}
                borderUrl={
                  Number(user.level ?? 1) >= 2 ? user.avatarBorderUrl ?? null : null
                }
                className="h-8 w-8 rounded-full bg-white p-0.5 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700"
                fallbackClassName="text-xs"
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950" />
            </div>
            <span className="max-w-28 truncate">{displayName}</span>
          </button>

          {open ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default"
                aria-label="Close account menu"
                onClick={() => setOpen(false)}
              />
              <div
                className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-lg bg-blue-600 text-white shadow-2xl dark:bg-blue-700"
                role="menu"
              >
                <div className="border-b border-blue-500 bg-blue-700 px-4 py-3 dark:bg-blue-800">
                  <div className="truncate text-sm font-black">{displayName}</div>
                  <div className="mt-0.5 truncate text-xs font-semibold text-blue-100">
                    {t("sidebar.userId")}: {user.id}
                  </div>
                </div>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-700 dark:hover:bg-blue-800"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <User className="size-4" />
                  {t("popup.account")}
                </Link>
                <Link
                  href="/news/saved"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-700 dark:hover:bg-blue-800"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <Bookmark className="size-4" />
                  {t("news.saved")}
                  <span className="ml-auto rounded-full bg-blue-500 px-2 py-0.5 text-xs">
                    {savedCount}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold transition hover:bg-blue-700 dark:hover:bg-blue-800"
                  role="menuitem"
                >
                  <LogOut className="size-4" />
                  {t("popup.logout")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-black uppercase tracking-tight text-slate-900 transition hover:bg-slate-100 hover:text-red-600 dark:text-white dark:hover:bg-slate-900 dark:hover:text-red-500"
          >
            <LogIn className="size-4" />
            {t("nav.login")}
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-black uppercase tracking-tight text-white shadow-sm transition hover:bg-red-700"
          >
            {t("nav.signup")}
          </Link>
        </div>
      )}
    </div>
  );
}
