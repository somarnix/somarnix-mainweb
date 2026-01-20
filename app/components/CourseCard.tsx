// app/components/CourseCard.tsx
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";

export interface CourseCardProps {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  price: number | null;
  originalPrice: number | null;
  category?: string;
  onViewDetails?: (slug: string) => void;
}

export function CourseCard({
  id,
  title,
  slug,
  image,
  price,
  originalPrice,
  category,
  onViewDetails,
}: CourseCardProps) {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

  const discount =
    price && originalPrice
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer"
      onClick={() => onViewDetails?.(slug)}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={image ?? "/placeholder.png"}
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
        />

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
          <div className="absolute top-3 right-3">
            <Badge variant="secondary">{category}</Badge>
          </div>
        )}
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
        </div>

        {/* CTA */}
        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.(slug);
          }}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {t("course.view")}
        </Button>
      </div>
    </div>
  );
}
