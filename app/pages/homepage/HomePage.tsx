// app\pages\homepage\HomePage.tsx
"use client";

import { useEffect, useState } from "react";
import { Hero } from "../../components/Hero";
import { CourseCard } from "../../components/CourseCard";
import {
  TrendingUp,
  Award,
  Users,
  BookOpen,
  Play,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Countdown } from "../../components/Countdown";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { normalizeProductListResponse } from "../../../lib/products";

/* ================= TYPES ================= */

type DbProduct = {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  min_price: number | null;
  min_original_price: number | null;
  stock_qty: number | null;
  is_unlimited_stock: 0 | 1 | null;
  posted_by_username?: string | null;
  posted_by_avatar?: string | null;
  telegram_url?: string | null;
};

type PromotionItem = {
  item_type: "course" | "tool" | "product";
  item_id: number;
  variant_id: number | null;
  qty: number;
  item_title?: string | null;
  variant_title?: string | null;
  item_image?: string | null;
  variant_price?: number | null;
};

type PromotionCombo = {
  id: number;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  thumbnail_url: string | null;
  khqr: string | null;
  usdqr: string | null;
  start_at: string | null;
  end_at: string | null;
  items: PromotionItem[];
};

interface HomePageProps {
  onNavigate: (page: string) => void;
  onOpenProductDetail: (slug: string) => void;
}

/* ================= PAGE ================= */

