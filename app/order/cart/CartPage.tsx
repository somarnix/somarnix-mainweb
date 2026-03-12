import { useEffect, useMemo, useState } from "react";
import { Trash2, ShoppingBag, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Pagination } from "../../components/Pagination";
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
  order_fields_json?: string | null;
  order_info_json?: string | null;
};

type OrderField = {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
  type: "text" | "number" | "email" | "tel";
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

function parseOrderFields(raw?: string | null): OrderField[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const r = item as Record<string, unknown>;
        const key = typeof r.key === "string" ? r.key.trim() : "";
        const label = typeof r.label === "string" ? r.label.trim() : "";
        if (!key || !label) return null;
        const required = r.required === true;
        const placeholder = typeof r.placeholder === "string" ? r.placeholder : "";
        const type =
          r.type === "number" || r.type === "email" || r.type === "tel"
            ? (r.type as OrderField["type"])
            : "text";
        return { key, label, required, placeholder, type };
      })
      .filter(Boolean) as OrderField[];
  } catch {
    return [];
  }
}

function parseOrderInfo(raw?: string | null): Record<string, string> {
  if (!raw || typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      out[k] = String(v);
    }
    return out;
  } catch {
    return {};
  }
}

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
  const [editingCartItemId, setEditingCartItemId] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingOrderInfo, setSavingOrderInfo] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const getPromotionComboId = (item: DbCartItem | null): string | null => {
    if (!item?.order_info_json) return null;
    const info = parseOrderInfo(item.order_info_json);
    const value = info.promotion_combo_id;
    if (!value) return null;
    const text = String(value).trim();
    return text || null;
  };
  const getPromotionComboPrice = (item: DbCartItem | null): number | null => {
    if (!item?.order_info_json) return null;
    const info = parseOrderInfo(item.order_info_json);
    const raw = Number(info.promotion_combo_price);
    if (!Number.isFinite(raw) || raw < 0) return null;
    return raw;
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

  // -----------------------
  // Load DB cart
  // -----------------------
  const loadCart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      setItems(data.items ?? []);
      setCurrentPage(1);
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
    await loadCart();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cart:changed"));
    }
  };

  const openEditOrderInfo = (item: DbCartItem) => {
    setEditingCartItemId(item.cart_item_id);
    setEditingValues(parseOrderInfo(item.order_info_json));
  };

  const cancelEditOrderInfo = () => {
    setEditingCartItemId(null);
    setEditingValues({});
  };

  const saveOrderInfo = async (item: DbCartItem) => {
    const fields = parseOrderFields(item.order_fields_json);
    if (fields.length === 0) {
      cancelEditOrderInfo();
      return;
    }

    for (const field of fields) {
      if (!field.required) continue;
      const value = (editingValues[field.key] ?? "").trim();
      if (!value) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    try {
      setSavingOrderInfo(true);
      const res = await fetch("/api/cart/order-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItemId: item.cart_item_id,
          orderInfo: editingValues,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data && typeof data.error === "string" ? data.error : "Failed to save order info";
        throw new Error(msg);
      }
      toast.success(language === "km" ? "រក្សាទុករួចរាល់" : "Order info updated");
      cancelEditOrderInfo();
      await loadCart();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save order info";
      toast.error(msg);
    } finally {
      setSavingOrderInfo(false);
    }
  };

  // -----------------------
  // Totals
  // -----------------------
  const selectedItem = selectedCartItemId
    ? items.find((it) => it.cart_item_id === selectedCartItemId) ?? null
    : null;
  const selectedComboId = getPromotionComboId(selectedItem);
  const selectedCheckoutItems = selectedItem
    ? selectedComboId
      ? items.filter((it) => getPromotionComboId(it) === selectedComboId)
      : [selectedItem]
    : [];
  const comboPrice = getPromotionComboPrice(selectedItem);
  const comboCourseCount = getPromotionCourseCount(selectedItem);
  const comboCourseItems = getPromotionCourseItems(selectedItem);
  const rawSubtotal = selectedCheckoutItems.reduce((sum, it) => sum + Number(it.line_total ?? 0), 0);
  const subtotal = selectedComboId && comboPrice !== null ? comboPrice : rawSubtotal;
  const discountAmount =
    selectedComboId && comboPrice !== null && rawSubtotal > comboPrice
      ? rawSubtotal - comboPrice
      : 0;
  const tax = 0;
  const total = subtotal + tax;
  const taxDisplay = tax === 0 ? (language === "km" ? "ឥតគិតថ្លៃ" : "Free") : formatPrice(tax);

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const headerCount = useMemo(() => {
    const baseQty = items.reduce((sum, it) => sum + Number(it.qty ?? 0), 0);
    const seenComboIds = new Set<string>();
    const comboCourseQty = items.reduce((sum, it) => {
      const { comboId, courseQty } = getComboCourseQtyAndId(it.order_info_json);
      if (!comboId || seenComboIds.has(comboId)) return sum;
      seenComboIds.add(comboId);
      return sum + courseQty;
    }, 0);
    return baseQty + comboCourseQty;
  }, [items]);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
            {headerCount} item(s) in your cart
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
              {pagedItems.map((item) => (
                <div
                  key={item.cart_item_id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    <img
                      src={item.image_url ?? "/placeholder.png"}
                      alt={item.title}
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

                      {(() => {
                        const fields = parseOrderFields(item.order_fields_json);
                        if (fields.length === 0) return null;
                        const info = parseOrderInfo(item.order_info_json);
                        const isEditing = editingCartItemId === item.cart_item_id;
                        return (
                          <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                Account / Order Info
                              </div>
                              {!isEditing ? (
                                <button
                                  type="button"
                                  className="text-xs text-blue-600"
                                  onClick={() => openEditOrderInfo(item)}
                                >
                                  Edit
                                </button>
                              ) : null}
                            </div>
                            {!isEditing ? (
                              <div className="mt-2 space-y-1">
                                {fields.map((field) => (
                                  <div key={field.key} className="text-xs text-gray-600 dark:text-gray-300">
                                    <span className="font-medium">{field.label}:</span>{" "}
                                    {info[field.key] && info[field.key].trim() ? info[field.key] : "-"}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 space-y-2">
                                {fields.map((field) => (
                                  <div key={field.key}>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      {field.label}
                                      {field.required ? <span className="text-red-500"> *</span> : null}
                                    </label>
                                    <input
                                      type={field.type || "text"}
                                      value={editingValues[field.key] ?? ""}
                                      onChange={(e) =>
                                        setEditingValues((prev) => ({
                                          ...prev,
                                          [field.key]: e.target.value,
                                        }))
                                      }
                                      placeholder={field.placeholder}
                                      className="w-full rounded-lg border px-3 py-2 text-sm"
                                    />
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    className="text-xs px-3 py-1.5 rounded border"
                                    onClick={cancelEditOrderInfo}
                                    disabled={savingOrderInfo}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white"
                                    onClick={() => void saveOrderInfo(item)}
                                    disabled={savingOrderInfo}
                                  >
                                    {savingOrderInfo ? "Saving..." : "Save"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

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
              {selectedComboId && comboCourseItems.map((ci, idx) => (
                <div
                  key={`combo-course-card-${ci.course_id}-${ci.plan_id ?? "none"}-${idx}`}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-blue-200"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    <img
                      src={ci.course_thumbnail ?? "/placeholder.png"}
                      alt={ci.course_title || "Video course"}
                      className="w-full sm:w-48 h-32 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <h3 className="text-lg font-bold">
                          {ci.course_title || `Course #${ci.course_id}`}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                          Included
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {ci.plan_name ? `${ci.plan_name} access` : ci.plan_id ? `Plan #${ci.plan_id}` : "Course plan"}
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-gray-500">
                          {language === "km" ? "แ”แแทแแถแ" : "Quantity"}: {ci.qty}
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                          {ci.plan_price !== null ? formatPrice(ci.plan_price * ci.qty) : "Included"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
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
                    : selectedComboId
                      ? "Combo items will checkout together."
                      : "Select one item to purchase at a time."}
                </p>
                {selectedComboId && comboCourseCount > 0 ? (
                  <p className="text-xs text-blue-600 mb-2">
                    Includes {comboCourseCount} video course item(s).
                  </p>
                ) : null}
                {selectedComboId && comboCourseItems.length > 0 ? (
                  <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2">
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

                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1">
                  {pagedItems.map((item) => {
                    const itemComboId = getPromotionComboId(item);
                    const isSelected =
                      item.cart_item_id === selectedCartItemId ||
                      (selectedComboId !== null && itemComboId === selectedComboId);
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
                  {discountAmount > 0 ? (
                    <Row label="Original" value={formatPrice(rawSubtotal)} strike />
                  ) : null}
                  {discountAmount > 0 ? (
                    <Row label="Combo Discount" value={`- ${formatPrice(discountAmount)}`} className="text-emerald-600" />
                  ) : null}
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

function getComboCourseQtyAndId(raw?: string | null): { comboId: string | null; courseQty: number } {
  if (!raw || typeof raw !== "string") return { comboId: null, courseQty: 0 };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { comboId: null, courseQty: 0 };
    const comboRaw = (parsed as Record<string, unknown>).promotion_combo_id;
    const comboId = comboRaw === null || comboRaw === undefined ? null : String(comboRaw).trim() || null;
    const courses = (parsed as Record<string, unknown>).promotion_course_items;
    if (!Array.isArray(courses)) return { comboId, courseQty: 0 };
    const courseQty = courses.reduce((sum, row) => {
      if (!row || typeof row !== "object") return sum;
      const qtyRaw = Number((row as Record<string, unknown>).qty ?? 1);
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
      return sum + qty;
    }, 0);
    return { comboId, courseQty };
  } catch {
    return { comboId: null, courseQty: 0 };
  }
}

