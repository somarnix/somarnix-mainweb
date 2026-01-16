import { useEffect, useState } from "react";
import { Trash2, ShoppingBag, ArrowLeft, Minus, Plus } from "lucide-react";
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
};

interface CartPageProps {
  onNavigate: (page: string) => void;
}

export function CartPage({ onNavigate }: CartPageProps) {
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

  // -----------------------
  // Quantity change
  // -----------------------
  const changeQty = async (item: DbCartItem, delta: number) => {
    if (item.qty + delta <= 0) return;

    await fetch("/api/cart/add-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.product_id,
        variantId: item.variant_id,
        qty: delta,
      }),
    });

    loadCart();
  };

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
  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + tax;

  // -----------------------
  // Checkout
  // -----------------------
  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error(language === "km" ? "កន្ត្រកទទេ" : "Your cart is empty!");
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
                        <div className="flex items-center border rounded-lg">
                          <button
                            onClick={() => changeQty(item, -1)}
                            className="p-2"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4">{item.qty}</span>
                          <button
                            onClick={() => changeQty(item, 1)}
                            className="p-2"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
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
                <h2 className="text-xl font-bold mb-6">
                  {t("cart.orderSummary")}
                </h2>

                <div className="space-y-3 mb-6">
                  <Row label={t("cart.subtotal")} value={formatPrice(subtotal)} />
                  <Row label={t("cart.tax")} value={formatPrice(tax)} />
                  <Row
                    label={t("cart.total")}
                    value={formatPrice(total)}
                    bold
                  />
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
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