export default function HomePage({ onNavigate, onOpenProductDetail }: HomePageProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [featured, setFeatured] = useState<DbProduct[]>([]);
  const [promotions, setPromotions] = useState<PromotionCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotionLoading, setPromotionLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [promotionSubmitting, setPromotionSubmitting] = useState<Record<number, boolean>>({});

  /* ---------- Load featured products ---------- */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch("/api/products?limit=6", { cache: "no-store" });
        const data = await res.json();

        if (mounted) {
          setFeatured(normalizeProductListResponse(data) as DbProduct[]);
        }
      } catch (err) {
        console.error("Failed to load products", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadPromotions = async () => {
      try {
        const res = await fetch("/api/promotions?limit=6", { cache: "no-store" });
        const data = await res.json();
        const list =
          data && typeof data === "object" && Array.isArray((data as { promotions?: unknown }).promotions)
            ? ((data as { promotions: PromotionCombo[] }).promotions ?? [])
            : [];
        if (mounted) setPromotions(list);
      } catch (err) {
        console.error("Failed to load promotions", err);
      } finally {
        if (mounted) setPromotionLoading(false);
      }
    };
    void loadPromotions();
    return () => {
      mounted = false;
    };
  }, []);

  const addPromotionToCart = async (promo: PromotionCombo, goCheckout: boolean) => {
    if (!user) {
      toast.error("Please login first");
      onNavigate("login");
      return;
    }

    const productLikeItems = promo.items.filter((it) => it.item_type !== "course");
    const courseItems = promo.items
      .filter((it) => it.item_type === "course")
      .map((it) => ({
        course_id: Number(it.item_id),
        plan_id: it.variant_id === null ? null : Number(it.variant_id),
        qty: Math.max(1, Number(it.qty ?? 1)),
        course_title: (it.item_title ?? "").trim() || null,
        plan_name: (it.variant_title ?? "").trim() || null,
        course_thumbnail: (it.item_image ?? "").trim() || null,
        plan_price: Number.isFinite(Number(it.variant_price)) ? Number(it.variant_price) : null,
      }));
    if (productLikeItems.length === 0) {
      toast.error("This promotion has no cart-compatible items.");
      return;
    }

    setPromotionSubmitting((prev) => ({ ...prev, [promo.id]: true }));
    try {
      const existingRes = await fetch("/api/cart", { cache: "no-store" });
      const existingData = await existingRes.json().catch(() => ({}));
      const existingItems = Array.isArray((existingData as { items?: unknown }).items)
        ? ((existingData as { items: Array<{ order_info_json?: string | null }> }).items ?? [])
        : [];
      const alreadyInCart = existingItems.some((it) => {
        if (!it?.order_info_json || typeof it.order_info_json !== "string") return false;
        try {
          const parsed = JSON.parse(it.order_info_json);
          const comboId = (parsed as Record<string, unknown>).promotion_combo_id;
          return String(comboId ?? "").trim() === String(promo.id);
        } catch {
          return false;
        }
      });
      if (alreadyInCart) {
        toast.warning("This combo is already in your cart.");
        onNavigate(goCheckout ? "checkout" : "cart");
        return;
      }

      for (const item of productLikeItems) {
        const res = await fetch("/api/cart/add-cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.item_id,
            variantId: item.variant_id,
            qty: Math.max(1, Number(item.qty ?? 1)),
            orderInfo: {
              promotion_combo_id: String(promo.id),
              promotion_combo_title: promo.title,
              promotion_combo_price: Number(promo.price),
              promotion_combo_original_price:
                promo.original_price === null ? null : Number(promo.original_price),
              promotion_combo_khqr: promo.khqr ?? null,
              promotion_combo_usdqr: promo.usdqr ?? null,
              promotion_course_items: courseItems,
            },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data && typeof data.error === "string" ? data.error : null) || "Failed to add combo item");
        }
      }

      toast.success("Promotion combo added to cart");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cart:changed"));
      }

      onNavigate(goCheckout ? "checkout" : "cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add promotion to cart");
    } finally {
      setPromotionSubmitting((prev) => ({ ...prev, [promo.id]: false }));
    }
  };

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* HERO */}
      <Hero onNavigate={onNavigate} />

      {/* ================= STATS ================= */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat icon={<Users />} value="500K+" label={t("stats.active")} />
            <Stat icon={<BookOpen />} value="10K+" label={t("stats.courses")} />
            <Stat icon={<Award />} value="15K+" label={t("stats.instructors")} />
            <Stat icon={<TrendingUp />} value="98%" label={t("stats.success")} />
          </div>
        </div>
      </section>

      {/* ================= FEATURED COURSES ================= */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("featured.title")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t("featured.description")}
            </p>
          </div>

          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
              {featured.map((p) => (
                <CourseCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  slug={p.slug}
                  image={p.image_url}
                  price={p.min_price}
                  originalPrice={p.min_original_price}
                  stockQty={p.stock_qty}
                  isUnlimitedStock={p.is_unlimited_stock}
                  sellerName={p.posted_by_username}
                  sellerLogoUrl={p.posted_by_avatar}
                  contactUrl={p.telegram_url}
                  onViewDetails={() => onOpenProductDetail(p.slug)}
                />
              ))}
            </div>
          )}

          <div className="text-center">
            <Button
              size="lg"
              onClick={() => onNavigate("courses")}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {t("featured.viewAll")}
            </Button>
          </div>
        </div>
      </section>

      {/* ================= PROMOTIONS ================= */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <Countdown />

          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Promotions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Course + Tool + Product combo deals
            </p>
          </div>

          {promotionLoading ? (
            <div className="text-center text-gray-500">Loading promotions...</div>
          ) : promotions.length === 0 ? (
            <div className="text-center text-gray-500">No active promotions.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="rounded-xl border bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
                >
                  <img
                    src={promo.thumbnail_url || "/placeholder.png"}
                    alt={promo.title}
                    className="w-full h-44 object-cover"
                  />
                  <div className="p-4 space-y-2">
                    <div className="font-bold text-gray-900 dark:text-white">{promo.title}</div>
                    {promo.description ? (
                      <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {promo.description}
                      </div>
                    ) : null}
                    <div className="text-xs text-gray-500">
                      Items: {promo.items?.length ?? 0}
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="text-xl font-bold text-blue-600">
                        ${Number(promo.price).toFixed(2)}
                      </div>
                      {promo.original_price && promo.original_price > promo.price ? (
                        <div className="text-sm text-gray-400 line-through">
                          ${Number(promo.original_price).toFixed(2)}
                        </div>
                      ) : null}
                    </div>
                    {promo.end_at ? (
                      <div className="text-xs font-semibold text-rose-600">
                        Ends in: {formatCountdown(promo.end_at, nowMs)}
                      </div>
                    ) : null}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={promotionSubmitting[promo.id]}
                        onClick={() => {
                          void addPromotionToCart(promo, false);
                        }}
                      >
                        {promotionSubmitting[promo.id] ? "Adding..." : "Add to Cart"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={promotionSubmitting[promo.id]}
                        onClick={() => {
                          void addPromotionToCart(promo, true);
                        }}
                      >
                        Checkout
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= WHY CHOOSE US ================= */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("why.title")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t("why.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <WhyCard
              icon={<Play />}
              title={t("why.pace.title")}
              desc={t("why.pace.description")}
            />
            <WhyCard
              icon={<Award />}
              title={t("why.certificate.title")}
              desc={t("why.certificate.description")}
            />
            <WhyCard
              icon={<Users />}
              title={t("why.expert.title")}
              desc={t("why.expert.description")}
            />
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t("cta.description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => onNavigate("register")}
              className="bg-white text-blue-600"
            >
              {t("cta.getStarted")}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate("courses")}
              className="border-2 border-white text-white"
            >
              {t("cta.browse")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatCountdown(endAt: string, nowMs: number | null): string {
  const endMs = new Date(String(endAt).replace(" ", "T")).getTime();
  if (!Number.isFinite(endMs)) return "-";
  const diff = Math.max(0, endMs - (nowMs ?? 0));
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/* ================= UI HELPERS ================= */

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex w-16 h-16 items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full mb-4 text-blue-600 dark:text-blue-400">
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      <div className="text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}

function WhyCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 p-8 rounded-xl">
      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 text-white">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{desc}</p>
    </div>
  );
}
