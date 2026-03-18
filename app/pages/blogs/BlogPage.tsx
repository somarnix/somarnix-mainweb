"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CourseCard } from "../../components/CourseCard";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { useAuth } from "../../contexts/AuthContext";
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
    avatarUrl: string | null;
    avatarBorderUrl?: string | null;
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

const serviceTabs = ["AI", "Programs", "Games", "Tools", "Courses"] as const;
type ServiceTab = (typeof serviceTabs)[number];

const categoryMap: Record<ServiceTab, string> = {
  AI: "ai",
  Programs: "program",
  Games: "game",
  Tools: "tools",
  Courses: "course",
};

function formatMemberSince(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
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

type BlogPageProps = {
  initialSellerId?: string | null;
};

export function BlogPage({ initialSellerId }: BlogPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAppShell = useAppShellMode();

  const [sellerId, setSellerId] = React.useState<number>(1);
  const [activeServiceTab, setActiveServiceTab] = React.useState<ServiceTab>("AI");
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

  React.useEffect(() => {
    const fromRoute = Number(initialSellerId ?? 0);
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      setSellerId(fromRoute);
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

    setSellerId(1);
  }, [initialSellerId, searchParams, user?.id]);

  React.useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const res = await fetch(`/api/blog/profile?sellerId=${sellerId}`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as BlogProfileResponse;
        if (!res.ok) throw new Error("Failed to load profile");
        if (!active) return;
        setProfile(data);
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
  }, [sellerId]);

  React.useEffect(() => {
    let active = true;

    const loadServices = async () => {
      try {
        setServiceLoading(true);
        const category = categoryMap[activeServiceTab];

        if (activeServiceTab === "Courses") {
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

  const sellerName = profileLoading ? "Loading..." : profile?.seller.name || "Seller";
  const sellerMeta = `${formatCompact(profile?.stats.followers ?? 0)} followers · ${formatCompact(
    profile?.stats.following ?? 0
  )} following`;
  const sellerBio = profile?.seller.bio?.trim() || "";

  return (
    <div
      className={`min-h-full bg-gradient-to-br from-amber-50 via-slate-100 to-emerald-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 ${
        isAppShell ? "pb-8 pt-2 sm:pt-4" : ""
      }`}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
        <section className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:mb-8">
          <div className="h-20 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 sm:h-24" />

          <div className="px-4 pb-5 pt-0 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="-mt-10 shrink-0 rounded-[1.75rem] bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-700 sm:-mt-12 sm:p-2">
                    <ProfileAvatar
                      src={profile?.seller.avatarUrl}
                      alt={sellerName}
                      fallback={avatarInitials}
                      borderUrl={profile?.seller.avatarBorderUrl}
                      className="h-20 w-20 sm:h-24 sm:w-24"
                      insetClassName={profile?.seller.avatarBorderUrl ? "inset-[14.5%]" : undefined}
                      contentClassName="border-4 border-white shadow-lg dark:border-slate-900"
                      fallbackClassName="text-xl sm:text-2xl"
                    />
                  </div>

                  <div className="min-w-0 pt-2 sm:pt-0">
                    <div className="truncate text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      {sellerName}
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                      {sellerMeta}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                  <button
                    onClick={handleToggleFollow}
                    disabled={!profile?.viewer.canFollow || followLoading}
                    className={`min-h-11 rounded-full px-5 py-2 text-sm font-semibold transition ${
                      profile?.viewer.isFollowing
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-60`}
                  >
                    {followLoading
                      ? "Please wait..."
                      : profile?.viewer.isFollowing
                        ? "Following"
                        : "Follow"}
                  </button>
                  <button className="min-h-11 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                    Message
                  </button>
                </div>
              </div>

              {sellerBio ? (
                <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {sellerBio}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCompact(profile?.stats.followers ?? 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Followers</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCompact(profile?.stats.following ?? 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Following</div>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span>Member since</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatMemberSince(profile?.seller.memberSince ?? null)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span>Successful delivery</span>
                  <span className="font-semibold text-emerald-600">
                    {(profile?.stats.successfulDelivery ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span>Total lifetime orders</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCompact(profile?.stats.totalLifetimeOrders ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>All time rating</span>
                  <span className="font-semibold text-emerald-600">
                    {(profile?.stats.allTimeRating ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-900">
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                Description
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {sellerBio}
              </p>
            </section>
          </aside>

          <section className="space-y-6">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-col gap-1">
                <div className="text-base font-semibold text-slate-900 dark:text-white">
                  All services
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Browse everything this seller has published across products and courses.
                </div>
              </div>

              <div className="-mx-1 mt-5 overflow-x-auto pb-1">
                <div className="flex min-w-max items-center gap-2 px-1 text-sm">
                  {serviceTabs.map((tab) => {
                    const active = tab === activeServiceTab;

                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveServiceTab(tab)}
                        className={
                          active
                            ? "rounded-full bg-red-50 px-4 py-2 font-semibold text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20"
                            : "rounded-full px-4 py-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                        }
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 shadow-inner dark:border-slate-700 dark:bg-slate-950/50">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                    Find
                  </span>
                  <input
                    value={searchProduct}
                    onChange={(event) => setSearchProduct(event.target.value)}
                    placeholder={`Find all brands in ${activeServiceTab}`}
                    className="w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
                  />
                </div>

                <div className="flex min-h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200">
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
                    className="w-full bg-transparent text-sm text-slate-600 focus:outline-none dark:text-slate-200"
                  >
                    <option value="all">All</option>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                    <option value="instock">In stock</option>
                    <option value="outstock">Out stock</option>
                  </select>
                </div>
              </div>

              {activeServiceTab === "Courses" && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
                    <span className="font-semibold text-slate-500">Product</span>
                    <input
                      value={searchProduct}
                      onChange={(event) => setSearchProduct(event.target.value)}
                      placeholder="Search product slug..."
                      className="w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
                    />
                  </div>

                  <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
                    <span className="font-semibold text-slate-500">Video</span>
                    <input
                      value={searchVideo}
                      onChange={(event) => setSearchVideo(event.target.value)}
                      placeholder="Search video title..."
                      className="w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {serviceLoading && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
                    Loading services...
                  </div>
                )}

                {!serviceLoading && filteredCards.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
                    No services found.
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
