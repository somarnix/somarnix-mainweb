"use client";

import { useEffect, useState } from "react";

type Payment = {
  id: number;
  order_id: number;
  order_number: string | null;
  user_email: string | null;
  account_id: string | null;
  payment_id: string | null;
  payment_apv: string | null;
  paid_at: string | null;
  method: string | null;
  total: number | string | null;
};

export default function AdminTest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/payments", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to load payments");
        setPayments([]);
        return;
      }

      const list: Payment[] = Array.isArray(data) ? data : data.payments ?? [];
      setPayments(list);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getTotal = (p: Payment) => {
    const v = p.total ?? 0;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : 0;
  };

  const getDate = (p: Payment) => p.paid_at ?? "";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
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
                <th className="p-3">Payment ID</th>
                <th className="p-3">Order</th>
                <th className="p-3">User</th>
                <th className="p-3">Method</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Paid at</th>
                <th className="p-3">Account</th>
              </tr>
            </thead>

            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-medium">#{p.id}</td>
                  <td className="p-3">{p.order_number ? `#${p.order_number}` : "-"}</td>
                  <td className="p-3">{p.user_email || "-"}</td>
                  <td className="p-3">{p.method || "-"}</td>
                  <td className="p-3">${getTotal(p).toFixed(2)}</td>
                  <td className="p-3">{getDate(p) || "-"}</td>
                  <td className="p-3">
                    <div className="text-xs text-gray-600">
                      {p.account_id || "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.payment_id || "-"} {p.payment_apv ? `• ${p.payment_apv}` : ""}
                    </div>
                  </td>
                </tr>
              ))}

              {payments.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={7}>
                    No payments found.
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
