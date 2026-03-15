import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, ShoppingBag, Layers3 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { QRPaymentModal } from "../../components/QRPaymentModal";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { toast } from "sonner";

type DbCartItem = {
  item_type?: "product" | "course";
  product_mode?: "license" | "inventory";
  cart_item_id: number;
  product_id: number;
  variant_id: number | null;
  tool_variant_id?: number | null;
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

type CheckoutDisplayGroup = {
  groupId: string;
  comboId: string | null;
  comboTitle: string | null;
  cartItems: DbCartItem[];
  comboCourseItems: ComboCourseItem[];
  comboCourseCount: number;
  comboPrice: number | null;
  comboQrUrls: ComboQrUrls;
  rawSubtotal: number;
  representative: DbCartItem;
};

type PendingOrder = {
  orderId: number;
  orderNumber: string;
  createdAt: string;
  cartItemIds: number[];
  telegramSupportUrl?: string;
};

interface CheckoutPageProps {
  onNavigate: (page: string) => void;
  selectedCartGroupKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  onClearSelection: () => void;
}

export function CheckoutPage({
  onNavigate,
  selectedCartGroupKeys,
  onSelectionChange,
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
  const [updatingQtyId, setUpdatingQtyId] = useState<number | null>(null);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [lastOrderItemsCount, setLastOrderItemsCount] = useState(0);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);

  const getLocalDateTimeStamp = () => {
    const now = new Date();
    const localMs = now.getTime() - now.getTimezoneOffset() * 60000;
    return new Date(localMs).toISOString().slice(0, 19);
  };

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
  const getPromotionComboTitle = (item: DbCartItem | null): string | null => {
    if (!item?.order_info_json) return null;
    try {
      const parsed = JSON.parse(item.order_info_json);
      if (!parsed || typeof parsed !== "object") return null;
      const value = (parsed as Record<string, unknown>).promotion_combo_title;
      if (value === null || value === undefined) return null;
      const text = String(value).trim();
      return text || null;
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

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  const canUpdateQty = (item: DbCartItem | null): boolean => {
    if (!item) return false;
    if (getPromotionComboId(item) !== null) return false;
    if (item.item_type === "course") return false;
    return String(item.product_mode ?? "inventory") !== "license";
  };

  const updateItemQty = async (item: DbCartItem, nextQty: number) => {
    if (!canUpdateQty(item)) return;
    const qty = Math.max(1, Math.floor(nextQty));
    if (qty === Math.max(1, Number(item.qty ?? 1))) return;

    try {
      setUpdatingQtyId(item.cart_item_id);
      const res = await fetch("/api/cart/update-qty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId: item.cart_item_id, qty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data && typeof data.error === "string" ? data.error : "Failed to update quantity";
        throw new Error(msg);
      }
      await loadItems();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cart:changed"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update quantity";
      toast.error(msg);
    } finally {
      setUpdatingQtyId(null);
    }
  };

  // -----------------------
  // Load DB cart
  // -----------------------
  useEffect(() => {
    void loadItems();
  }, []);

  const displayGroups = items.reduce<CheckoutDisplayGroup[]>((groups, item) => {
    const comboId = getPromotionComboId(item);
    if (!comboId) {
      groups.push({
        groupId: `item-${item.cart_item_id}`,
        comboId: null,
        comboTitle: null,
        cartItems: [item],
        comboCourseItems: [],
        comboCourseCount: 0,
        comboPrice: null,
        comboQrUrls: { khqr: null, usdqr: null },
        rawSubtotal: Number(item.line_total ?? 0),
        representative: item,
      });
      return groups;
    }
    if (groups.some((group) => group.comboId === comboId)) return groups;
    const comboItems = items.filter((it) => getPromotionComboId(it) === comboId);
    const representative = comboItems[0] ?? item;
    groups.push({
      groupId: `combo-${comboId}`,
      comboId,
      comboTitle: getPromotionComboTitle(representative),
      cartItems: comboItems,
      comboCourseItems: getPromotionCourseItems(representative),
      comboCourseCount: getPromotionCourseCount(representative),
      comboPrice: getPromotionComboPrice(representative),
      comboQrUrls: getPromotionComboQrUrls(representative),
      rawSubtotal: comboItems.reduce((sum, it) => sum + Number(it.line_total ?? 0), 0),
      representative,
    });
    return groups;
  }, []);
  const selectedGroups = displayGroups.filter((group) => selectedCartGroupKeys.includes(group.groupId));
  const primaryGroup = selectedGroups[0] ?? null;
  const primaryItem = primaryGroup?.representative ?? null;
  const selectedItem = primaryItem;
  const selectedComboId = selectedGroups.length === 1 ? primaryGroup?.comboId ?? null : null;
  const comboTitle =
    selectedGroups.length === 1
      ? primaryGroup?.comboTitle ?? null
      : selectedGroups.length > 1
        ? "Multi-item checkout"
        : null;
  const checkoutItems = selectedGroups.flatMap((group) => group.cartItems);
  const comboCourseItems = selectedGroups.flatMap((group) => group.comboCourseItems);
  const comboCourseCount = comboCourseItems.length;
  const comboQrUrls =
    selectedGroups.length === 1 && primaryGroup
      ? primaryGroup.comboQrUrls
      : { khqr: null, usdqr: null };
  const rawSubtotal = selectedGroups.reduce((sum, group) => sum + group.rawSubtotal, 0);
  const subtotal = selectedGroups.reduce(
    (sum, group) => sum + (group.comboPrice !== null ? group.comboPrice : group.rawSubtotal),
    0
  );
  const discountAmount = Math.max(0, rawSubtotal - subtotal);
  const tax = 0;
  const total = subtotal + tax;
  const taxDisplay = tax === 0 ? (language === "km" ? "ឥតគិតថ្លៃ" : "Free") : formatPrice(tax);
  const checkoutCartItemIds = checkoutItems.map((it) => it.cart_item_id);

  const hasSamePendingSelection = (order: PendingOrder | null): boolean => {
    if (!order) return false;
    if (order.cartItemIds.length !== checkoutCartItemIds.length) return false;
    const current = [...checkoutCartItemIds].sort((a, b) => a - b);
    const existing = [...order.cartItemIds].sort((a, b) => a - b);
    return current.every((value, index) => value === existing[index]);
  };

  useEffect(() => {
    if (loading) return;
    const validKeys = new Set(displayGroups.map((group) => group.groupId));
    const nextKeys = selectedCartGroupKeys.filter((key) => validKeys.has(key));
    if (nextKeys.length !== selectedCartGroupKeys.length) {
      onSelectionChange(nextKeys);
    }
  }, [displayGroups, loading, onSelectionChange, selectedCartGroupKeys]);

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
    if (!user || submitting) return false;

    setSubmitting(true);

    try {
      const existingOrder = hasSamePendingSelection(pendingOrder) ? pendingOrder : null;
      let orderId = existingOrder?.orderId ?? 0;

      if (!existingOrder) {
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
        return false;
      }

      orderId = Number(data1.orderId);
      setPendingOrder({
        orderId,
        orderNumber: String(data1.orderNumber || ""),
        createdAt: getLocalDateTimeStamp(),
        cartItemIds: [...cartItemIds],
        telegramSupportUrl:
          typeof data1.telegramSupportUrl === "string" ? data1.telegramSupportUrl : "",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cart:changed"));
      }
      }

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
        return false;
      }

      if (checkoutItems.length > 0) {
        const lineTotal = subtotal;
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
      setPendingOrder(null);
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
      return true;
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

    if (selectedGroups.length === 0) {
      toast.error(
        language === "km"
          ? "សូមត្រឡប់ទៅកន្ត្រកដើម្បីជ្រើសផលិតផលមួយ"
          : "Select an item in your cart first."
      );
      onNavigate("cart");
      return;
    }

    const currentOrder = hasSamePendingSelection(pendingOrder)
      ? pendingOrder
      : await (async () => {
          if (submitting) return null;
          setSubmitting(true);
          try {
            const res = await fetch("/api/orders/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                checkoutCartItemIds.length > 1
                  ? { cartItemIds: checkoutCartItemIds }
                  : { cartItemId: checkoutCartItemIds[0] }
              ),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              toast.error(language === "km" ? "បង្កើតការបញ្ជាទិញមិនបាន" : "Failed to create order", {
                description: typeof data?.error === "string" ? data.error : undefined,
              });
              return null;
            }
            const nextOrder: PendingOrder = {
              orderId: Number(data.orderId),
              orderNumber: String(data.orderNumber || ""),
              createdAt: getLocalDateTimeStamp(),
              cartItemIds: [...checkoutCartItemIds],
              telegramSupportUrl:
                typeof data.telegramSupportUrl === "string" ? data.telegramSupportUrl : "",
            };
            setPendingOrder(nextOrder);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("cart:changed"));
            }
            return nextOrder;
          } finally {
            setSubmitting(false);
          }
        })();

    if (!currentOrder) {
      return;
    }

    if (total === 0) {
      await createOrderAndSubmitPayment(
        checkoutCartItemIds,
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
    if (selectedGroups.length === 0) return;
    const success = await createOrderAndSubmitPayment(
      checkoutItems.map((it) => it.cart_item_id),
      paymentInfo
    );
    if (!success) {
      throw new Error("Failed to finalize order after payment confirmation.");
    }
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

              {selectedComboId ? (
                <div className="mb-5 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 dark:border-blue-900/40 dark:from-blue-950/30 dark:via-gray-900 dark:to-cyan-950/20">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-blue-500/90">
                        <Layers3 className="h-3.5 w-3.5" />
                        Combo Bundle
                      </div>
                      <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                        {comboTitle || "Special combo"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        This payment includes {checkoutItems.length} cart item(s)
                        {comboCourseCount > 0 ? ` + ${comboCourseCount} included video course(s)` : ""}.
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Bundle total
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {formatPrice(subtotal)}
                      </div>
                      {discountAmount > 0 ? (
                        <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Save {formatPrice(discountAmount)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

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
                  <div className="mt-1 text-sm text-gray-600">
                    <div>{language === "km" ? "បរិមាណ" : "Quantity"}</div>
                    {canUpdateQty(selectedItem) ? (
                      <div className="mt-2 inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          className="px-3 py-1 text-base disabled:opacity-50"
                          onClick={() => void updateItemQty(selectedItem, Number(selectedItem.qty ?? 1) - 1)}
                          disabled={updatingQtyId === selectedItem.cart_item_id || Number(selectedItem.qty ?? 1) <= 1}
                        >
                          -
                        </button>
                        <span className="min-w-10 border-x border-gray-200 px-3 py-1 text-center dark:border-gray-700">
                          {updatingQtyId === selectedItem.cart_item_id ? "..." : Math.max(1, Number(selectedItem.qty ?? 1))}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1 text-base disabled:opacity-50"
                          onClick={() => void updateItemQty(selectedItem, Number(selectedItem.qty ?? 1) + 1)}
                          disabled={updatingQtyId === selectedItem.cart_item_id}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1">{Math.max(1, Number(selectedItem.qty ?? 1))}</div>
                    )}
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
              {selectedComboId ? (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-900/40 dark:bg-gray-900/60">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Bundle Items
                  </div>
                  <div className="mt-3 space-y-2">
                    {checkoutItems.map((item) => (
                      <div
                        key={item.cart_item_id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                          item.cart_item_id === selectedItem.cart_item_id
                            ? "border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30"
                            : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-300">
                            {item.duration_label}
                            {item.device_label ? ` • ${item.device_label}` : ""}
                            {item.qty > 1 ? ` • Qty ${item.qty}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-300">
                            {formatPrice(item.line_total)}
                          </div>
                          {item.cart_item_id === selectedItem.cart_item_id ? (
                            <div className="text-[11px] text-green-600 dark:text-green-400">
                              Selected line
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
                    <div className="text-xs text-blue-700 mt-1">
                      {language === "km" ? "បរិមាណ" : "Quantity"}: {ci.qty}
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
            orderId={pendingOrder?.orderId}
            orderCreatedAt={pendingOrder?.createdAt}
            productTitle={selectedItem?.title ?? ""}
            billNumber={pendingOrder?.orderNumber}
            telegramSupportUrl={pendingOrder?.telegramSupportUrl}
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

