import { useEffect, useState } from "react";
import { Trash2, ShoppingBag, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { toast } from "sonner";

type DbCartItem = {
  cart_item_id: number;
  product_id: number;
  variant_id: number | null;

  title: string;
  image_url: string | null;

  qty: number;
  unit_price: number;
  line_total: number;

  duration_label: string | null;
  device_label: string | null;
  khqr?: string | null;
  usdqr?: string | null;
};

interface CartPageProps {
  onNavigate: (page: string) => void;
  selectedCartItemId: number | null;
  onSelectCartItem: (id: number | null) => void;
}

export function CartPage({
  onNavigate,
  selectedCartItemId,
  onSelectCartItem,
}: CartPageProps) {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { formatPrice } = useCurrency();

  const [items, setItems] = useState<DbCartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // -----------------------
  // Load DB cart
  // -----------------------
  const loadCart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (loading) return;
    if (items.length === 0) {
      onSelectCartItem(null);
      return;
    }

    const exists = items.some(
      (it) => it.cart_item_id === selectedCartItemId
    );

    if (!exists) {
      onSelectCartItem(items[0].cart_item_id);
    }
  }, [items, loading, onSelectCartItem, selectedCartItemId]);

  // -----------------------
  // Remove item
  // -----------------------
  const removeItem = async (cartItemId: number) => {
    await fetch("/api/cart/remove-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartItemId }),
    });

    toast.success(
      language === "km" ? "បានលុបចេញពីកន្ត្រក" : "Item removed"
    );
    loadCart();
  };

  // -----------------------
  // Totals
  // -----------------------
  const selectedItem = selectedCartItemId
    ? items.find((it) => it.cart_item_id === selectedCartItemId) ?? null
    : null;
  const subtotal = selectedItem?.line_total ?? 0;
  const tax = 0;
  const total = subtotal + tax;
  const taxDisplay = tax === 0 ? (language === "km" ? "ឥតគិតថ្លៃ" : "Free") : formatPrice(tax);

  // -----------------------
  // Checkout
  // -----------------------
  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error(language === "km" ? "កន្ត្រកទទេ" : "Your cart is empty!");
      return;
    }

    if (!selectedItem) {
      toast.error(
        language === "km"
          ? "សូមជ្រើសរើសមួយមុខទំនិញដើម្បីទូទាត់"
          : "Select an item to checkout."
      );
      return;
    }

    if (!isAuthenticated) {
      toast.info(language === "km" ? "សូមចូលគណនី" : "Please login first");
      onNavigate("login");
      return;
    }

    onNavigate("checkout");
  };

  // -----------------------
  // UI
  // -----------------------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => onNavigate("courses")}
            className="flex items-center text-blue-600 dark:text-blue-400 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("cart.continueShopping")}
          </button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("cart.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {items.length} {t("cart.courses")}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl">
            {language === "km" ? "កំពុងផ្ទុក..." : "Loading..."}
          </div>
        ) : items.length === 0 ? (
          // Empty
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto text-gray-400 mb-6" />
            <h2 className="text-2xl font-bold mb-2">{t("cart.empty")}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t("cart.emptyDesc")}
            </p>
            <Button onClick={() => onNavigate("courses")}>
              {t("cart.browseCourses")}
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div
                  key={item.cart_item_id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    <img
                      src={item.image_url ?? "/placeholder.png"}
                      className="w-full sm:w-48 h-32 object-cover rounded-lg"
                    />

                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <h3 className="text-lg font-bold">{item.title}</h3>
                        <button
                          onClick={() => removeItem(item.cart_item_id)}
                          className="text-red-500"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="text-sm text-gray-500">
                        {item.duration_label}
                        {item.device_label ? ` • ${item.device_label}` : ""}
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-gray-500">
                          {language === "km" ? "បរិមាណ" : "Quantity"}: {item.qty}
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                          {formatPrice(item.line_total)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4">
                  {t("cart.orderSummary")}
                </h2>

                <p className="text-xs text-gray-500 mb-2">
                  {language === "km"
                    ? "ជ្រើសរើសមួយមុខទំនិញសម្រាប់ការទូទាត់"
                    : "Select one item to purchase at a time."}
                </p>

                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1">
                  {items.map((item) => {
                    const isSelected = item.cart_item_id === selectedCartItemId;
                    return (
                      <button
                        key={item.cart_item_id}
                        type="button"
                        onClick={() => onSelectCartItem(item.cart_item_id)}
                        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.duration_label}
                            {item.device_label ? ` • ${item.device_label}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatPrice(item.line_total)}
                          </div>
                          {isSelected && (
                            <div className="flex items-center justify-end text-green-600 dark:text-green-400 text-[11px] mt-1">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              {language === "km" ? "បានជ្រើស" : "Selected"}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3 mb-6">
                  <Row label={t("cart.subtotal")} value={formatPrice(subtotal)} />
                  <Row label={t("cart.tax")} value={taxDisplay} />
                  <Row
                    label={t("cart.total")}
                    value={formatPrice(total)}
                    bold
                  />
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-50"
                  disabled={!selectedItem}
                >
                  {t("cart.checkout")}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  {t("cart.guarantee")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
