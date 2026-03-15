import { useEffect, useMemo, useState } from "react";
import { Trash2, ShoppingBag, ArrowLeft, CheckCircle, Layers3 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Pagination } from "../../components/Pagination";
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

type CartDisplayGroup = {
  groupId: string;
  comboId: string | null;
  comboTitle: string | null;
  cartItems: DbCartItem[];
  comboCourseItems: ComboCourseItem[];
  comboCourseCount: number;
  comboPrice: number | null;
  rawSubtotal: number;
  representative: DbCartItem;
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
  selectedCartGroupKeys: string[];
  onSelectionChange: (keys: string[]) => void;
}

export function CartPage({
  onNavigate,
  selectedCartGroupKeys,
  onSelectionChange,
}: CartPageProps) {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { formatPrice } = useCurrency();

  const [items, setItems] = useState<DbCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCartItemId, setEditingCartItemId] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingOrderInfo, setSavingOrderInfo] = useState(false);
  const [updatingQtyId, setUpdatingQtyId] = useState<number | null>(null);
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
  const getPromotionComboTitle = (item: DbCartItem | null): string | null => {
    if (!item?.order_info_json) return null;
    const info = parseOrderInfo(item.order_info_json);
    const value = info.promotion_combo_title;
    if (!value) return null;
    const text = String(value).trim();
    return text || null;
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
      const res = await fetch("/api/cart", { cache: "no-store" });
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

  const canUpdateQty = (item: DbCartItem): boolean => {
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
      await loadCart();
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
  const tax = 0;
  const taxDisplay = tax === 0 ? (language === "km" ? "ឥតគិតថ្លៃ" : "Free") : formatPrice(tax);

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
  const displayGroups = useMemo<CartDisplayGroup[]>(() => {
    const seenComboIds = new Set<string>();
    const groups: CartDisplayGroup[] = [];

    for (const item of items) {
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
          rawSubtotal: Number(item.line_total ?? 0),
          representative: item,
        });
        continue;
      }

      if (seenComboIds.has(comboId)) continue;
      seenComboIds.add(comboId);

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
        rawSubtotal: comboItems.reduce((sum, it) => sum + Number(it.line_total ?? 0), 0),
        representative,
      });
    }

    return groups;
  }, [items]);
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, currentPage]);
  const groupPageByCartItemId = useMemo(() => {
    const pageMap = new Map<number, number>();
    items.forEach((item, index) => {
      const page = Math.floor(index / ITEMS_PER_PAGE) + 1;
      pageMap.set(item.cart_item_id, page);
    });
    return pageMap;
  }, [items]);
  const hasCombos = useMemo(
    () => displayGroups.some((group) => group.comboId !== null),
    [displayGroups]
  );
  const selectedGroups = useMemo(
    () => displayGroups.filter((group) => selectedCartGroupKeys.includes(group.groupId)),
    [displayGroups, selectedCartGroupKeys]
  );
  const selectedComboCourseItems = useMemo(
    () => selectedGroups.flatMap((group) => group.comboCourseItems),
    [selectedGroups]
  );
  const selectedComboCourseCount = selectedComboCourseItems.length;
  const rawSubtotal = useMemo(
    () => selectedGroups.reduce((sum, group) => sum + group.rawSubtotal, 0),
    [selectedGroups]
  );
  const subtotal = useMemo(
    () =>
      selectedGroups.reduce(
        (sum, group) => sum + (group.comboPrice !== null ? group.comboPrice : group.rawSubtotal),
        0
      ),
    [selectedGroups]
  );
  const discountAmount = Math.max(0, rawSubtotal - subtotal);
  const selectedGroupCount = selectedGroups.length;
  const selectedQtyCount = useMemo(
    () => selectedGroups.reduce((sum, group) => sum + group.cartItems.reduce((inner, item) => inner + Number(item.qty ?? 0), 0), 0),
    [selectedGroups]
  );
  const total = subtotal + tax;

  useEffect(() => {
    if (loading) return;
    if (items.length === 0) {
      if (selectedCartGroupKeys.length > 0) {
        onSelectionChange([]);
      }
      return;
    }
    const validKeys = new Set(displayGroups.map((group) => group.groupId));
    const nextKeys = selectedCartGroupKeys.filter((key) => validKeys.has(key));
    const selectionChanged =
      nextKeys.length !== selectedCartGroupKeys.length ||
      nextKeys.some((key, index) => key !== selectedCartGroupKeys[index]);
    if (selectionChanged) {
      onSelectionChange(nextKeys);
    }
  }, [displayGroups, items.length, loading, onSelectionChange, selectedCartGroupKeys]);

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

    if (selectedGroups.length === 0) {
      toast.error(
        language === "km"
          ? "សូមជ្រើសរើសមួយមុខទំនិញដើម្បីទូទាត់"
          : "Choose one or more items in Order Summary first."
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

  const handleToggleGroup = (groupId: string) => {
    const targetGroup = displayGroups.find((group) => group.groupId === groupId);
    const targetPage = targetGroup
      ? groupPageByCartItemId.get(targetGroup.representative.cart_item_id)
      : null;
    if (targetPage) {
      setCurrentPage(targetPage);
    }
    const exists = selectedCartGroupKeys.includes(groupId);
    onSelectionChange(
      exists
        ? selectedCartGroupKeys.filter((key) => key !== groupId)
        : [...selectedCartGroupKeys, groupId]
    );
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
              {pagedItems.map((item, index) => {
                const itemComboId = getPromotionComboId(item);
                const itemComboTitle = getPromotionComboTitle(item);
                const isComboItem = itemComboId !== null;
                const isFirstComboItemOnPage =
                  isComboItem && (index === 0 || getPromotionComboId(pagedItems[index - 1]) !== itemComboId);
                const comboItems = isComboItem
                  ? items.filter((it) => getPromotionComboId(it) === itemComboId)
                  : [];
                const comboCourses = isComboItem ? getPromotionCourseItems(item) : [];
                const comboPriceForCard = isComboItem ? getPromotionComboPrice(item) : null;
                const comboSubtotalForCard = comboItems.reduce((sum, it) => sum + Number(it.line_total ?? 0), 0);
                const comboSavingsForCard =
                  comboPriceForCard !== null && comboSubtotalForCard > comboPriceForCard
                    ? comboSubtotalForCard - comboPriceForCard
                    : 0;
                const groupIdForCard = itemComboId !== null ? `combo-${itemComboId}` : `item-${item.cart_item_id}`;
                const isSelectedCard = selectedCartGroupKeys.includes(groupIdForCard);
                return (
                <div
                  key={item.cart_item_id}
                  className={`rounded-2xl p-6 ${
                    isComboItem
                      ? "border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:border-blue-900/40 dark:from-blue-950/30 dark:via-gray-900 dark:to-cyan-950/20"
                      : "bg-white dark:bg-gray-800"
                  } ${
                    isSelectedCard ? "ring-2 ring-blue-200 dark:ring-blue-900/40" : ""
                  }`}
                >
                  {isFirstComboItemOnPage ? (
                    <div className="mb-5 rounded-2xl border border-blue-200 bg-white/80 p-4 dark:border-blue-900/40 dark:bg-gray-900/60">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                            isSelectedCard
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                          }`}>
                            {isSelectedCard ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                          </div>
                          <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-blue-500/90">
                            <Layers3 className="h-3.5 w-3.5" />
                            Combo Bundle
                          </div>
                          <div className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                            {itemComboTitle || "Special combo"}
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {comboItems.length} cart item(s) checkout together
                            {comboCourses.length > 0 ? ` + ${comboCourses.length} included video course(s)` : ""}.
                          </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Combo total
                          </div>
                          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            {formatPrice(comboPriceForCard ?? comboSubtotalForCard)}
                          </div>
                          {comboSavingsForCard > 0 ? (
                            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              Save {formatPrice(comboSavingsForCard)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-col sm:flex-row gap-6">
                    <img
                      src={item.image_url ?? "/placeholder.png"}
                      alt={item.title}
                      className="w-full sm:w-48 h-32 object-cover rounded-lg"
                    />

                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {isComboItem ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                Combo item
                              </span>
                            ) : null}
                            {isSelectedCard && !isComboItem ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-200">
                                Selected for checkout
                              </span>
                            ) : null}
                          </div>
                          <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
                        </div>
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
                          <div>{language === "km" ? "បរិមាណ" : "Quantity"}</div>
                          {canUpdateQty(item) ? (
                            <div className="mt-2 inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                              <button
                                type="button"
                                className="px-3 py-1 text-base disabled:opacity-50"
                                onClick={() => void updateItemQty(item, Number(item.qty ?? 1) - 1)}
                                disabled={updatingQtyId === item.cart_item_id || Number(item.qty ?? 1) <= 1}
                              >
                                -
                              </button>
                              <span className="min-w-10 border-x border-gray-200 px-3 py-1 text-center dark:border-gray-700">
                                {updatingQtyId === item.cart_item_id ? "..." : item.qty}
                              </span>
                              <button
                                type="button"
                                className="px-3 py-1 text-base disabled:opacity-50"
                                onClick={() => void updateItemQty(item, Number(item.qty ?? 1) + 1)}
                                disabled={updatingQtyId === item.cart_item_id}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <div className="mt-1">{item.qty}</div>
                          )}
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                          {formatPrice(item.line_total)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isFirstComboItemOnPage && comboCourses.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-white/80 p-4 dark:border-blue-900/40 dark:bg-gray-900/60">
                      <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        Included Video Courses
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {comboCourses.map((ci, idx) => (
                          <div
                            key={`${ci.course_id}-${ci.plan_id ?? "none"}-${idx}`}
                            className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20"
                          >
                            <img
                              src={ci.course_thumbnail ?? "/placeholder.png"}
                              alt={ci.course_title || "Video course"}
                              className="h-14 w-14 rounded-lg object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {ci.course_title || `Course #${ci.course_id}`}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-300">
                                {ci.plan_name ? ci.plan_name : ci.plan_id ? `Plan #${ci.plan_id}` : "Course plan"}
                                {ci.qty > 1 ? ` • Qty ${ci.qty}` : ""}
                              </div>
                            </div>
                            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                              Included
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                );
              })}
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
                    : selectedGroups.length > 0
                      ? "Selected items and combos will checkout together."
                      : "Build your checkout by tapping items below."}
                </p>
                {hasCombos ? (
                  <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
                    Combo bundles are grouped here so users can see which items checkout together.
                  </div>
                ) : null}
                {selectedComboCourseCount > 0 ? (
                  <p className="text-xs text-blue-600 mb-2">
                    Includes {selectedComboCourseCount} video course item(s).
                  </p>
                ) : null}
                {selectedComboCourseItems.length > 0 ? (
                  <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2">
                    <div className="text-[11px] font-semibold text-blue-700 mb-1">Included Courses</div>
                    <div className="space-y-1">
                      {selectedComboCourseItems.map((ci, idx) => (
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
                  {displayGroups.map((group) => {
                    const isSelected = selectedCartGroupKeys.includes(group.groupId);
                    return (
                      <button
                        key={group.groupId}
                        type="button"
                        onClick={() => handleToggleGroup(group.groupId)}
                        className={`w-full flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-950/40"
                            : "border-gray-200 hover:border-blue-200 hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-900"
                        }`}
                      >
                        <div>
                          {group.comboId !== null ? (
                            <>
                              <div className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white dark:bg-blue-500/90">
                                Combo
                              </div>
                              <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {group.comboTitle || "Special combo"}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {group.cartItems.length} cart item(s)
                                {group.comboCourseCount > 0 ? ` + ${group.comboCourseCount} course(s)` : ""}
                              </div>
                              <div className="mt-2 space-y-1">
                                {group.cartItems.slice(0, 3).map((comboItem) => (
                                  <div key={comboItem.cart_item_id} className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {comboItem.title}
                                    {comboItem.qty > 1 ? ` x${comboItem.qty}` : ""}
                                  </div>
                                ))}
                                {group.cartItems.length > 3 ? (
                                  <div className="text-[11px] font-medium text-blue-600 dark:text-blue-300">
                                    +{group.cartItems.length - 3} more item(s)
                                  </div>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {group.representative.title}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {group.representative.duration_label}
                                {group.representative.device_label ? ` • ${group.representative.device_label}` : ""}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Qty: {group.representative.qty}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatPrice(group.comboPrice ?? group.rawSubtotal)}
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
                  <Row label="Selected Groups" value={String(selectedGroupCount)} />
                  <Row label="Selected Qty" value={String(selectedQtyCount)} />
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
                  disabled={selectedGroups.length === 0}
                >
                  {selectedGroups.length > 0 ? `Checkout ${selectedGroupCount} Selection(s)` : t("cart.checkout")}
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

