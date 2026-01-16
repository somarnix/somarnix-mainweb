"use client";

import { useEffect, useState } from "react";

type OrderStatus = "PENDING" | "PAID" | "APPROVED" | "CANCELLED";

type Order = {
  id: number;
  status: OrderStatus;
  total_amount?: number | string;
  total?: number | string;
  created_at?: string;
  createdAt?: string;
  user?: { id: number; email?: string };
  user_email?: string;
};

export default function AdminTest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      // ✅ change this if your route is different:
      // e.g. "/api/admin/orders"
      const res = await fetch("/api/admin/orders", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Failed to load orders");
        setOrders([]);
        return;
      }

      // Accept: { orders: [...] } or just [...]
      const list: Order[] = Array.isArray(data) ? data : data.orders ?? [];
      setOrders(list);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: number) => {
    // ✅ change to your approve route if needed
    const res = await fetch(`/api/admin/orders/${id}/approve`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data?.message || "Approve failed");
      return;
    }
    load();
  };

  const cancel = async (id: number) => {
    // ✅ change to your cancel route if needed
    const res = await fetch(`/api/admin/orders/${id}/cancel`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data?.message || "Cancel failed");
      return;
    }
    load();
  };

  const getTotal = (o: Order) => {
    const v = o.total_amount ?? o.total ?? 0;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : 0;
  };

  const getDate = (o: Order) => o.created_at ?? o.createdAt ?? "";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Orders</h1>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading && <div>Loading...</div>}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Order ID</th>
                <th className="p-3">User</th>
                <th className="p-3">Status</th>
                <th className="p-3">Total</th>
                <th className="p-3">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => {
                const status = o.status;
                const canApprove = status === "PAID"; // your rule
                const canCancel = status === "PENDING" || status === "PAID";

                return (
                  <tr key={o.id} className="border-t">
                    <td className="p-3 font-medium">#{o.id}</td>
                    <td className="p-3">
                      {o.user?.email || o.user_email || o.user?.id || "-"}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full border">
                        {status}
                      </span>
                    </td>
                    <td className="p-3">${getTotal(o).toFixed(2)}</td>
                    <td className="p-3">{getDate(o) || "-"}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(o.id)}
                          disabled={!canApprove}
                          className="px-3 py-1 rounded-lg bg-green-600 text-white disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => cancel(o.id)}
                          disabled={!canCancel}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {orders.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={6}>
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
