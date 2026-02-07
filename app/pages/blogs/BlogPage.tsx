"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CourseCard } from "../../components/CourseCard";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

export function BlogPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  type ServiceProduct = {
    id: number;
    title: string;
    slug: string;
    image_url: string | null;
    category: string;
    min_price: number | null;
    min_original_price: number | null;
    stock_qty: number;
    is_unlimited_stock: 0 | 1;
    variant_count: number;
    kind: "product" | "video";
  };

  type VideoCourseRow = {
    id: number;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    min_price: number | string | null;
    is_active: number;
  };

  const featuredOffers = [
    { title: "Bolt.new Pro 1 Year Account (Global)", sold: "106", price: "35.00" },
    { title: "SuperGroK 1 Year Private Account (Global)", sold: "37", price: "99.99" },
    { title: "Lovable AI Pro Subscription 1 Year - Private (Global)", sold: "25", price: "58.00" },
    { title: "N8N Starter Subscription 1 Year - Private (Global)", sold: "21", price: "29.99" },
  ];

  const serviceTabs = ["AI", "Programs", "Games", "Tools", "Courses"];
  const [activeServiceTab, setActiveServiceTab] = React.useState("AI");
  const [serviceCards, setServiceCards] = React.useState<ServiceProduct[]>([]);
  const [serviceLoading, setServiceLoading] = React.useState(false);
  const [searchProduct, setSearchProduct] = React.useState("");
  const [searchVideo, setSearchVideo] = React.useState("");
  const [serviceFilter, setServiceFilter] = React.useState<
    "all" | "free" | "paid" | "instock" | "outstock"
  >("all");

  const categoryMap: Record<string, string> = {
    AI: "ai",
    Programs: "program",
    Games: "game",
    Tools: "tools",
    Courses: "course",
  };

  React.useEffect(() => {
    const loadServices = async () => {
      try {
        setServiceLoading(true);
        const category = categoryMap[activeServiceTab] ?? "course";
        const sellerId = user?.role === "admin" && user?.id ? user.id : 1;

        if (activeServiceTab === "Courses") {
          const params = new URLSearchParams({
            category,
            limit: "100",
            posted_by: String(sellerId),
          });
          const [productsRes, videoRes] = await Promise.all([
            fetch(`/api/products?${params.toString()}`),
            fetch("/api/video-courses", { cache: "no-store" }),
          ]);
          const productData = productsRes.ok
            ? ((await productsRes.json()) as ServiceProduct[])
            : [];
          const videoData = videoRes.ok
            ? ((await videoRes.json()) as { courses?: VideoCourseRow[] })
            : { courses: [] };

          const products = (Array.isArray(productData) ? productData : []).map(
            (p) => ({ ...p, kind: "product" as const })
          );
          const videos = (videoData.courses ?? []).map((v) => ({
            id: v.id,
            title: v.title,
            slug: v.slug,
            image_url: v.thumbnail_url,
            category: "course",
            min_price: v.min_price === null ? null : Number(v.min_price),
            min_original_price: null,
            stock_qty: 1,
            is_unlimited_stock: 1 as const,
            variant_count: 1,
            kind: "video" as const,
          }));

          setServiceCards([...products, ...videos]);
        } else {
          const params = new URLSearchParams({
            category,
            limit: "100",
            posted_by: String(sellerId),
          });
          const res = await fetch(`/api/products?${params.toString()}`);
          if (!res.ok) return;
          const data = (await res.json()) as ServiceProduct[];
          const normalized = (Array.isArray(data) ? data : []).map((p) => ({
            ...p,
            kind: "product" as const,
          }));
          setServiceCards(normalized);
        }
      } catch {
        setServiceCards([]);
      } finally {
        setServiceLoading(false);
      }
    };

    loadServices();
  }, [activeServiceTab, user?.id]);

  const filteredCards = React.useMemo(() => {
    const query =
      activeServiceTab === "Courses"
        ? searchProduct.trim().toLowerCase()
        : searchProduct.trim().toLowerCase();
    const videoQuery = searchVideo.trim().toLowerCase();

    const applyFilter = (card: ServiceProduct) => {
      const price = typeof card.min_price === "number" ? card.min_price : 0;
      const isFree = !price || price <= 0;
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

    if (activeServiceTab === "Courses") {
      return serviceCards.filter((card) => {
        if (card.kind === "video") {
          const matches =
            videoQuery ? card.title.toLowerCase().includes(videoQuery) : true;
          return matches && applyFilter(card);
        }
        const matches = query ? card.title.toLowerCase().includes(query) : true;
        return matches && applyFilter(card);
      });
    }

    const base = query
      ? serviceCards.filter((card) =>
          card.title.toLowerCase().includes(query)
        )
      : serviceCards;
    return base.filter(applyFilter);
  }, [activeServiceTab, searchProduct, searchVideo, serviceCards, serviceFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-slate-100 to-emerald-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-7xl mx-auto px-4 py-10 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {/* <div
            className="h-36 w-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&auto=format&fit=crop&q=80')",
            }}
          /> */}
          <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="-mt-16">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "User avatar"}
                    className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md dark:border-slate-900"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full border-4 border-white bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-2xl font-semibold shadow-md dark:border-slate-900">
                    {(user?.firstName || user?.username || user?.email || "U")
                      .trim()
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Roth-រិទ្ធ
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  64 followers • 2 following
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">
                Following
              </button>
              <button className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                Message
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left column */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900">

              <div className="mt-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span>Member since</span>
                  <span className="font-semibold text-slate-900 dark:text-white">May, 2025</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span>Successful delivery</span>
                  <span className="font-semibold text-emerald-600">99.86%</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span>Total lifetime orders</span>
                  <span className="font-semibold text-slate-900 dark:text-white">4.8k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>All time rating</span>
                  <span className="font-semibold text-emerald-600">99.16%</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-slate-100 py-3 dark:border-slate-800">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">485</div>
                  <div className="text-xs text-slate-500">Followers</div>
                </div>
                <div className="rounded-xl border border-slate-100 py-3 dark:border-slate-800">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">0</div>
                  <div className="text-xs text-slate-500">Following</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Description</div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                Legitimate private account and subscriptions at fair prices.
                Verified. Reliable. Trusted.
              </p>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900 text-white px-6 py-4 shadow-sm">
              <div className="text-xs font-semibold tracking-[0.18em] text-slate-300">
                WORKING TIMEZONE : UTC (GMT +0)
              </div>
              <div className="mt-1 text-xs text-slate-300">
                Active Hours: 01:30 – 16:30 UTC (Daily)
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                All services
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                {serviceTabs.map((tab) => {
                  const active = tab === activeServiceTab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveServiceTab(tab)}
                      className={
                        active
                          ? "rounded-full bg-red-50 px-3 py-1 font-semibold text-red-600"
                          : "rounded-full px-3 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 shadow-inner">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-500">
                    Find
                  </span>
                  <input
                    value={searchProduct}
                    onChange={(event) => setSearchProduct(event.target.value)}
                    placeholder={`Find all brands in ${activeServiceTab}`}
                    className="w-full bg-transparent text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
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
                    className="w-full bg-transparent text-xs text-slate-600 focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                    <option value="instock">In stock</option>
                    <option value="outstock">Out stock</option>
                  </select>
                  <span className="text-slate-400">▾</span>
                </div>
              </div>

              {activeServiceTab === "Courses" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-500">Product</span>
                    <input
                      value={searchProduct}
                      onChange={(event) => setSearchProduct(event.target.value)}
                      placeholder="Search product slug..."
                      className="w-full bg-transparent text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-500">Video</span>
                    <input
                      value={searchVideo}
                      onChange={(event) => setSearchVideo(event.target.value)}
                      placeholder="Search video title..."
                      className="w-full bg-transparent text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
                {serviceLoading && (
                  <div className="col-span-full text-xs text-slate-500">
                    Loading services...
                  </div>
                )}
                {!serviceLoading && filteredCards.length === 0 && (
                  <div className="col-span-full text-xs text-slate-500">
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
                      router.push(
                        card.kind === "video" ? `/courses/${slug}` : `/product/${slug}`
                      )
                    }
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
