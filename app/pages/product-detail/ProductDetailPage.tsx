// app/pages/product-detail/ProductDetailPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ShoppingCart,
  Star,
  Truck,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useCurrency } from "@/app/contexts/CurrencyContext";
import { AddToCartModal } from "@/app/components/AddToCartModal";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";

/* ================= TYPES ================= */

type ProductLevel = "beginner" | "advanced" | "pro";

type Variant = {
  id: number;
  duration_label?: string | null;
  duration_note?: string | null;
  duration_days?: number | null;

  device_label?: string | null;
  device_limit?: number | null;
  is_unlimited_device?: 0 | 1 | null;

  original_price?: number | null;
  price?: number | null;
};

type ProductDetail = {
  id: number;
  category_id?: number;
  title: string;
  slug: string;
  category?: string | null;

  description?: string | null;
  level?: ProductLevel | null;

  image_url?: string | null;

  stock_qty?: number | null;
  is_unlimited_stock?: 0 | 1 | null;

  avg_rating?: number | null;
  rating_count?: number;
  buyers_count?: number;

  min_price?: number | null;
  min_original_price?: number | null;
};

type ApiResponse = {
  product: ProductDetail;
  variants: Variant[];
};

type RelatedProduct = {
  id: number;
  title: string;
  slug: string;
  image_url?: string | null;
  category?: string | null;
  avg_rating?: number | null;
  rating_count?: number;
  buyers_count?: number;
  min_price?: number | null;
  min_original_price?: number | null;
};

function toArrayProducts(data: unknown): RelatedProduct[] {
  if (Array.isArray(data)) return data as RelatedProduct[];
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.products)) return d.products as RelatedProduct[];
  }
  return [];
}

/* ================= PAGE ================= */

