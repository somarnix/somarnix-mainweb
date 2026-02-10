"use client";

import { useEffect, useMemo, useState } from "react";
import type { OrderStatus } from "@/lib/order-status";
import { getStatusLabel } from "@/app/pages/order-page/orderStatusConfig";

/* ================= TYPES ================= */

type OrderState = OrderStatus;
type OrderResult = "none" | "done" | "failed";

type Order = {
  id: number;
  order_number?: string | null;
  user_id: number;
  state: OrderState;
  result: OrderResult;
  total?: number | string | null;
  created_at?: string | null;
  user_email?: string | null;

  /* delivery (optional) */
  delivery_title?: string | null;
  delivery_message?: string | null;
  delivered_at?: string | null;
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

/* ================= PAGE ================= */

export default function AdminOrdersPage() {
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
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const [licenseSuccess, setLicenseSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filterState, setFilterState] =
    useState<"all" | OrderState>("all");

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

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter(o => {
      if (filterState !== "all" && o.state !== filterState) {
        return false;
      }

      if (!q) return true;

      return (
        String(o.id).includes(q) ||
        (o.user_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, filterState]);

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

  const openLicense = async (order: Order) => {
    setLicenseOpen(true);
    setLicenseOrder(order);
    setLicenseTools([]);
    setLicenseToolId("");
    setLicenseError("");
    setLicenseSuccess("");
    setLicenseLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load order tools");
      }
      const parsed = (Array.isArray(data.items) ? data.items : [])
        .filter((it: OrderInfoItem) => (it.category_name || "").toLowerCase() === "tools")
        .map((it: OrderInfoItem) => ({
          productId: Number(it.product_id || 0),
          slug: String(it.product_slug || ""),
          title: String(it.product_title || ""),
        }))
        .filter((it: OrderToolItem) => it.productId > 0 && it.slug);
      const unique = Array.from(
        new Map(parsed.map((it: OrderToolItem) => [it.productId, it])).values()
      );
      setLicenseTools(unique);
      if (unique[0]) {
        setLicenseToolId(String(unique[0].productId));
      }
      if (unique.length === 0) {
        setLicenseError("No tool item found in this order.");
      }
    } catch (e) {
      setLicenseError(e instanceof Error ? e.message : "Failed to load tool items");
    } finally {
      setLicenseLoading(false);
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

  /* ================= RENDER ================= */

  return (
    <div className="py-6 px-4">
      <h1 className="text-2xl font-bold md:mb-6 mb-0">
        Admin Orders
      </h1>

      {/* Controls */}
      <div className="space-y-2 md:space-y-0 md:flex md:gap-3 md:mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search order id or email"
          className="border rounded-lg px-3 py-2 text-sm w-full md:w-72"
        />

        <div className="flex gap-2">
          <select
            value={filterState}
            onChange={e =>
              setFilterState(e.target.value as "all" | OrderState)
            }
            className="border rounded-lg px-3 py-2 text-sm w-44 sm:w-48 md:w-48 bg-white"
          >
            <option value="all">All states</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="delivering">delivering</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
            <option value="resolution">resolution</option>
          </select>

          <button
            onClick={load}
            className="border rounded-lg px-4 py-2 text-sm bg-white hover:bg-gray-50 flex-1 md:flex-none"
          >
            Refresh
          </button>
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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Order</th>
                    <th className="p-3 text-left">Order ID</th>
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-left">State</th>
                    <th className="p-3 text-left">Result</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-left">Delivery</th>
                    <th className="p-3 text-left">Created</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredOrders.map(o => (
                    <tr key={o.id}>
                      <td className="p-3 font-medium">#{o.id}</td>
                      <td className="p-3">{o.order_number || "-"}</td>
                      <td className="p-3">{o.user_email ?? "-"}</td>
                      <td className="p-3">
                        {getStatusLabel(o.state, "en")}
                      </td>
                      <td className="p-3">{o.result}</td>
                      <td className="p-3 text-right font-semibold">
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

                      <td className="p-3">{formatDate(o.created_at)}</td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => void openEdit(o)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openInfo(o.id)}
                          className="ml-2 bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-200"
                        >
                          Info
                        </button>
                        {(o.state === "completed" || o.result === "done") && (
                          <button
                            onClick={() => openLicense(o)}
                            className="ml-2 bg-emerald-600 text-white px-3 py-1 rounded text-xs"
                          >
                            License
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-gray-500">
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
            {filteredOrders.map(o => (
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
                    <div>{getStatusLabel(o.state, "en")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Result</div>
                    <div>{o.result}</div>
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
                  className="mt-3 w-full bg-blue-600 text-white px-3 py-2 rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => openInfo(o.id)}
                  className="mt-2 w-full bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200"
                >
                  Info
                </button>
                {(o.state === "completed" || o.result === "done") && (
                  <button
                    onClick={() => openLicense(o)}
                    className="mt-2 w-full bg-emerald-600 text-white px-3 py-2 rounded text-sm"
                  >
                    License
                  </button>
                )}
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
                  State
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
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="delivering">delivering</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                  <option value="resolution">resolution</option>
                </select>
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
                          {tool.title}
                        </option>
                      ))}
                    </select>
                  </div>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Order Info #{infoOrderId}</h2>
              <button
                onClick={() => {
                  setInfoOpen(false);
                  setInfoItems([]);
                  setInfoOrderId(null);
                  setInfoError("");
                }}
                className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {infoLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : infoError ? (
              <div className="text-sm text-red-600">{infoError}</div>
            ) : infoItems.length === 0 ? (
              <div className="text-sm text-gray-500">No order info found.</div>
            ) : (
              <div className="space-y-4">
                {infoItems.map((item) => {
                  const entries = parseOrderInfo(item.order_info_json);
                  return (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="font-semibold">
                        {item.product_title || "Order item"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Qty: {item.qty ?? "-"} • Unit: {item.unit_price ?? "-"}
                      </div>
                      {entries.length > 0 ? (
                        <div className="mt-2 space-y-1 text-sm">
                          {entries.map((e) => (
                            <div key={`${item.id}-${e.key}`} className="flex gap-2">
                              <span className="font-semibold">
                                {resolveLabel(e.key, parseOrderFields(item.order_fields_json))}:
                              </span>
                              <span className="break-all">{e.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-500">
                          No order info provided.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
