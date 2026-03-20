"use client";

import { useEffect, useMemo, useState } from "react";
import type { OrderStatus } from "@/lib/order-status";
import { getStatusLabel } from "@/app/pages/order-page/orderStatusConfig";
import PaginationNext from "@/app/components/PaginationNext";
import { MONTH_OPTIONS, getYearMonthKey } from "@/app/lib/admin/dateFilters";
import { exportHtmlTableAsExcel } from "@/app/lib/export/exportHtmlTableAsExcel";

/* ================= TYPES ================= */

type OrderState = OrderStatus;
type OrderResult = "none" | "done" | "failed";
type PaymentStateFilter = "all" | "waiting" | "approved" | "declined";

type Order = {
  id: number;
  order_number?: string | null;
  user_id: number;
  state: OrderState;
  result: OrderResult;
  payment_state?: "waiting" | "approved" | "declined" | null;
  total?: number | string | null;
  created_at?: string | null;
  user_email?: string | null;

  /* delivery (optional) */
  delivery_title?: string | null;
  delivery_message?: string | null;
  delivered_at?: string | null;
  categories?: string | null;
};

type ToolProduct = {
  id: number;
  title: string;
  slug: string;
};

type OrderInfoItem = {
  id: number;
  product_id?: number | null;
  product_slug?: string | null;
  category_name?: string | null;
  product_title: string | null;
  qty: number | string | null;
  unit_price: number | string | null;
  order_info_json: string | null;
  order_fields_json?: string | null;
};

type OrderToolItem = {
  productId: number;
  slug: string;
  title: string;
};

/* ================= HELPERS ================= */

function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatTotal(o: Order): number {
  const v = o.total ?? 0;
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value?: number | string | null): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  const safe = Number.isFinite(n) ? n : 0;
  return `$${safe.toFixed(2)}`;
}

function parseOrderInfo(raw?: string | null): Array<{ key: string; value: string }> {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    return Object.entries(parsed).map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : String(value ?? ""),
    }));
  } catch {
    return [];
  }
}

function parseOrderFields(raw?: string | null): Array<{ key: string; label: string }> {
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
        return { key, label };
      })
      .filter(Boolean) as Array<{ key: string; label: string }>;
  } catch {
    return [];
  }
}

function resolveLabel(key: string, fields: Array<{ key: string; label: string }>) {
  const found = fields.find((f) => f.key === key);
  return found ? found.label : key;
}

function parseToolSlugFromText(value?: string | null): string {
  if (!value) return "";
  const fromTitle = value.match(/tool access:\s*([^\s]+)/i);
  if (fromTitle?.[1]) return String(fromTitle[1]).trim();
  const fromMessage = value.match(/\(([a-z0-9-]+)\)/i);
  if (fromMessage?.[1]) return String(fromMessage[1]).trim();
  return "";
}

function getToolOptionLabel(tool: ToolProduct): string {
  const slug = tool.slug.trim();
  const title = tool.title.trim();
  if (!title || title.toLowerCase() === slug.toLowerCase()) return slug;
  return `${slug} (${title})`;
}

function getAdminStateLabel(state: OrderState): string {
  return getStatusLabel(state, "en");
}

function stateBadgeClass(state: OrderState): string {
  if (state === "completed") {
    return "inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700";
  }
  if (state === "approved" || state === "delivering") {
    return "inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700";
  }
  if (state === "cancelled" || state === "resolution") {
    return "inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700";
  }
  return "inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600";
}

function resultBadgeClass(result: OrderResult): string {
  if (result === "done") {
    return "inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700";
  }
  if (result === "failed") {
    return "inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700";
  }
  return "inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600";
}

function getOrderPaymentLabel(
  paymentState: Order["payment_state"],
  state: OrderState,
  result: OrderResult
): string {
  if (paymentState === "approved") return "Approve payment";
  if (paymentState === "declined") return "Decline payment";
  if (paymentState === "waiting") return "Waiting payment";
  if (state === "cancelled") return "Decline payment";
  if (state === "approved" || state === "delivering" || state === "completed" || result === "done") {
    return "Approve payment";
  }
  return "Waiting payment";
}