export default function ProductDetailPage({
  slug,
  onBack,
  onOpenProduct,
  onCartChanged,
}: {
  slug: string;
  onBack: () => void;
  onOpenProduct?: (slug: string) => void;
  onCartChanged?: () => void;
}) {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

  /* ================= STATE ================= */
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  // ✅ modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // related
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState<boolean>(false);

  /* ================= SELECTED VARIANT ================= */
  const selectedVariant = useMemo(() => {
    if (selectedVariantId === null) return null;
    return variants.find((v) => v.id === selectedVariantId) ?? null;
  }, [selectedVariantId, variants]);

  const mainPrice = selectedVariant?.price ?? product?.min_price ?? null;
  const mainOriginal =
    selectedVariant?.original_price ?? product?.min_original_price ?? null;

  const discountPercent = useMemo(() => {
    if (!mainPrice || !mainOriginal || mainOriginal <= 0) return 0;
    const pct = Math.round(((mainOriginal - mainPrice) / mainOriginal) * 100);
    return pct > 0 ? pct : 0;
  }, [mainPrice, mainOriginal]);

  /* ================= MODAL VARIANTS ================= */
  const modalVariants = useMemo(() => {
    return (variants ?? [])
      .filter((v) => typeof v.id === "number" && v.id > 0)
      .map((v) => ({
        id: Number(v.id),
        label: v.duration_label || v.device_label || "Option",
        price: Number(v.price ?? 0),
      }))
      .filter((v) => Number.isFinite(v.price));
  }, [variants]);

  // Load product detail
  useEffect(() => {
    let alive = true;

    setLoading(true);
    setNotFound(false);
    setProduct(null);
    setVariants([]);
    setSelectedVariantId(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/products/${slug}`);

        if (!res.ok) {
          if (res.status === 404) {
            if (!alive) return;
            setNotFound(true);
            return;
          }
          const msg = await res.text().catch(() => "");
          throw new Error(msg || "FAILED");
        }

        const data = (await res.json()) as ApiResponse;
        if (!alive) return;

        setProduct(data.product ?? null);

        const v = Array.isArray(data.variants) ? data.variants : [];
        setVariants(v);

        const first = v[0];
        setSelectedVariantId(first?.id ?? null);
      } catch (err: unknown) {
        if (!alive) return;

        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : "";

        if (message.toLowerCase().includes("not found")) setNotFound(true);

        setProduct(null);
        setVariants([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [slug]);

  // Load related products
  useEffect(() => {
    if (!product?.category) {
      setRelated([]);
      return;
    }

    let alive = true;
    setRelatedLoading(true);
    setRelated([]);

    const loadRelated = async () => {
      try {
        const res = await fetch(
          `/api/products?category=${encodeURIComponent(product.category as string)}`
        );
        if (!res.ok) throw new Error("FAILED_RELATED");

        const data = (await res.json()) as unknown;
        const list = toArrayProducts(data);

        if (!alive) return;

        const filtered = list
          .filter((p) => p?.slug && p.slug !== product.slug)
          .slice(0, 8);

        setRelated(filtered);
      } catch {
        if (!alive) return;
        setRelated([]);
      } finally {
        if (!alive) return;
        setRelatedLoading(false);
      }
    };

    loadRelated();

    return () => {
      alive = false;
    };
  }, [product?.category, product?.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto text-gray-500">Loading...</div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back") || "Back"}
          </Button>

          <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-800 p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Product not found
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              The product you&apos;re looking for doesn&apos;t exist (or was removed).
            </p>
          </div>
        </div>
      </div>
    );
  }

  const imageSrc =
    product.image_url ||
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=60";

  const stockText = product.is_unlimited_stock
    ? "Unlimited stock"
    : typeof product.stock_qty === "number"
    ? `${product.stock_qty} in stock`
    : "In stock";

  const featureList: string[] = [
    ...(product.level ? [`Level: ${product.level}`] : []),
    "Instant access after payment",
    "Secure checkout",
    "Support included",
  ];

  const openProduct = (s: string) => {
    if (onOpenProduct) {
      onOpenProduct(s);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.location.href = `/products/${s}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ✅ Modal should be near top level for overlay */}
      {showAddModal && (
        <AddToCartModal
          product={{ id: product.id, title: product.title }}
          variants={modalVariants}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            onCartChanged?.();           // ✅ refresh header cart badge
            setShowAddModal(false);      // ✅ close modal (optional)
          }}
        />
      )}

      {/* ================= TOP BAR ================= */}
      <div className="border-b bg-white/70 dark:bg-gray-900/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back") || "Back"}
          </Button>

          <div className="flex items-center gap-2">
            {product.category && (
              <Badge variant="secondary" className="rounded-full">
                {product.category}
              </Badge>
            )}
            {!!discountPercent && (
              <Badge className="rounded-full bg-red-500 text-white">
                {discountPercent}% OFF
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ================= MAIN ================= */}
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          {/* LEFT */}
          <div className="w-full lg:flex-1 min-w-0">
            <div className="mb-5">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {product.title}
              </h1>
            </div>

            <div className="rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
              <div className="relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img
                  src={imageSrc}
                  alt={product.title || "Product image"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {product.description && (
                <div className="p-5">
                  <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <aside className="w-full lg:w-95 xl:w-105 lg:shrink-0">
            <div className="mb-5">
              <div className="flex flex-wrap gap-2 mt-4">
                {product.level && (
                  <Badge className="rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                    {product.level}
                  </Badge>
                )}
                {product.category && (
                  <Badge variant="outline" className="rounded-full">
                    {product.category}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">
                    {(product.avg_rating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-gray-400">
                    ({product.rating_count ?? 0})
                  </span>
                </div>

                <div className="text-gray-600 dark:text-gray-300">
                  {product.buyers_count ?? 0} buyers
                </div>

                <div className="text-gray-600 dark:text-gray-300">{stockText}</div>
              </div>
            </div>

            <div className="lg:sticky lg:top-24 rounded-2xl border bg-white dark:bg-gray-900 shadow-sm p-6">
              <div className="flex items-baseline gap-3 mb-4">
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  {mainPrice ? formatPrice(mainPrice) : t("course.free") || "Free"}
                </div>

                {!!mainOriginal && mainPrice && mainOriginal > mainPrice && (
                  <div className="text-gray-400 line-through">
                    {formatPrice(mainOriginal)}
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setShowAddModal(true)}
                disabled={modalVariants.length === 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t("course.buyNow") || "Add to Cart"}
              </Button>

              {/* variants */}
              {variants.length > 0 && (
                <div className="mt-6">
                  <div className="font-semibold text-gray-900 dark:text-white mb-2">
                    Choose an option
                  </div>

                  <div className="space-y-2">
                    {variants.map((v) => {
                      const active = v.id === selectedVariantId;

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`w-full text-left rounded-xl border p-4 transition ${
                            active
                              ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-950"
                              : "hover:bg-gray-50 dark:hover:bg-gray-950"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {v.duration_label || "Option"}{" "}
                                {v.duration_days ? `(${v.duration_days} days)` : ""}
                              </div>

                              {(v.duration_note || v.device_label) && (
                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                  {v.duration_note || v.device_label}
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <div className="font-bold text-gray-900 dark:text-white">
                                {v.price ? formatPrice(v.price) : "-"}
                              </div>

                              {!!v.original_price &&
                                v.price &&
                                v.original_price > v.price && (
                                  <div className="text-xs text-gray-400 line-through">
                                    {formatPrice(v.original_price)}
                                  </div>
                                )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* mini trust row */}
              <div className="mt-6 grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="rounded-xl border p-2 text-center bg-gray-50 dark:bg-gray-950">
                  <Truck className="w-4 h-4 mx-auto mb-1" />
                  Delivery
                </div>
                <div className="rounded-xl border p-2 text-center bg-gray-50 dark:bg-gray-950">
                  <RotateCcw className="w-4 h-4 mx-auto mb-1" />
                  Return
                </div>
                <div className="rounded-xl border p-2 text-center bg-gray-50 dark:bg-gray-950">
                  <ShieldCheck className="w-4 h-4 mx-auto mb-1" />
                  Secure
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* TABS */}
        <div className="mt-8">
          <Tabs defaultValue="overview">
            <TabsList className="flex bg-white dark:bg-gray-900 border rounded-xl p-1">
              <TabsTrigger value="overview" className="flex-1">
                Overview
              </TabsTrigger>
              <TabsTrigger value="options" className="flex-1">
                Options
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1">
                Reviews
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent
              value="overview"
              className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                About This Product
              </h2>

              <div className="mt-3">
                {product.description ? (
                  <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                    {product.description}
                  </p>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300">
                    No description yet.
                  </p>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Key Features / Specifications
                </h3>

                <ul className="mt-3 space-y-3">
                  {featureList.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-gray-700 dark:text-gray-200"
                    >
                      <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            {/* OPTIONS */}
            <TabsContent
              value="options"
              className="mt-4 w-full rounded-xl border bg-white dark:bg-gray-900 p-6"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-start gap-3 border rounded-xl p-4 flex-1">
                  <Truck className="w-5 h-5" />
                  <div>
                    <div className="font-semibold">Delivery</div>
                    <div className="text-sm">Instant / 1-3 days</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 border rounded-xl p-4 flex-1">
                  <RotateCcw className="w-5 h-5" />
                  <div>
                    <div className="font-semibold">Return</div>
                    <div className="text-sm">7-30 days</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 border rounded-xl p-4 flex-1">
                  <ShieldCheck className="w-5 h-5" />
                  <div>
                    <div className="font-semibold">Secure</div>
                    <div className="text-sm">Protected</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* REVIEWS */}
            <TabsContent
              value="reviews"
              className="mt-4 w-full rounded-xl border bg-white dark:bg-gray-900 p-6"
            >
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-full border rounded-xl p-4 bg-gray-50 dark:bg-gray-950"
                  >
                    <div className="flex justify-between">
                      <div className="font-semibold">User {i}</div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        5.0
                      </div>
                    </div>
                    <p className="mt-2 text-sm">This is a sample review.</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* RELATED PRODUCTS (FULL WIDTH) */}
        <div className="mt-10">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold">Related Products</h2>
            {relatedLoading && (
              <div className="text-sm text-gray-500">Loading related...</div>
            )}
          </div>

          <div className="flex gap-4 overflow-x-auto">
            {related.map((p) => (
              <button
                key={p.id}
                onClick={() => openProduct(p.slug)}
                className="min-w-[220px] border rounded-xl overflow-hidden bg-white dark:bg-gray-900"
              >
                <img
                  src={p.image_url || imageSrc}
                  className="w-full h-36 object-cover"
                  alt={p.title}
                  loading="lazy"
                />
                <div className="p-3 text-left">
                  <div className="font-semibold line-clamp-2">{p.title}</div>
                  <div className="text-sm mt-1">
                    {p.min_price ? formatPrice(p.min_price) : "Free"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
