// app/components/AddToCartModal.tsx
import { useMemo, useState } from "react";
import { X, Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { toast } from "sonner";

type ProductVariant = {
  id: number;
  label: string; // e.g. "10 Days", "1 Month", "1 Year"
  price: number;
};

type Product = {
  id: number;
  title: string;
};

interface AddToCartModalProps {
  product: Product;
  variants: ProductVariant[];
  onClose: () => void;
  // optional: call when added successfully
  onAdded?: () => void;
}

export function AddToCartModal({
  product,
  variants,
  onClose,
  onAdded,
}: AddToCartModalProps) {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

  // ✅ safe first variant
  const firstVariant = variants?.[0] ?? null;

  const [variantId, setVariantId] = useState<number | null>(firstVariant?.id ?? null);
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const selectedVariant = useMemo(() => {
    if (!variantId) return null;
    return variants.find((v) => v.id === variantId) ?? null;
  }, [variantId, variants]);

  const totalPrice = useMemo(() => {
    const price = selectedVariant?.price ?? 0;
    return price * quantity;
  }, [selectedVariant?.price, quantity]);

  const handleQuantityChange = (delta: number) => {
    setQuantity((q) => Math.max(1, q + delta));
  };

  const handleAddToCart = async () => {
    if (!product?.id) {
      toast.error("Missing product");
      return;
    }

    if (!selectedVariant?.id) {
      toast.error("Please select an option");
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);

      const res = await fetch("/api/cart/add-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariant.id,
          qty: quantity,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        detail?: string;
      };

      if (!res.ok) {
        toast.error(data?.error || data?.detail || "Add to cart failed");
        return;
      }

      toast.success("Added to cart");
      onAdded?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ if no variants, show friendly message (no crash)
  if (!firstVariant || !selectedVariant) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
              <h3 className="font-bold">{t("modal.addToCart") || "Add to Cart"}</h3>
              <button onClick={onClose} aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="text-gray-700 dark:text-gray-200 font-semibold">
                No options available
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                This product has no active variants.
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
              <Button onClick={onClose} className="w-full">
                {t("modal.close") || "Close"}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
            <h3 className="font-bold">{t("modal.addToCart") || "Add to Cart"}</h3>
            <button onClick={onClose} aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Product */}
            <div className="font-semibold text-gray-900 dark:text-white">
              {product.title}
            </div>

            {/* Variant Selection */}
            <div>
              <label className="block text-sm font-semibold mb-3">
                {t("modal.selectDuration") || "Select option"}
              </label>

              <div className="space-y-2">
                {variants.map((v) => {
                  const active = v.id === selectedVariant.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      className={`w-full p-4 rounded-lg border-2 flex justify-between transition ${
                        active
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                      }`}
                    >
                      <span className="font-bold">{v.label}</span>
                      <span className="font-bold">{formatPrice(v.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                {t("modal.quantity") || "Quantity"}
              </label>

              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || submitting}
                    className="p-2 disabled:opacity-50"
                    aria-label="Decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className="px-4 font-bold">{quantity}</span>

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={submitting}
                    className="p-2 disabled:opacity-50"
                    aria-label="Increase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 text-right">
                  <div className="text-xs text-gray-500">
                    {t("modal.total") || "Total"}
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatPrice(totalPrice)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              {t("modal.close") || "Close"}
            </Button>

            <Button
              onClick={handleAddToCart}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
              disabled={submitting}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {submitting ? "Adding..." : t("modal.confirm") || "Add"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
