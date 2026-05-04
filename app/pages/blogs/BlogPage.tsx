"use client";

import React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { CourseCard } from "../../components/CourseCard";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { getDefaultProfileCover, ProfileCoverArt } from "../../components/ProfileCoverArt";
import { UserLevelBadge } from "../../components/level/UserLevelBadge";
import { UserOnlineStatus } from "../../components/UserOnlineStatus";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useUserPresence } from "../../lib/hooks/useUserPresence";
import { useAppShellMode } from "../../lib/app-shell";

type ServiceCard = {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  category: string;
  min_price: number | null;
  min_original_price: number | null;
  stock_qty: number;
  is_unlimited_stock: 0 | 1;
  kind: "product" | "video";
};

type ProductRow = {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  category: string;
  min_price: number | null;
  min_original_price: number | null;
  stock_qty: number;
  is_unlimited_stock: 0 | 1;
};

type VideoCourseRow = {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  min_price: number | string | null;
};

type BlogProfileResponse = {
  seller: {
    id: number;
    name: string;
    email: string;
    username?: string | null;
    level?: number | null;
    avatarUrl: string | null;
    avatarBorderUrl?: string | null;
    coverUrl?: string | null;
    coverPositionX?: number | null;
    coverPositionY?: number | null;
    coverScale?: number | null;
    bio: string | null;
    memberSince: string | null;
  };
  stats: {
    successfulDelivery: number;
    totalLifetimeOrders: number;
    allTimeRating: number;
    followers: number;
    following: number;
  };
  viewer: {
    isFollowing: boolean;
    canFollow: boolean;
  };
};

const serviceTabs = ["ai", "programs", "games", "tools", "courses"] as const;
type ServiceTab = (typeof serviceTabs)[number];

const categoryMap: Record<ServiceTab, string> = {
  ai: "ai",
  programs: "program",
  games: "game",
  tools: "tools",
  courses: "course",
};