function paymentBadgeClass(
  paymentState: Order["payment_state"],
  state: OrderState,
  result: OrderResult
): string {
  const payment = getOrderPaymentFilterValue(paymentState, state, result);
  if (payment === "approved") {
    return "inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700";
  }
  if (payment === "declined") {
    return "inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700";
  }
  return "inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600";
}

function getOrderPaymentFilterValue(
  paymentState: Order["payment_state"],
  state: OrderState,
  result: OrderResult
): Exclude<PaymentStateFilter, "all"> {
  if (paymentState === "approved") return "approved";
  if (paymentState === "declined") return "declined";
  if (paymentState === "waiting") return "waiting";
  if (state === "cancelled") return "declined";
  if (state === "approved" || state === "delivering" || state === "completed" || result === "done") {
    return "approved";
  }
  return "waiting";
}

/* ================= PAGE ================= */

export default function AdminOrdersPage() {
  const PAGE_SIZE = 10;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tools, setTools] = useState<ToolProduct[]>([]);
  const [selectedToolSlug, setSelectedToolSlug] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItems, setInfoItems] = useState<OrderInfoItem[]>([]);
  const [infoOrderId, setInfoOrderId] = useState<number | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [licenseOrder, setLicenseOrder] = useState<Order | null>(null);
  const [licenseTools, setLicenseTools] = useState<OrderToolItem[]>([]);
  const [licenseToolId, setLicenseToolId] = useState("");
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseMaxDevices, setLicenseMaxDevices] = useState("");
  const [licenseExpiresAt, setLicenseExpiresAt] = useState("");
  const [licenseLoading] = useState(false);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const [licenseSuccess, setLicenseSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<"all" | OrderState>("all");
  const [filterPayment, setFilterPayment] = useState<PaymentStateFilter>("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [page, setPage] = useState(1);

  /* ===== EDIT MODAL STATE ===== */
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editState, setEditState] =
    useState<OrderState>("pending");
  const [editResult, setEditResult] =
    useState<OrderResult>("none");
  const [editDeliveryTitle, setEditDeliveryTitle] =
    useState("");
  const [editDeliveryMessage, setEditDeliveryMessage] =
    useState("");

  /* ================= LOAD ================= */

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/orders", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to load orders");
        return;
      }

      setOrders(data.orders ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetch("/api/products?category=tools")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTools(
            data
              .map((t) => ({
                id: Number(t.id),
                title: String(t.title ?? ""),
                slug: String(t.slug ?? ""),
              }))
              .filter((t) => t.id > 0 && t.slug)
              .sort((a, b) => a.slug.localeCompare(b.slug))
          );
        }
      })
      .catch(() => setTools([]));
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void load();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /* ================= FILTER ================= */

  const categoryOptions = useMemo(() => {
    const base = ["all", "product", "ai", "game", "program", "tools", "video-course"];
    const set = new Set(base);
    for (const o of orders) {
      for (const c of String(o.categories || "")
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)) {
        set.add(c);
      }
    }
    return Array.from(set);
  }, [orders]);

  const monthOptions = MONTH_OPTIONS;

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      const { year } = getYearMonthKey(o.created_at);
      if (year) set.add(year);
    }
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter(o => {
      if (filterState !== "all" && o.state !== filterState) {
        return false;
      }

      if (
        filterPayment !== "all" &&
        getOrderPaymentFilterValue(o.payment_state, o.state, o.result) !== filterPayment
      ) {
        return false;
      }

      if (filterCategory !== "all") {
        const categories = String(o.categories || "")
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean);
        if (!categories.includes(filterCategory)) return false;
      }

      if (monthFilter !== "all") {
        const { month } = getYearMonthKey(o.created_at);
        const monthNumber = month ? String(Number(month.split("-")[1])) : "";
        if (monthNumber !== monthFilter) return false;
      }

      if (yearFilter !== "all") {
        const { year } = getYearMonthKey(o.created_at);
        if (year !== yearFilter) return false;
      }

      if (!q) return true;

      return (
        String(o.id).includes(q) ||
        String(o.order_number || "").toLowerCase().includes(q) ||
        (o.user_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, filterState, filterPayment, filterCategory, monthFilter, yearFilter]);

  const totalFiltered = filteredOrders.length;
  const filteredAmount = filteredOrders.reduce((sum, o) => sum + formatTotal(o), 0);
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedOrders = filteredOrders.slice(pageStart, pageStart + PAGE_SIZE);
  const selectedInfoOrder = useMemo(
    () => orders.find((o) => o.id === infoOrderId) ?? null,
    [orders, infoOrderId]
  );

  useEffect(() => {
    setPage(1);
  }, [search, filterState, filterPayment, filterCategory, monthFilter, yearFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const deriveResult = (state: OrderState): OrderResult => {
    if (state === "completed") return "done";
    if (state === "cancelled" || state === "resolution") return "failed";
    return "none";
  };

  /* ================= SAVE EDIT ================= */

  const saveEdit = async () => {
    if (!editOrder) return;

    const res = await fetch("/api/admin/orders/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        orderId: editOrder.id,
        state: editState,
        result: editResult,
        delivery_title: editDeliveryTitle || null,
        delivery_message: editDeliveryMessage || null,
      }),
    });

    if (!res.ok) {
      alert("Update failed");
      return;
    }

    setEditOrder(null);
    setSelectedToolSlug("");
    load();
  };

  const openEdit = async (order: Order) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.order) {
        const fresh = data.order as Partial<Order>;
        const merged: Order = {
          ...order,
          state: (fresh.state as OrderState) || order.state,
          result: (fresh.result as OrderResult) || order.result,
          delivery_title:
            typeof fresh.delivery_title === "string" || fresh.delivery_title === null
              ? fresh.delivery_title
              : order.delivery_title,
          delivery_message:
            typeof fresh.delivery_message === "string" || fresh.delivery_message === null
              ? fresh.delivery_message
              : order.delivery_message,
          delivered_at:
            typeof fresh.delivered_at === "string" || fresh.delivered_at === null
              ? fresh.delivered_at
              : order.delivered_at,
        };
        setEditOrder(merged);
        setEditState(merged.state);
        setEditResult((merged.result as OrderResult) ?? deriveResult(merged.state));
        setEditDeliveryTitle(merged.delivery_title ?? "");
        setEditDeliveryMessage(merged.delivery_message ?? "");
        setSelectedToolSlug(
          parseToolSlugFromText(merged.delivery_title) ||
            parseToolSlugFromText(merged.delivery_message)
        );
        return;
      }
    } catch {
      // fallback to current row snapshot
    }

    setEditOrder(order);
    setEditState(order.state);
    setEditResult((order.result as OrderResult) ?? deriveResult(order.state));
    setEditDeliveryTitle(order.delivery_title ?? "");
    setEditDeliveryMessage(order.delivery_message ?? "");
    setSelectedToolSlug(
      parseToolSlugFromText(order.delivery_title) ||
        parseToolSlugFromText(order.delivery_message)
    );
  };

  const openInfo = async (orderId: number) => {
    setInfoOpen(true);
    setInfoOrderId(orderId);
    setInfoLoading(true);
    setInfoError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load order info");
      }
      setInfoItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setInfoItems([]);
      setInfoError(err instanceof Error ? err.message : "Failed to load order info");
    } finally {
      setInfoLoading(false);
    }
  };

  const applyToolDelivery = async (slugArg?: string) => {
    const slug = slugArg ?? selectedToolSlug;
    if (!editOrder || !slug) return;
    const fallbackTitle = `Tool access: ${slug}`;
    setEditDeliveryTitle(fallbackTitle);

    try {
      const res = await fetch(`/api/admin/orders/${editOrder.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.order) {
        setEditDeliveryMessage("");
        return;
      }

      const serverOrder = data.order as Partial<Order>;
      const serverTitle =
        typeof serverOrder.delivery_title === "string" ? serverOrder.delivery_title : null;
      const serverMessage =
        typeof serverOrder.delivery_message === "string" ? serverOrder.delivery_message : "";

      if (serverMessage.toLowerCase().includes(slug.toLowerCase())) {
        setEditDeliveryTitle(serverTitle || "Tool license key");
        setEditDeliveryMessage(serverMessage);
      } else {
        setEditDeliveryMessage("");
      }
    } catch {
      setEditDeliveryMessage("");
    }
  };

  const createLicenseFromOrder = async () => {
    if (!licenseOrder || !licenseToolId) return;
    setLicenseSaving(true);
    setLicenseError("");
    setLicenseSuccess("");
    try {
      const res = await fetch("/api/admin/tool-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: Number(licenseToolId),
          userId: Number(licenseOrder.user_id),
          orderId: Number(licenseOrder.id),
          licenseKey: licenseKeyInput.trim() || undefined,
          maxDevices: licenseMaxDevices.trim() ? Number(licenseMaxDevices) : undefined,
          expiresAt: licenseExpiresAt || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Create license failed");
      }
      setLicenseSuccess(`License created: ${data.licenseKey}`);
      setLicenseKeyInput("");
      setLicenseExpiresAt("");
    } catch (e) {
      setLicenseError(e instanceof Error ? e.message : "Create license failed");
    } finally {
      setLicenseSaving(false);
    }
  };

  const handleRefresh = async () => {
    setSearch("");
    setFilterState("all");
    setFilterPayment("all");
    setFilterCategory("all");
    setMonthFilter("all");
    setYearFilter("all");
    setPage(1);
    await load();
  };

  const exportFilteredToExcel = () => {
    const headers = [
      "Order",
      "Order ID",
      "User",
      "State",
      "Payment",
      "Result",
      "Total",
      "Category",
      "Delivery",
      "Created",
    ];

    const rows = filteredOrders.map((o) => [
      `#${o.id}`,
      o.order_number || "-",
      o.user_email || "-",
      getAdminStateLabel(o.state),
      getOrderPaymentLabel(o.payment_state, o.state, o.result),
      o.result,
      formatTotal(o).toFixed(2),
      o.categories || "-",
      [o.delivery_title || "", o.delivery_message || ""].filter(Boolean).join("\n") || "-",
      formatDate(o.created_at),
    ]);
    const filterSummary = [
      `State: ${filterState}`,
      `Payment: ${filterPayment}`,
      `Category: ${filterCategory}`,
      `Month: ${monthFilter}`,
      `Year: ${yearFilter}`,
      `Search: ${search.trim() || "-"}`,
    ].join(" | ");
    const monthPart = monthFilter !== "all" ? `_${monthFilter}` : "";
    const yearPart = yearFilter !== "all" ? `_${yearFilter}` : "";
    exportHtmlTableAsExcel({
      title: "Orders Report",
      headers,
      rows,
      centeredColumns: [0, 1, 6, 9],
      filterSummary,
      minWidth: "1500px",
      columnWidths: ["90px", "140px", "220px", "130px", "140px", "100px", "95px", "120px", "360px", "170px"],
      fileName: `orders${monthPart}${yearPart}.xls`,
    });
  };

  /* ================= RENDER ================= */

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Admin Orders</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-700">
            Filtered: <span className="font-semibold">{totalFiltered}</span>
            <span className="mx-1 text-gray-400">/</span>
            Total Order: <span className="font-semibold">{orders.length}</span>
            <span className="mx-2 text-gray-300">|</span>
            Sum: <span className="font-semibold">${filteredAmount.toFixed(2)}</span>
          </div>
          <button
            onClick={() => void handleRefresh()}
            className="border rounded-lg px-4 py-2 text-sm bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={exportFilteredToExcel}
            className="border rounded-lg px-4 py-2 text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
            disabled={filteredOrders.length === 0}
          >
            Export Excel
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/admin/test";
              }
            }}
            className="border rounded-lg px-4 py-2 text-sm bg-white hover:bg-gray-50"
          >
            Search payment
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3 mt-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search order id or email"
          className="border rounded-lg px-3 py-2 text-sm w-full"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value as "all" | OrderState)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All states</option>
            <option value="pending">pending</option>
            <option value="approved">Approve</option>
            <option value="delivering">delivering</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
            <option value="resolution">resolution</option>
          </select>
          <select
            value={filterPayment}
            onChange={e => setFilterPayment(e.target.value as PaymentStateFilter)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All payment</option>
            <option value="waiting">Waiting payment</option>
            <option value="approved">Approve payment</option>
            <option value="declined">Decline payment</option>
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white capitalize"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c === "all" ? "All category" : c}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All month</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All year</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* States */}
      {loading && <div>Loading…</div>}
      {!loading && error && (
        <div className="bg-red-50 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* ================= LIST TABLE================= */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow">
          {/* ===== PC TABLE (md and up) ===== */}
          <div className="hidden md:block overflow-x-auto">
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr>
                    <th className="p-3 text-left bg-gray-50">Order</th>
                    <th className="p-3 text-left bg-gray-50">Order ID</th>
                    <th className="p-3 text-left bg-gray-50">User</th>
                    <th className="p-3 text-left bg-gray-50">State</th>
                    <th className="p-3 text-left bg-gray-50">Payment</th>
                    <th className="p-3 text-left bg-gray-50">Result</th>
                    <th className="p-3 text-right bg-gray-50">Total</th>
                    <th className="p-3 text-left bg-gray-50">Delivery</th>
                    <th className="p-3 text-left bg-gray-50">Created</th>
                    <th className="p-3 text-right w-[220px] bg-gray-50">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {pagedOrders.map(o => (
                    <tr key={o.id}>
                      <td className="p-3 align-top font-medium">#{o.id}</td>
                      <td className="p-3 align-top">{o.order_number || "-"}</td>
                      <td className="p-3 align-top">{o.user_email ?? "-"}</td>
                      <td className="p-3 align-top">
                        <span className={stateBadgeClass(o.state)}>
                          {getAdminStateLabel(o.state)}
                        </span>
                      </td>
                      <td className="p-3 align-top">
                        <span className={paymentBadgeClass(o.payment_state, o.state, o.result)}>
                          {getOrderPaymentLabel(o.payment_state, o.state, o.result)}
                        </span>
                      </td>
                      <td className="p-3 align-top">
                        <span className={resultBadgeClass(o.result)}>{o.result}</span>
                      </td>
                      <td className="p-3 align-top text-right font-semibold">
                        ${formatTotal(o).toFixed(2)}
                      </td>

                      <td className="p-3">
                        {o.delivery_title || o.delivery_message ? (
                          <div>
                            <div className="font-medium">
                              {o.delivery_title ?? "Delivery"}
                            </div>
                            <div className="text-gray-500 whitespace-pre-line">
                              {o.delivery_message}
                            </div>
                            {o.delivered_at && (
                              <div className="text-xs text-gray-400">
                                {formatDate(o.delivered_at)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="p-3 align-top">{formatDate(o.created_at)}</td>

                      <td className="p-3 align-top">
                        <div className="flex justify-end items-start gap-2 min-h-[36px]">
                          <button
                            onClick={() => void openEdit(o)}
                            className="inline-flex min-w-[58px] justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openInfo(o.id)}
                            className="inline-flex min-w-[58px] justify-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                          >
                            Info
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== PHONE CARDS (below md) ===== */}
          <div className="md:hidden p-3 space-y-3">
            {pagedOrders.map(o => (
              <div key={o.id} className="border rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">Order #{o.id}</div>
                    <div className="text-xs text-gray-500">
                      Order ID: {o.order_number || "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {o.user_email ?? "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ${formatTotal(o).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(o.created_at)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">State</div>
                    <div>
                      <span className={stateBadgeClass(o.state)}>
                        {getAdminStateLabel(o.state)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Payment</div>
                    <div>
                      <span className={paymentBadgeClass(o.payment_state, o.state, o.result)}>
                        {getOrderPaymentLabel(o.payment_state, o.state, o.result)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Result</div>
                    <div>
                      <span className={resultBadgeClass(o.result)}>{o.result}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-gray-500">Delivery</div>
                  {o.delivery_title || o.delivery_message ? (
                    <div className="mt-1">
                      <div className="font-medium">
                        {o.delivery_title ?? "Delivery"}
                      </div>
                      <div className="text-gray-500 whitespace-pre-line">
                        {o.delivery_message}
                      </div>
                      {o.delivered_at && (
                        <div className="text-xs text-gray-400 mt-1">
                          {formatDate(o.delivered_at)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400">—</div>
                  )}
                </div>

                <button
                  onClick={() => void openEdit(o)}
                  className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => openInfo(o.id)}
                  className="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  Info
                </button>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No orders found
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && filteredOrders.length > PAGE_SIZE && (
        <PaginationNext
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={totalFiltered}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          enableKeyboardShortcuts
        />
      )}


      {/* ================= EDIT MODAL ================= */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              Edit Order #{editOrder.id}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">
                  State (order flow)
                </label>
                <select
                  value={editState}
                  onChange={e => {
                    const next = e.target.value as OrderState;
                    setEditState(next);
                    setEditResult(deriveResult(next));
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="pending">Order is Preparing</option>
                  <option value="approved">Approve</option>
                  <option value="delivering">Delivering</option>
                  <option value="completed">Complete</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="resolution">Resolution</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Payment status is auto-synced from selected state when you save.
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Payment (auto from current state)</label>
                <div className="mt-1">
                  <span className={paymentBadgeClass(editOrder.payment_state, editState, editResult)}>
                    {getOrderPaymentLabel(editOrder.payment_state, editState, editResult)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">
                  Result
                </label>
                <select
                  value={editResult}
                  onChange={e =>
                    setEditResult(
                      e.target.value as OrderResult
                    )
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="none">none</option>
                  <option value="done">done</option>
                  <option value="failed">failed</option>
                </select>
              </div>

              {/* DELIVERY */}
              <div className="border-t pt-4">
                <div className="font-semibold mb-2">
                  Delivery (optional)
                </div>

                <div className="mb-2">
                  <label className="text-sm text-gray-500">
                    Tool access
                  </label>
                  <div className="mt-1">
                    <select
                      value={selectedToolSlug}
                      onChange={e => {
                        const slug = e.target.value;
                        setSelectedToolSlug(slug);
                        if (!slug) return;
                        void applyToolDelivery(slug);
                      }}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select tool</option>
                      {tools.map(tool => (
                        <option key={tool.id} value={tool.slug}>
                          {getToolOptionLabel(tool)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Tool access uses the slug route, for example <code>promt-ai</code> or <code>dog</code>.
                  </p>
                </div>

                <input
                  value={editDeliveryTitle}
                  onChange={e =>
                    setEditDeliveryTitle(e.target.value)
                  }
                  placeholder="Title (ex: Account info, License key)"
                  className="w-full border rounded-lg px-3 py-2 mb-2"
                />

                <textarea
                  value={editDeliveryMessage}
                  onChange={e =>
                    setEditDeliveryMessage(e.target.value)
                  }
                  placeholder="Message to user (username, password, link, etc.)"
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditOrder(null);
                  setSelectedToolSlug("");
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {licenseOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                License for Order #{licenseOrder?.id}
              </h2>
              <button
                onClick={() => {
                  setLicenseOpen(false);
                  setLicenseOrder(null);
                  setLicenseTools([]);
                  setLicenseToolId("");
                  setLicenseError("");
                  setLicenseSuccess("");
                }}
                className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              Buyer: <span className="font-semibold">{licenseOrder?.user_email || "-"}</span>{" "}
              (ID #{licenseOrder?.user_id || "-"})
            </div>

            {licenseError ? (
              <div className="mb-3 text-sm text-red-600">{licenseError}</div>
            ) : null}
            {licenseSuccess ? (
              <div className="mb-3 text-sm text-green-600">{licenseSuccess}</div>
            ) : null}

            {licenseLoading ? (
              <div className="text-sm text-gray-500">Loading tool items...</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">Tool in this order</label>
                  <select
                    value={licenseToolId}
                    onChange={(e) => setLicenseToolId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="">Select tool</option>
                    {licenseTools.map((t) => (
                      <option key={t.productId} value={String(t.productId)}>
                        {t.title} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-500">License key (optional)</label>
                  <input
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder="Auto-generate if empty"
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-500">Max devices (auto if empty)</label>
                    <input
                      type="number"
                      min={1}
                      value={licenseMaxDevices}
                      onChange={(e) => setLicenseMaxDevices(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Expires at (optional)</label>
                    <input
                      type="datetime-local"
                      value={licenseExpiresAt}
                      onChange={(e) => setLicenseExpiresAt(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </div>
                </div>

                <button
                  onClick={createLicenseFromOrder}
                  disabled={!licenseOrder || !licenseToolId || licenseSaving}
                  className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {licenseSaving ? "Creating..." : "Create License Key"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {infoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Order Info #{infoOrderId}</h2>
              <button
                onClick={() => {
                  setInfoOpen(false);
                  setInfoItems([]);
                  setInfoOrderId(null);
                  setInfoError("");
                }}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[74vh] space-y-4 overflow-y-auto pr-1">
              {selectedInfoOrder && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Order number</div>
                      <div className="font-semibold">{selectedInfoOrder.order_number || "-"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">User</div>
                      <div className="font-semibold">{selectedInfoOrder.user_email || "-"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">State</div>
                      <span className={stateBadgeClass(selectedInfoOrder.state)}>
                        {getAdminStateLabel(selectedInfoOrder.state)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Payment</div>
                      <span
                        className={paymentBadgeClass(
                          selectedInfoOrder.payment_state,
                          selectedInfoOrder.state,
                          selectedInfoOrder.result
                        )}
                      >
                        {getOrderPaymentLabel(
                          selectedInfoOrder.payment_state,
                          selectedInfoOrder.state,
                          selectedInfoOrder.result
                        )}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Result</div>
                      <span className={resultBadgeClass(selectedInfoOrder.result)}>
                        {selectedInfoOrder.result}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="font-semibold text-blue-700">{formatMoney(selectedInfoOrder.total)}</div>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <div className="text-xs text-gray-500">Created</div>
                      <div>{formatDate(selectedInfoOrder.created_at)}</div>
                    </div>
                  </div>
                </div>
              )}

              {infoLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : infoError ? (
                <div className="text-sm text-red-600">{infoError}</div>
              ) : infoItems.length === 0 ? (
                <div className="text-sm text-gray-500">No order info found.</div>
              ) : (
                <div className="space-y-3">
                  {infoItems.map((item) => {
                    const entries = parseOrderInfo(item.order_info_json);
                    const fields = parseOrderFields(item.order_fields_json);
                    const qty = typeof item.qty === "string" ? Number(item.qty) : (item.qty ?? 0);
                    const unit = typeof item.unit_price === "string" ? Number(item.unit_price) : (item.unit_price ?? 0);
                    const subtotal = Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : 0;

                    return (
                      <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold text-gray-900">{item.product_title || "Order item"}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              Qty: {item.qty ?? "-"} | Unit: {formatMoney(item.unit_price)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Subtotal</div>
                            <div className="font-semibold text-blue-700">{formatMoney(subtotal)}</div>
                          </div>
                        </div>

                        {entries.length > 0 ? (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {entries.map((e) => (
                              <div
                                key={`${item.id}-${e.key}`}
                                className="rounded-md bg-gray-50 px-3 py-2 text-sm"
                              >
                                <span className="font-semibold text-gray-700">{resolveLabel(e.key, fields)}:</span>{" "}
                                <span className="break-all text-gray-900">{e.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-gray-500">No order info provided.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!infoLoading && !infoError && infoItems.length > 0 && (
                <div className="flex justify-end pt-1">
                  <div className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                    Items: <span className="font-semibold">{infoItems.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
