// app/components/CourseCard.tsx
import { Star, ShoppingCart, AlertTriangle, Play } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { FavoriteToggleButton } from "./FavoriteToggleButton";
import { ShareButton } from "./ShareButton";
import type { FavoriteItemType } from "../lib/favorites";

export interface CourseCardProps {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  price: number | null;
  originalPrice: number | null;
  category?: string;
  stockQty?: number | null;
  isUnlimitedStock?: 0 | 1 | boolean | null;
  onViewDetails?: (slug: string) => void;
  favoriteType?: FavoriteItemType;
  favoriteLabel?: string;
  ctaLabel?: string;
  ctaIcon?: "cart" | "play";
  shareHref?: string;
}

export function CourseCard({
  title,
  slug,
  image,
  price,
  originalPrice,
  category,
  stockQty,
  isUnlimitedStock,
  onViewDetails,
  favoriteType = "product",
  favoriteLabel,
  ctaLabel,
  ctaIcon = "cart",
  shareHref,
}: CourseCardProps) {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const detailHref =
    shareHref ??
    (favoriteType === "video-course"
      ? `/courses/${encodeURIComponent(slug)}`
      : `/product/${encodeURIComponent(slug)}`);

  const discount =
    price && originalPrice
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  const isOutOfStock =
    !isUnlimitedStock && typeof stockQty === "number" ? stockQty <= 0 : false;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer"
      onClick={() => onViewDetails?.(slug)}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <ShareButton
          path={detailHref}
          title={title}
          text={category ? `${title} - ${category}` : title}
          className="absolute right-3 top-14 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/92 text-slate-500 shadow-[0_12px_26px_rgba(15,23,42,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:text-blue-600"
        />
        <FavoriteToggleButton
          item={{
            type: favoriteType,
            title,
            slug,
            image,
            price,
            category,
            href: detailHref,
            label: favoriteLabel ?? category ?? null,
          }}
        />
        <img
          src={image ?? "/placeholder.png"}
          alt={title}
          className={`w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300 ${
            isOutOfStock ? "grayscale opacity-35" : ""
          }`}
        />
        {isOutOfStock && (
          <div className="pointer-events-none absolute inset-0 bg-black/50" />
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-red-500 text-white">
              {discount}% OFF
            </Badge>
          </div>
        )}

        {/* Category */}
        {category && (
          <div className="absolute right-14 top-3">
            <Badge variant="secondary">{category}</Badge>
          </div>
        )}

        <div className="absolute bottom-3 left-3">
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-900/80 px-3 py-1 text-xs font-semibold text-amber-50 shadow-sm backdrop-blur-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              Sold out
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
              In stock
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h3>

        {/* Rating (static placeholder – safe for DB) */}
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span>4.8</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {price ? formatPrice(price) : t("course.free")}
          </span>
          {originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        {isOutOfStock && (
          <span className="ml-auto text-xs font-semibold text-rose-600 dark:text-rose-300">
            Restocking
          </span>
        )}
        </div>

        {/* CTA */}
        <Button
          className={`w-full ${
            isOutOfStock
              ? "rounded-full bg-red-600 py-3 text-white shadow-md shadow-red-500/30 hover:bg-red-700"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.(slug);
          }}
          disabled={isOutOfStock}
        >
          {isOutOfStock ? (
            <span className="uppercase tracking-[0.25em] text-xs font-semibold">
              Out of stock
            </span>
          ) : (
            <>
              {ctaIcon === "play" ? (
                <Play className="w-4 h-4 mr-2" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2" />
              )}
              {ctaLabel ?? t("detail.buyNow")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
