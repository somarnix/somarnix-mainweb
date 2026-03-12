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
  order_info_json?: string | null;
};

type ComboCourseItem = {
  course_id: number;
  plan_id: number | null;
  qty: number;
  course_title: string | null;
  plan_name: string | null;
  course_thumbnail: string | null;
  plan_price: number | null;
};

type ComboQrUrls = {
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

  const getPromotionComboId = (item: DbCartItem | null): string | null => {
    if (!item?.order_info_json) return null;
    try {
      const parsed = JSON.parse(item.order_info_json);
      if (!parsed || typeof parsed !== "object") return null;
      const v = (parsed as Record<string, unknown>).promotion_combo_id;
      if (v === null || v === undefined) return null;
      const text = String(v).trim();
      return text || null;
    } catch {
      return null;
    }
  };
  const getPromotionComboPrice = (item: DbCartItem | null): number | null => {
    if (!item?.order_info_json) return null;
    try {
      const parsed = JSON.parse(item.order_info_json);
      if (!parsed || typeof parsed !== "object") return null;
      const raw = Number((parsed as Record<string, unknown>).promotion_combo_price);
      if (!Number.isFinite(raw) || raw < 0) return null;
      return raw;
    } catch {
      return null;
    }
  };
  const getPromotionCourseCount = (item: DbCartItem | null): number => {
    if (!item?.order_info_json) return 0;
    try {
      const parsed = JSON.parse(item.order_info_json);
      if (!parsed || typeof parsed !== "object") return 0;
      const raw = (parsed as Record<string, unknown>).promotion_course_items;
      if (!Array.isArray(raw)) return 0;
      return raw.length;
    } catch {
      return 0;
    }
  };
  const getPromotionCourseItems = (item: DbCartItem | null): ComboCourseItem[] => {
    if (!item?.order_info_json) return [];
    try {
      const parsed = JSON.parse(item.order_info_json);
      if (!parsed || typeof parsed !== "object") return [];
      const raw = (parsed as Record<string, unknown>).promotion_course_items;
      if (!Array.isArray(raw)) return [];
      return raw
        .map((it) => {
          if (!it || typeof it !== "object") return null;
          const r = it as Record<string, unknown>;
          const courseId = Number(r.course_id);
          const planIdRaw = r.plan_id;
          const planId =
            planIdRaw === null || planIdRaw === undefined ? null : Number(planIdRaw);
          const qtyRaw = Number(r.qty ?? 1);
          if (!Number.isFinite(courseId) || courseId <= 0) return null;
          const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
          const courseTitle =
            typeof r.course_title === "string" && r.course_title.trim()
              ? r.course_title.trim()
              : null;
          const planName =
            typeof r.plan_name === "string" && r.plan_name.trim()
              ? r.plan_name.trim()
              : null;
          const courseThumbnail =
            typeof r.course_thumbnail === "string" && r.course_thumbnail.trim()
              ? r.course_thumbnail.trim()
              : null;
          const planPriceRaw = Number(r.plan_price ?? 0);
          const planPrice = Number.isFinite(planPriceRaw) && planPriceRaw >= 0 ? planPriceRaw : null;
          return {
            course_id: Math.floor(courseId),
            plan_id: planId !== null && Number.isFinite(planId) && planId > 0 ? Math.floor(planId) : null,
            qty,
            course_title: courseTitle,
            plan_name: planName,
            course_thumbnail: courseThumbnail,
            plan_price: planPrice,
          };
        })
        .filter(Boolean) as ComboCourseItem[];
    } catch {
      return [];
    }
  };
  const getPromotionComboQrUrls = (item: DbCartItem | null): ComboQrUrls => {
    if (!item?.order_info_json) return { khqr: null, usdqr: null };
    try {
      const parsed = JSON.parse(item.order_info_json);
      if (!parsed || typeof parsed !== "object") return { khqr: null, usdqr: null };
      const info = parsed as Record<string, unknown>;
      const khqrRaw = typeof info.promotion_combo_khqr === "string" ? info.promotion_combo_khqr.trim() : "";
      const usdqrRaw = typeof info.promotion_combo_usdqr === "string" ? info.promotion_combo_usdqr.trim() : "";
      const khqr = khqrRaw || null;
      const usdqr = usdqrRaw && usdqrRaw.toLowerCase() !== "none" ? usdqrRaw : null;
      return { khqr, usdqr };
    } catch {
      return { khqr: null, usdqr: null };
    }
  };

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
  const selectedComboId = getPromotionComboId(selectedItem);
  const checkoutItems = selectedItem
    ? selectedComboId
      ? items.filter((it) => getPromotionComboId(it) === selectedComboId)
      : [selectedItem]
    : [];
  const comboPrice = getPromotionComboPrice(selectedItem);
  const comboCourseCount = getPromotionCourseCount(selectedItem);
  const comboCourseItems = getPromotionCourseItems(selectedItem);
  const comboQrUrls = getPromotionComboQrUrls(selectedItem);
  const rawSubtotal = checkoutItems.reduce((sum, it) => sum + Number(it.line_total ?? 0), 0);
  const subtotal = selectedComboId && comboPrice !== null ? comboPrice : rawSubtotal;
  const discountAmount =
    selectedComboId && comboPrice !== null && rawSubtotal > comboPrice
      ? rawSubtotal - comboPrice
      : 0;
  const tax = 0;
  const total = subtotal + tax;
  const taxDisplay = tax === 0 ? (language === "km" ? "ឥតគិតថ្លៃ" : "Free") : formatPrice(tax);

  // -----------------------
  // Create order + submit payment
  // -----------------------
  const createOrderAndSubmitPayment = async (
    cartItemIds: number[],
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
        body: JSON.stringify(
          cartItemIds.length > 1 ? { cartItemIds } : { cartItemId: cartItemIds[0] }
        ),
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

      if (checkoutItems.length > 0) {
        const lineTotal = selectedComboId && comboPrice !== null
          ? comboPrice
          : checkoutItems.reduce((sum, it) => sum + Number(it.line_total ?? 0), 0);
        const qtyTotal = checkoutItems.reduce((sum, it) => sum + Number(it.qty ?? 0), 0);
        setLastOrderTotal(lineTotal);
        setLastOrderItemsCount(qtyTotal);
      } else {
        setLastOrderTotal(0);
        setLastOrderItemsCount(0);
      }

      setShowQRModal(false);
      setOrderPlaced(true);
      setItems((prev) => prev.filter((it) => !cartItemIds.includes(it.cart_item_id)));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cart:changed"));
      }
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
      await createOrderAndSubmitPayment(
        checkoutItems.map((it) => it.cart_item_id),
        {
        accountName: "FREE ORDER",
        accountNumber: "0000",
        paymentApv: "FREE",
        method: "manual",
        dateTimePay: new Date().toISOString(),
      }
      );
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
    await createOrderAndSubmitPayment(
      checkoutItems.map((it) => it.cart_item_id),
      paymentInfo
    );
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
                  alt={selectedItem.title}
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
                    {selectedComboId
                      ? language === "km"
                        ? "Combo នេះទូទាត់រួមគ្នា"
                        : "This combo will checkout together."
                      : language === "km"
                        ? "មុខទំនិញផ្សេងទៀតនៅក្នុងកន្ត្រករបស់អ្នក"
                        : "Other items stay in your cart for later."}
                  </div>
                  {selectedComboId && comboCourseCount > 0 ? (
                    <div className="mt-1 text-xs text-blue-600">
                      Includes {comboCourseCount} video course item(s).
                    </div>
                  ) : null}
                  {selectedComboId && comboCourseItems.length > 0 ? (
                    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2">
                      <div className="text-[11px] font-semibold text-blue-700 mb-1">Included Courses</div>
                      <div className="space-y-1">
                        {comboCourseItems.map((ci, idx) => (
                          <div key={`${ci.course_id}-${ci.plan_id ?? "none"}-${idx}`} className="text-[11px] text-blue-700">
                            {(ci.course_title || `Course #${ci.course_id}`)}
                            {ci.plan_name ? ` (${ci.plan_name})` : ci.plan_id ? ` (Plan #${ci.plan_id})` : ""}
                            {ci.qty > 1 ? ` x${ci.qty}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="font-bold text-blue-600 mt-3 text-xl">
                    {formatPrice(total)}
                  </div>
                </div>
              </div>
              {selectedComboId && comboCourseItems.map((ci, idx) => (
                <div
                  key={`checkout-combo-course-${ci.course_id}-${ci.plan_id ?? "none"}-${idx}`}
                  className="flex gap-4 p-4 bg-blue-50 rounded-lg mt-3 border border-blue-200"
                >
                  <img
                    src={ci.course_thumbnail ?? "/placeholder.png"}
                    alt={ci.course_title || "Video course"}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900">
                      {ci.course_title || `Course #${ci.course_id}`}
                    </div>
                    <div className="text-xs text-blue-700">
                      {ci.plan_name ? `${ci.plan_name}` : ci.plan_id ? `Plan #${ci.plan_id}` : "Course plan"}
                      {ci.qty > 1 ? ` x${ci.qty}` : ""}
                    </div>
                    <div className="text-sm font-bold text-blue-800 mt-1">
                      {ci.plan_price !== null ? formatPrice(ci.plan_price * ci.qty) : "Included"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 sticky top-24">
              <div className="space-y-3 mb-6">
                {discountAmount > 0 ? (
                  <Row label="Original" value={formatPrice(rawSubtotal)} strike />
                ) : null}
                {discountAmount > 0 ? (
                  <Row label="Combo Discount" value={`- ${formatPrice(discountAmount)}`} className="text-emerald-600" />
                ) : null}
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
            khqrUrl={
              selectedComboId
                ? comboQrUrls.khqr ?? selectedItem?.khqr ?? undefined
                : selectedItem?.khqr ?? undefined
            }
            usdQrUrl={
              selectedComboId
                ? comboQrUrls.usdqr ??
                  (selectedItem && selectedItem.usdqr && selectedItem.usdqr !== "none"
                    ? selectedItem.usdqr
                    : undefined)
                : selectedItem && selectedItem.usdqr && selectedItem.usdqr !== "none"
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
  strike,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  strike?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""} ${className ?? ""}`}>
      <span>{label}</span>
      <span className={strike ? "line-through text-gray-400" : ""}>{value}</span>
    </div>
  );
}