function formatMemberSince(value: string | null, language: "en" | "km") {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(language === "km" ? "km-KH" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCompact(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function getBadgeAssetNumber(currentLevel: number) {
  if (currentLevel <= 1) return 1;
  if (currentLevel <= 10) return currentLevel;
  return Math.min(100, 11 + Math.floor((currentLevel - 11) / 11));
}

type BlogPageProps = {
  initialSellerId?: string | null;
};

export function BlogPage({ initialSellerId }: BlogPageProps) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAppShell = useAppShellMode();

  const [sellerId, setSellerId] = React.useState<number | null>(null);
  const [activeServiceTab, setActiveServiceTab] = React.useState<ServiceTab>("ai");
  const [serviceCards, setServiceCards] = React.useState<ServiceCard[]>([]);
  const [serviceLoading, setServiceLoading] = React.useState(false);
  const [searchProduct, setSearchProduct] = React.useState("");
  const [searchVideo, setSearchVideo] = React.useState("");
  const [serviceFilter, setServiceFilter] = React.useState<
    "all" | "free" | "paid" | "instock" | "outstock"
  >("all");

  const [profile, setProfile] = React.useState<BlogProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [followLoading, setFollowLoading] = React.useState(false);
  const sellerPresence = useUserPresence(profile?.seller.id ?? sellerId);

  React.useEffect(() => {
    const fromRoute = (initialSellerId ?? "").trim();
    if (fromRoute) {
      setSellerId(Number.isFinite(Number(fromRoute)) && Number(fromRoute) > 0 ? Number(fromRoute) : null);
      return;
    }

    const fromQuery = Number(searchParams.get("sellerId") ?? 0);
    if (Number.isFinite(fromQuery) && fromQuery > 0) {
      setSellerId(fromQuery);
      return;
    }

    if (user?.id) {
      setSellerId(user.id);
      return;
    }

    setSellerId(null);
  }, [initialSellerId, searchParams, user?.id]);

  React.useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const routeSellerKey = (initialSellerId ?? "").trim();
      if (!sellerId && !routeSellerKey) {
        if (!active) return;
        setProfile(null);
        return;
      }
      try {
        setProfileLoading(true);
        const sellerQueryValue = routeSellerKey || String(sellerId);
        const res = await fetch(`/api/blog/profile?seller=${encodeURIComponent(sellerQueryValue)}`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as BlogProfileResponse;
        if (!res.ok) throw new Error("Failed to load profile");
        if (!active) return;
        setProfile(data);
        setSellerId(Number(data.seller.id) > 0 ? Number(data.seller.id) : null);
      } catch {
        if (!active) return;
        setProfile(null);
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [initialSellerId, sellerId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const username = profile?.seller.username?.trim();
    if (!username) return;

    const normalizedTarget = `/blog/${encodeURIComponent(username.toLowerCase())}`;
    if (window.location.pathname.toLowerCase() === normalizedTarget) return;

    const currentState = window.history.state;
    const nextState =
      currentState && typeof currentState === "object"
        ? { ...currentState, page: "blog", sellerId: username }
        : { page: "blog", sellerId: username };
    window.history.replaceState(nextState, "", normalizedTarget);
  }, [profile?.seller.username]);

  React.useEffect(() => {
    let active = true;

    const loadServices = async () => {
      if (!sellerId) {
        if (!active) return;
        setServiceCards([]);
        return;
      }
      try {
        setServiceLoading(true);
        const category = categoryMap[activeServiceTab];

        if (activeServiceTab === "courses") {
          const params = new URLSearchParams({
            category,
            limit: "100",
            posted_by: String(sellerId),
          });

          const [productsRes, videoRes] = await Promise.all([
            fetch(`/api/products?${params.toString()}`, { cache: "no-store" }),
            fetch(`/api/video-courses?posted_by=${sellerId}`, { cache: "no-store" }),
          ]);

          const productsData = productsRes.ok
            ? ((await productsRes.json()) as ProductRow[])
            : [];
          const videosData = videoRes.ok
            ? ((await videoRes.json()) as { courses?: VideoCourseRow[] })
            : { courses: [] };

          const products: ServiceCard[] = (Array.isArray(productsData) ? productsData : []).map(
            (item) => ({
              ...item,
              kind: "product" as const,
            })
          );

          const videos: ServiceCard[] = (videosData.courses ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            image_url: item.thumbnail_url,
            category: "course",
            min_price: item.min_price === null ? null : Number(item.min_price),
            min_original_price: null,
            stock_qty: 1,
            is_unlimited_stock: 1,
            kind: "video",
          }));

          if (!active) return;
          setServiceCards([...products, ...videos]);
          return;
        }

        const params = new URLSearchParams({
          category,
          limit: "100",
          posted_by: String(sellerId),
        });
        const res = await fetch(`/api/products?${params.toString()}`, {
          cache: "no-store",
        });
        const data = res.ok ? ((await res.json()) as ProductRow[]) : [];

        if (!active) return;
        setServiceCards(
          (Array.isArray(data) ? data : []).map((item) => ({
            ...item,
            kind: "product" as const,
          }))
        );
      } catch {
        if (!active) return;
        setServiceCards([]);
      } finally {
        if (active) setServiceLoading(false);
      }
    };

    void loadServices();
    return () => {
      active = false;
    };
  }, [activeServiceTab, sellerId]);

  const filteredCards = React.useMemo(() => {
    const productQuery = searchProduct.trim().toLowerCase();
    const videoQuery = searchVideo.trim().toLowerCase();

    const applyFilter = (card: ServiceCard) => {
      const price = typeof card.min_price === "number" ? card.min_price : 0;
      const isFree = price <= 0;
      const isOutOfStock =
        card.kind === "product" &&
        Number(card.is_unlimited_stock) === 0 &&
        Number(card.stock_qty) <= 0;
      const isInStock = card.kind === "video" ? true : !isOutOfStock;

      if (serviceFilter === "free") return isFree;
      if (serviceFilter === "paid") return !isFree;
      if (serviceFilter === "instock") return isInStock;
      if (serviceFilter === "outstock") return !isInStock;
      return true;
    };

    return serviceCards.filter((card) => {
      const q = card.kind === "video" ? videoQuery : productQuery;
      const matched = q ? card.title.toLowerCase().includes(q) : true;
      return matched && applyFilter(card);
    });
  }, [searchProduct, searchVideo, serviceCards, serviceFilter]);

  const handleToggleFollow = async () => {
    if (!profile?.viewer.canFollow || !profile?.seller.id) return;

    try {
      setFollowLoading(true);
      const isFollowing = profile.viewer.isFollowing;
      const endpoint = `/api/blog/follow${
        isFollowing ? `?followingId=${profile.seller.id}` : ""
      }`;
      const res = await fetch(endpoint, {
        method: isFollowing ? "DELETE" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: isFollowing ? undefined : JSON.stringify({ followingId: profile.seller.id }),
      });
      if (!res.ok) return;

      const nextFollowing = !isFollowing;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              viewer: { ...prev.viewer, isFollowing: nextFollowing },
              stats: {
                ...prev.stats,
                followers: prev.stats.followers + (nextFollowing ? 1 : -1),
              },
            }
          : prev
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const avatarInitials = React.useMemo(() => {
    const base = profile?.seller.name || profile?.seller.email || "U";
    return base.trim().slice(0, 2).toUpperCase();
  }, [profile?.seller.email, profile?.seller.name]);

  const getServiceTabLabel = (tab: ServiceTab) => {
    switch (tab) {
      case "programs":
        return t("blog.tab.programs");
      case "games":
        return t("blog.tab.games");
      case "tools":
        return t("blog.tab.tools");
      case "courses":
        return t("blog.tab.courses");
      case "ai":
      default:
        return t("blog.tab.ai");
    }
  };

  const sellerName = profileLoading
    ? t("common.loading")
    : profile?.seller.name || t("blog.sellerFallback");
  const verifiedBadgeSrc = "/border/blue%20verify.svg";
  const sellerLevel = Number(profile?.seller.level ?? 1);
  const sellerHasLevelPerks = sellerLevel >= 2;
  const sellerAvatarBorderUrl = sellerHasLevelPerks ? profile?.seller.avatarBorderUrl ?? null : null;
  const sellerBadgeAssetSrc = `/Budget%20SOMARNIX%20SVG/${getBadgeAssetNumber(sellerLevel)}.svg`;
  const sellerCoverSrc = profile?.seller.coverUrl || getDefaultProfileCover(profile?.seller.id ?? sellerId ?? 1);
  const sellerMeta = t("blog.sellerMeta", {
    followers: formatCompact(profile?.stats.followers ?? 0),
    following: formatCompact(profile?.stats.following ?? 0),
  });
  const sellerBio = profile?.seller.bio?.trim() || "";
  const activeServiceTabLabel = getServiceTabLabel(activeServiceTab);

  if (!sellerId) {
    return null;
  }

  return (
    <div
      className={`min-h-full overflow-x-hidden bg-gradient-to-br from-amber-50 via-slate-100 to-emerald-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 ${
        isAppShell ? "pb-8 pt-2 sm:pt-4" : ""
      }`}
    >
      <div className="mx-auto w-full max-w-7xl overflow-x-hidden px-2 py-2 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
        <section className="mb-3 overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:mb-8 sm:rounded-[2rem]">
          <div className="relative h-24 sm:h-44 lg:h-48">
            <ProfileCoverArt
              src={sellerCoverSrc}
              alt={`${sellerName} cover`}
              positionX={profile?.seller.coverPositionX ?? 50}
              positionY={profile?.seller.coverPositionY ?? 50}
              scale={profile?.seller.coverScale ?? 1}
              className="absolute inset-0"
              imageClassName="brightness-[0.78]"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/25 via-blue-900/10 to-violet-900/20" />
          </div>

          <div className="px-2.5 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-2 sm:gap-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 items-start gap-2 sm:gap-4">
                  <div className="shrink-0">
                    <div className="-mt-6 rounded-[1.25rem] bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-700 sm:-mt-12 sm:p-2 sm:rounded-[1.75rem]">
                      <div className="relative">
                        <ProfileAvatar
                          src={profile?.seller.avatarUrl}
                          alt={sellerName}
                          fallback={avatarInitials}
                          borderUrl={sellerAvatarBorderUrl}
                          className="h-14 w-14 sm:h-24 sm:w-24"
                          contentClassName={
                            sellerAvatarBorderUrl
                              ? "shadow-lg"
                              : "border-4 border-white shadow-lg dark:border-slate-900"
                          }
                          fallbackClassName="text-lg sm:text-2xl"
                        />
                        <UserOnlineStatus
                          online={sellerPresence.online}
                          showLabel={false}
                          className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1"
                          dotClassName="h-3.5 w-3.5 border-2 border-white shadow-none dark:border-slate-900 sm:h-5 sm:w-5"
                        />
                      </div>
                    </div>
                    <div className="mt-1 flex justify-center">
                      <UserOnlineStatus
                        online={sellerPresence.online}
                        onlineLabel="Online"
                        offlineLabel="Offline"
                      />
                    </div>
                  </div>

                  <div className="min-w-0 pt-0.5 sm:pt-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
                        {sellerName}
                      </div>
                      {sellerHasLevelPerks ? (
                        <img
                          src={verifiedBadgeSrc}
                          alt="Verified"
                          className="h-5 w-5 shrink-0 object-contain sm:h-6 sm:w-6"
                        />
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-300 sm:mt-1 sm:text-sm">
                      {sellerMeta}
                    </div>
                    <div className="mt-1 sm:mt-2">
                      <UserLevelBadge
                        userId={profile?.seller.id ?? sellerId}
                        size="sm"
                        showProgress={false}
                        lang={(language as "en" | "km") || "en"}
                        tone="dark"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:justify-end">
                  <button
                    onClick={handleToggleFollow}
                    disabled={!profile?.viewer.canFollow || followLoading}
                    className={`min-h-9 rounded-full px-3 py-2 text-[11px] font-semibold transition sm:min-h-10 sm:px-4 sm:text-sm ${
                      profile?.viewer.isFollowing
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-60`}
                  >
                    {followLoading
                      ? t("blog.pleaseWait")
                      : profile?.viewer.isFollowing
                        ? t("blog.following")
                        : t("blog.follow")}
                  </button>
                  <button className="min-h-9 rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 sm:min-h-10 sm:px-4 sm:text-sm">
                    {t("blog.message")}
                  </button>
                </div>
              </div>

              {sellerBio ? (
                <p className="max-w-full text-xs leading-5 text-slate-600 dark:text-slate-300 sm:text-sm sm:max-w-3xl sm:leading-6">
                  {sellerBio || t("blog.noDescription")}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <section className="overflow-hidden rounded-[1.25rem] border border-slate-200/70 bg-white/90 p-3 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800 dark:bg-slate-900 sm:rounded-[1.75rem] sm:p-6">
              <div className="mb-3 flex items-center gap-3 sm:mb-5 sm:flex-col sm:justify-center">
                <div className="relative h-12 w-12 shrink-0 sm:h-24 sm:w-24">
                  <Image
                    src={sellerBadgeAssetSrc}
                    alt={`Level ${sellerLevel} badge`}
                    fill
                    sizes="56px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 sm:text-center">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white sm:text-lg">
                    Level {sellerLevel}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-sm">
                    Current badge
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center sm:gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-2 py-2.5 dark:border-slate-800 dark:bg-slate-950/40 sm:rounded-2xl sm:px-3 sm:py-4">
                  <div className="text-base font-bold text-slate-900 dark:text-white sm:text-xl">
                    {formatCompact(profile?.stats.followers ?? 0)}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 sm:text-xs">{t("blog.followersLabel")}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-2 py-2.5 dark:border-slate-800 dark:bg-slate-950/40 sm:rounded-2xl sm:px-3 sm:py-4">
                  <div className="text-base font-bold text-slate-900 dark:text-white sm:text-xl">
                    {formatCompact(profile?.stats.following ?? 0)}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 sm:text-xs">{t("blog.followingLabel")}</div>
                </div>
              </div>

              <div className="mt-2.5 space-y-1.5 text-[10px] text-slate-600 dark:text-slate-300 sm:mt-5 sm:space-y-3 sm:text-sm">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-slate-100 pb-2 text-[10px] dark:border-slate-800 sm:flex sm:items-center sm:justify-between sm:text-xs">
                  <span className="min-w-0">{t("blog.memberSince")}</span>
                  <span className="text-right font-semibold text-slate-900 dark:text-white">
                    {formatMemberSince(profile?.seller.memberSince ?? null, language)}
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-slate-100 pb-2 text-[10px] dark:border-slate-800 sm:flex sm:items-center sm:justify-between sm:text-xs">
                  <span className="min-w-0">{t("blog.successfulDelivery")}</span>
                  <span className="text-right font-semibold text-emerald-600">
                    {(profile?.stats.successfulDelivery ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-slate-100 pb-2 text-[10px] dark:border-slate-800 sm:flex sm:items-center sm:justify-between sm:text-xs">
                  <span className="min-w-0">{t("blog.totalLifetimeOrders")}</span>
                  <span className="text-right font-semibold text-slate-900 dark:text-white">
                    {formatCompact(profile?.stats.totalLifetimeOrders ?? 0)}
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-[10px] sm:flex sm:items-center sm:justify-between sm:text-xs">
                  <span className="min-w-0">{t("blog.allTimeRating")}</span>
                  <span className="text-right font-semibold text-emerald-600">
                    {(profile?.stats.allTimeRating ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-900 sm:rounded-[1.75rem] sm:p-6">
              <div className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                {t("blog.description")}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300 sm:mt-3 sm:text-sm sm:leading-6">
                {sellerBio || t("blog.noDescription")}
              </p>
            </section>
          </aside>

          <section className="min-w-0 space-y-4 sm:space-y-6">
            <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-900 sm:rounded-[1.75rem] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                    {t("blog.allServices")}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    {t("blog.allServicesDesc")}
                  </div>
                </div>

                <div className="flex w-full items-center gap-2.5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:w-auto">
                  <div className="relative h-9 w-9 shrink-0 sm:h-11 sm:w-11">
                    <Image
                      src={sellerBadgeAssetSrc}
                      alt={`Level ${sellerLevel} badge`}
                      fill
                      sizes="44px"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300 sm:text-[11px] sm:tracking-[0.18em]">
                      Badge Collection
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 sm:mt-1 sm:text-sm">
                      Current reward badge
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 w-full overflow-x-auto pb-1 sm:mt-5">
                <div className="flex w-max min-w-full items-center gap-1.5 pr-1 text-xs sm:text-sm">
                  {serviceTabs.map((tab) => {
                    const active = tab === activeServiceTab;

                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveServiceTab(tab)}
                        className={
                          active
                            ? "rounded-full bg-red-50 px-3 py-1.5 font-semibold text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20 sm:px-4 sm:py-2"
                            : "rounded-full px-3 py-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 sm:px-4 sm:py-2"
                        }
                      >
                        {getServiceTabLabel(tab)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-2">
                <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 shadow-inner dark:border-slate-700 dark:bg-slate-950/50 sm:min-h-12 sm:gap-3 sm:px-4 sm:py-2 sm:text-sm">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-300 sm:h-8 sm:w-8 sm:text-[10px]">
                    {t("blog.find")}
                  </span>
                  <input
                    value={searchProduct}
                    onChange={(event) => setSearchProduct(event.target.value)}
                    placeholder={t("blog.findAllBrandsIn", { category: activeServiceTabLabel })}
                    className="w-full bg-transparent text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 sm:text-sm"
                  />
                </div>

                <div className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200 sm:min-h-12 sm:px-4 sm:py-2 sm:text-sm">
                  <select
                    value={serviceFilter}
                    onChange={(event) =>
                      setServiceFilter(
                        event.target.value as
                          | "all"
                          | "free"
                          | "paid"
                          | "instock"
                          | "outstock"
                      )
                    }
                    className="w-full bg-transparent text-xs text-slate-600 focus:outline-none dark:text-slate-200 sm:text-sm"
                  >
                    <option value="all">{t("blog.filter.all")}</option>
                    <option value="free">{t("blog.filter.free")}</option>
                    <option value="paid">{t("blog.filter.paid")}</option>
                    <option value="instock">{t("blog.filter.inStock")}</option>
                    <option value="outstock">{t("blog.filter.outOfStock")}</option>
                  </select>
                </div>
              </div>

              {activeServiceTab === "courses" && (
                <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
                  <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 sm:min-h-12 sm:gap-3 sm:px-4 sm:py-2 sm:text-sm">
                    <span className="font-semibold text-slate-500">{t("blog.product")}</span>
                    <input
                      value={searchProduct}
                      onChange={(event) => setSearchProduct(event.target.value)}
                      placeholder={t("blog.searchProductSlug")}
                      className="w-full bg-transparent text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 sm:text-sm"
                    />
                  </div>

                  <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 sm:min-h-12 sm:gap-3 sm:px-4 sm:py-2 sm:text-sm">
                    <span className="font-semibold text-slate-500">{t("blog.video")}</span>
                    <input
                      value={searchVideo}
                      onChange={(event) => setSearchVideo(event.target.value)}
                      placeholder={t("blog.searchVideoTitle")}
                      className="w-full bg-transparent text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 sm:text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {serviceLoading && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 sm:py-10 sm:text-sm">
                    {t("blog.loadingServices")}
                  </div>
                )}

                {!serviceLoading && filteredCards.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 sm:py-10 sm:text-sm">
                    {t("blog.noServicesFound")}
                  </div>
                )}

                {filteredCards.map((card) => (
                  <CourseCard
                    key={`${card.kind}-${card.id}`}
                    id={card.id}
                    title={card.title}
                    slug={card.slug}
                    image={card.image_url}
                    price={card.min_price}
                    originalPrice={card.min_original_price}
                    category={card.category}
                    stockQty={card.stock_qty}
                    isUnlimitedStock={card.is_unlimited_stock}
                    onViewDetails={(slug) =>
                      router.push(card.kind === "video" ? `/courses/${slug}` : `/product/${slug}`)
                    }
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
