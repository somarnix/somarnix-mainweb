"use client";

import { useEffect, useMemo, useState } from "react";

/* ================= TYPES ================= */

type OrderState = "pending" | "approved" | "cancelled";
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
    load();
  };

  /* ================= RENDER ================= */

  return (
    <div>
      <h1 className="text-2xl font-bold md:mb-6 mb-0">
        Admin Orders
      </h1>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:gap-3 md:mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search order id or email"
          className="border rounded-lg px-3 py-2 text-sm w-full md:w-72"
        />

        <select
          value={filterState}
          onChange={e =>
            setFilterState(
              e.target.value as "all" | OrderState
            )
          }
          className="border rounded-lg px-3 py-2 text-sm w-full md:w-48"
        >
          <option value="all">All states</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="cancelled">cancelled</option>
        </select>

        <button
          onClick={load}
          className="border rounded-lg px-4 py-2 text-sm bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* States */}
      {loading && <div>Loading…</div>}
      {!loading && error && (
        <div className="bg-red-50 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 hidden md:table-header-group">
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

            <tbody>
              {filteredOrders.map(o => (
                <tr
                  key={o.id}
                  className="block md:table-row border rounded-xl md:border-0 md:rounded-none mb-4 md:mb-0"
                >
                  <td className="p-3 block md:table-cell font-medium">
                    <span className="md:hidden text-xs text-gray-500">Order</span>
                    #{o.id}
                  </td>

                  <td className="p-3 block md:table-cell">
                    <span className="md:hidden text-xs text-gray-500">User</span>
                    {o.user_email ?? "-"}
                  </td>

                  <td className="p-3 block md:table-cell">
                    <span className="md:hidden text-xs text-gray-500">State</span>
                    {o.state}
                  </td>

                  <td className="p-3 block md:table-cell">
                    <span className="md:hidden text-xs text-gray-500">Result</span>
                    {o.result}
                  </td>

                  <td className="p-3 block md:table-cell md:text-right font-semibold">
                    <span className="md:hidden text-xs text-gray-500">Total</span>
                    ${formatTotal(o).toFixed(2)}
                  </td>

                  <td className="p-3 block md:table-cell text-sm">
                    <span className="md:hidden text-xs text-gray-500">Delivery</span>
                    {o.delivery_title || o.delivery_message ? (
                      <div>
                        <div className="font-medium">
                          {o.delivery_title ?? "Delivery"}
                        </div>
                        <div className="text-gray-500 whitespace-pre-line">
                          {o.delivery_message?.split("\n").map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
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

                  <td className="p-3 block md:table-cell">
                    <span className="md:hidden text-xs text-gray-500">Created</span>
                    {formatDate(o.created_at)}
                  </td>

                  <td className="p-3 block md:table-cell md:text-right">
                    <span className="md:hidden text-xs text-gray-500">Action</span>
                    <button
                      onClick={() => {
                        setEditOrder(o);
                        setEditState(o.state);
                        setEditResult(o.result);
                        setEditDeliveryTitle(o.delivery_title ?? "");
                        setEditDeliveryMessage(o.delivery_message ?? "");
                      }}
                      className="w-full md:w-auto bg-blue-600 text-white px-3 py-1 rounded text-xs"
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
                <label className="text-sm text-gray-500">State</label>
                <select
                  value={editState}
                  onChange={e =>
                    setEditState(e.target.value as OrderState)
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500">Result</label>
                <select
                  value={editResult}
                  onChange={e =>
                    setEditResult(e.target.value as OrderResult)
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="none">none</option>
                  <option value="done">done</option>
                  <option value="failed">failed</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <div className="font-semibold mb-2">
                  Delivery (optional)
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
                  placeholder="Message to user"
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
