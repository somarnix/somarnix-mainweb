// app/components/AddToCartModal.tsx
import { useMemo, useState } from "react";
import { X, ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { toast } from "sonner";

type ProductVariant = {
  id: number;
  label: string; // e.g. "10 Days", "1 Month", "1 Year"
  price: number;
  unitsPerQty?: number;
  isDisabled?: boolean;
};

type Product = {
  id: number;
  title: string;
};

type OrderField = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "number" | "email" | "tel";
};

interface AddToCartModalProps {
  product: Product;
  variants: ProductVariant[];
  orderFields?: OrderField[];
  onClose: () => void;
  // optional: call when added successfully
  onAdded?: () => void;
}

export function AddToCartModal({
  product,
  variants,
  orderFields,
  onClose,
  onAdded,
}: AddToCartModalProps) {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

  // ✅ safe first variant
  const firstVariant = variants?.[0] ?? null;
  const firstEnabledVariant = variants.find((v) => !v.isDisabled) ?? firstVariant;

  const [variantId, setVariantId] = useState<number | null>(firstEnabledVariant?.id ?? null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [orderValues, setOrderValues] = useState<Record<string, string>>({});

  const selectedVariant = useMemo(() => {
    if (!variantId) return null;
    return variants.find((v) => v.id === variantId) ?? null;
  }, [variantId, variants]);
  const selectedDisabled = !!selectedVariant?.isDisabled;

  const totalPrice = useMemo(() => {
    const price = selectedVariant?.price ?? 0;
    return price;
  }, [selectedVariant?.price]);

  const normalizedOrderFields = Array.isArray(orderFields) ? orderFields : [];

  const handleOrderValueChange = (key: string, value: string) => {
    setOrderValues((prev) => ({ ...prev, [key]: value }));
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
    if (selectedDisabled) {
      toast.error("Not enough stock for this option");
      return;
    }

    const missingRequired = normalizedOrderFields.filter((f) => {
      if (!f.required) return false;
      const value = orderValues[f.key];
      return !value || !value.trim();
    });
    if (missingRequired.length > 0) {
      toast.error("Please fill required order information");
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
          qty: 1,
          orderInfo: normalizedOrderFields.reduce<Record<string, string>>((acc, f) => {
            const value = orderValues[f.key];
            if (value && value.trim()) acc[f.key] = value.trim();
            return acc;
          }, {}),
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

            {normalizedOrderFields.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold">
                  {t("modal.orderInfo") || "Order Information"}
                </div>
                {normalizedOrderFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-600 mb-1">
                      {field.label}
                      {field.required ? (
                        <span className="text-red-500"> *</span>
                      ) : null}
                    </label>
                    <input
                      type={field.type || "text"}
                      value={orderValues[field.key] ?? ""}
                      onChange={(e) => handleOrderValueChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Variant Selection */}
            <div>
              <label className="block text-sm font-semibold mb-3">
                {t("modal.selectDuration") || "Select option"}
              </label>

              <div className="space-y-2">
                {variants.map((v) => {
                  const active = v.id === selectedVariant.id;
                  const disabled = !!v.isDisabled;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        if (!disabled) setVariantId(v.id);
                      }}
                      disabled={disabled}
                      className={`w-full p-4 rounded-lg border-2 flex justify-between transition ${
                        active
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                          : disabled
                            ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/50 opacity-60 cursor-not-allowed"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                      }`}
                    >
                      <span className="text-left">
                        <span className="block font-bold">
                          {v.label}
                          {disabled ? " (Not enough stock)" : ""}
                        </span>
                        <span className="block text-xs text-gray-500">
                          You get: {Math.max(1, Number(v.unitsPerQty ?? 1))} unit
                          {Math.max(1, Number(v.unitsPerQty ?? 1)) > 1 ? "s" : ""}
                        </span>
                      </span>
                      <span className="font-bold">{formatPrice(v.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">{t("modal.total") || "Total"}</div>
              <div className="text-xl font-bold text-blue-600">{formatPrice(totalPrice)}</div>
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
              disabled={submitting || selectedDisabled}
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
