"use client";

import { useEffect, useMemo, useState } from "react";
import type { OrderStatus } from "@/lib/order-status";
import { getStatusLabel } from "@/app/pages/order-page/orderStatusConfig";

/* ================= TYPES ================= */

type OrderState = OrderStatus;
type OrderResult = "none" | "done" | "failed";

type Order = {
  id: number;
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

/* ================= PAGE ================= */

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tools, setTools] = useState<ToolProduct[]>([]);
  const [selectedToolSlug, setSelectedToolSlug] = useState("");

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
                          onClick={() => {
                            setEditOrder(o);
                            setEditState(o.state);
                            setEditResult(
                              (o.result as OrderResult) ??
                                deriveResult(o.state)
                            );
                            setEditDeliveryTitle(o.delivery_title ?? "");
                            setEditDeliveryMessage(o.delivery_message ?? "");
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-gray-500">
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
                  onClick={() => {
                    setEditOrder(o);
                    setEditState(o.state);
                    setEditResult(
                      (o.result as OrderResult) ??
                        deriveResult(o.state)
                    );
                    setEditDeliveryTitle(o.delivery_title ?? "");
                    setEditDeliveryMessage(o.delivery_message ?? "");
                  }}
                  className="mt-3 w-full bg-blue-600 text-white px-3 py-2 rounded text-sm"
                >
                  Edit
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
                  <div className="flex gap-2 mt-1">
                    <select
                      value={selectedToolSlug}
                      onChange={e => setSelectedToolSlug(e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2"
                    >
                      <option value="">Select tool</option>
                      {tools.map(tool => (
                        <option key={tool.id} value={tool.slug}>
                          {tool.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="px-3 py-2 border rounded-lg text-sm"
                      onClick={() => {
                        if (!selectedToolSlug) return;
                        const title = `Tool access: ${selectedToolSlug}`;
                        setEditDeliveryTitle(title);
                        setEditDeliveryMessage("");
                      }}
                    >
                      Set tool
                    </button>
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
                onClick={() => setEditOrder(null)}
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
    </div>
  );
}
