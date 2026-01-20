import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, ShoppingBag } from "lucide-react";
import { Button } from "../../components/ui/button";
import { QRPaymentModal } from "../../components/QRPaymentModal";
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
  khqr: string | null;
  usdqr: string | null;
};

interface CheckoutPageProps {
  onNavigate: (page: string) => void;
  selectedCartItemId: number | null;
  onClearSelection: () => void;
}

export function CheckoutPage({
  onNavigate,
  selectedCartItemId,
  onClearSelection,
}: CheckoutPageProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const [items, setItems] = useState<DbCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [lastOrderItemsCount, setLastOrderItemsCount] = useState(0);

  // -----------------------
  // Load DB cart
  // -----------------------
  useEffect(() => {
    fetch("/api/cart")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const selectedItem = selectedCartItemId
    ? items.find((it) => it.cart_item_id === selectedCartItemId) ?? null
    : null;
  const subtotal = selectedItem?.line_total ?? 0;
  const tax = 0;
  const total = subtotal + tax;
  const taxDisplay = tax === 0 ? (language === "km" ? "ឥតគិតថ្លៃ" : "Free") : formatPrice(tax);

  // -----------------------
  // Create order + submit payment
  // -----------------------
  const createOrderAndSubmitPayment = async (
    cartItemId: number,
    paymentInfo: {
      accountName: string;
      accountNumber: string;
      paymentApv: string;
      method: string;
      dateTimePay: string;
    }
  ) => {
    if (!user || submitting) return;

    setSubmitting(true);

    try {
      const res1 = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId }),
      });
      const data1 = await res1.json();

      if (!res1.ok) {
        toast.error(
          language === "km" ? "បង្កើតការបញ្ជាទិញមិនបាន" : "Failed to create order",
          { description: data1?.error }
        );
        return;
      }

      const orderId = data1.orderId;

      const res2 = await fetch("/api/payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          accountName: paymentInfo.accountName,
          accountNumber: paymentInfo.accountNumber,
          paymentApv: paymentInfo.paymentApv,
          method: paymentInfo.method,
          paidAt: paymentInfo.dateTimePay,
        }),
      });

      const data2 = await res2.json();
      if (!res2.ok) {
        toast.error(
          language === "km" ? "បញ្ជូនការទូទាត់មិនបាន" : "Payment failed",
          { description: data2?.error }
        );
        return;
      }

      const purchasedItem = items.find((it) => it.cart_item_id === cartItemId);
      if (purchasedItem) {
        setLastOrderTotal(Number(purchasedItem.line_total));
        setLastOrderItemsCount(Number(purchasedItem.qty ?? 1));
      } else {
        setLastOrderTotal(0);
        setLastOrderItemsCount(0);
      }

      setShowQRModal(false);
      setOrderPlaced(true);
      setItems((prev) => prev.filter((it) => it.cart_item_id !== cartItemId));
      onClearSelection();

      toast.success(
        language === "km"
          ? "ការបញ្ជាទិញត្រូវបានបង្កើត!"
          : "Order created successfully!"
      );

      onNavigate("orders");
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------
  // Checkout
  // -----------------------
  const handleCheckout = async () => {
    if (!user) {
      toast.error(language === "km" ? "សូមចូលគណនី" : "Please login first");
      onNavigate("login");
      return;
    }

    if (!selectedItem) {
      toast.error(
        language === "km"
          ? "សូមត្រឡប់ទៅកន្ត្រកដើម្បីជ្រើសផលិតផលមួយ"
          : "Select an item in your cart first."
      );
      onNavigate("cart");
      return;
    }

    if (total === 0) {
      await createOrderAndSubmitPayment(selectedItem.cart_item_id, {
        accountName: "FREE ORDER",
        accountNumber: "0000",
        paymentApv: "FREE",
        method: "manual",
        dateTimePay: new Date().toISOString(),
      });
      return;
    }

    setShowQRModal(true);
  };

  const handlePaymentSuccess = async (paymentInfo: {
    accountName: string;
    accountNumber: string;
    paymentApv: string;
    method: string;
    dateTimePay: string;
  }) => {
    if (!selectedItem) return;
    await createOrderAndSubmitPayment(selectedItem.cart_item_id, paymentInfo);
  };

  // -----------------------
  // Success screen
  // -----------------------
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>

            <h1 className="text-3xl font-bold mb-4">
              {language === "km" ? "បញ្ជាទិញបានដាក់!" : "Order Placed!"}
            </h1>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-8">
              <div className="text-sm mb-2">
                {language === "km" ? "សរុប" : "Order Total"}
              </div>
              <div className="text-3xl font-bold">{formatPrice(lastOrderTotal)}</div>
              <div className="text-sm mt-2">
                {lastOrderItemsCount}{" "}
                {language === "km" ? "មុខទំនិញ" : "item(s)"}
              </div>
            </div>

            <Button onClick={() => onNavigate("orders")}>
              {language === "km" ? "មើលការបញ្ជាទិញ" : "View Orders"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------
  // Main UI
  // -----------------------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={() => onNavigate("cart")}
          className="flex items-center gap-2 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === "km" ? "ត្រឡប់ទៅកន្ត្រក" : "Back to Cart"}
        </button>

        {loading ? (
          <div>Loading...</div>
        ) : !selectedItem ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-semibold mb-2">
              {language === "km"
                ? "សូមត្រឡប់ទៅកន្ត្រកដើម្បីជ្រើសរើសមុខទំនិញ"
                : "Select an item in your cart to continue."}
            </p>
            <Button onClick={() => onNavigate("cart")}>
              {language === "km" ? "ត្រឡប់ទៅកន្ត្រក" : "Back to Cart"}
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6" />
                {language === "km" ? "សង្ខេបការបញ្ជាទិញ" : "Order Summary"}
              </h2>

              <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <img
                  src={selectedItem.image_url ?? "/placeholder.png"}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="font-bold text-lg">{selectedItem.title}</div>
                  <div className="text-sm text-gray-500">
                    {selectedItem.duration_label}
                    {selectedItem.device_label
                      ? ` • ${selectedItem.device_label}`
                      : ""}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {language === "km"
                      ? "មុខទំនិញផ្សេងទៀតនៅក្នុងកន្ត្រករបស់អ្នក"
                      : "Other items stay in your cart for later."}
                  </div>
                  <div className="font-bold text-blue-600 mt-3 text-xl">
                    {formatPrice(selectedItem.line_total)}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 sticky top-24">
              <div className="space-y-3 mb-6">
                <Row label="Subtotal" value={formatPrice(subtotal)} />
                <Row label="Tax (10%)" value={taxDisplay} />
                <Row
                  label={language === "km" ? "សរុប" : "Total"}
                  value={formatPrice(total)}
                  bold
                />
              </div>

              <Button
                onClick={handleCheckout}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-50"
              >
                {submitting
                  ? language === "km"
                    ? "កំពុងដំណើរការ..."
                    : "Processing..."
                  : language === "km"
                  ? "បន្តទៅការទូទាត់"
                  : "Proceed to Payment"}
              </Button>
            </div>
          </div>
        )}

        {showQRModal && (
          <QRPaymentModal
            amount={total}
            onClose={() => setShowQRModal(false)}
            onSuccess={handlePaymentSuccess}
            productTitle={selectedItem?.title ?? ""}
            variantLabel={
              selectedItem
                ? [
                    selectedItem.duration_label,
                    selectedItem.device_label,
                  ]
                    .filter(Boolean)
                    .join(" • ")
                : ""
            }
            khqrUrl={selectedItem?.khqr ?? undefined}
            usdQrUrl={
              selectedItem && selectedItem.usdqr && selectedItem.usdqr !== "none"
                ? selectedItem.usdqr
                : undefined
            }
          />
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
