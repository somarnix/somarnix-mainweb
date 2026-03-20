"use client";

import { useEffect, useMemo, useState } from "react";
import PaginationNext from "@/app/components/PaginationNext";
import { MONTH_OPTIONS, getYearMonthKey } from "@/app/lib/admin/dateFilters";
import { exportHtmlTableAsExcel } from "@/app/lib/export/exportHtmlTableAsExcel";

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
  state: string | null;
  result: string | null;
  payment_state?: string | null;
  admin_decision?: string | null;
  decision_note?: string | null;
  categories: string | null;
};

type Decision = "approve" | "decline";

function normalizeDecision(adminDecision?: string | null, paymentState?: string | null, state?: string | null) {
  const ad = String(adminDecision || "").toLowerCase();
  if (ad === "approved") return "approved";
  if (ad === "declined") return "declined";
  if (ad === "waiting") return "waiting";
  const ps = String(paymentState || "").toLowerCase();
  if (ps === "approved") return "approved";
  if (ps === "declined") return "declined";
  if (ps === "waiting") return "waiting";
  const s = String(state || "").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "cancelled") return "declined";
  return "waiting";
}

function paymentBadgeClass(status: string) {
  if (status === "approved") {
    return "inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700";
  }
  if (status === "declined") {
    return "inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700";
  }
  return "inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600";
}

function compactNoteLines(value?: string | null, maxLines = 4, maxCharsPerLine = 56) {
  const raw = String(value || "").trim();
  if (!raw) return ["-"];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sliced = lines.slice(0, maxLines).map((line) =>
    line.length > maxCharsPerLine ? `${line.slice(0, maxCharsPerLine)}...` : line
  );
  if (lines.length > maxLines) sliced.push("...");
  return sliced;
}

export default function AdminPayment() {
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [decision, setDecision] = useState<Decision>("approve");
  const [note, setNote] = useState("");

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
        setPage(1);
        return;
      }

      const list: Payment[] = Array.isArray(data) ? data : data.payments ?? [];
      setPayments(list);
      setPage(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const categoryOptions = useMemo(() => {
    const base = ["all", "product", "ai", "game", "program", "tools", "video-course"];
    const set = new Set(base);
    for (const p of payments) {
      for (const c of String(p.categories || "")
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)) {
        set.add(c);
      }
    }
    return Array.from(set);
  }, [payments]);

  const monthOptions = MONTH_OPTIONS;

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of payments) {
      const { year } = getYearMonthKey(p.paid_at);
      if (year) set.add(year);
    }
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (q) {
        const orderNo = String(p.order_number || "").toLowerCase();
        const email = String(p.user_email || "").toLowerCase();
        const paymentNo = String(p.id || "").toLowerCase();
        if (!orderNo.includes(q) && !email.includes(q) && !paymentNo.includes(q)) {
          return false;
        }
      }

      if (stateFilter !== "all") {
        const d = normalizeDecision(p.admin_decision, p.payment_state, p.state);
        if (d !== stateFilter) return false;
      }

      if (categoryFilter !== "all") {
        const categories = String(p.categories || "")
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean);
        if (!categories.includes(categoryFilter)) return false;
      }

      if (monthFilter !== "all") {
        const { month } = getYearMonthKey(p.paid_at);
        const monthNumber = month ? String(Number(month.split("-")[1])) : "";
        if (monthNumber !== monthFilter) return false;
      }

      if (yearFilter !== "all") {
        const { year } = getYearMonthKey(p.paid_at);
        if (year !== yearFilter) return false;
      }

      return true;
    });
  }, [payments, search, stateFilter, categoryFilter, monthFilter, yearFilter]);

  const totalFiltered = filtered.length;
  const filteredAmount = filtered.reduce((sum, p) => {
    const v = p.total ?? 0;
    const n = typeof v === "string" ? Number(v) : v;
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedPayments = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, stateFilter, categoryFilter, monthFilter, yearFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const getTotal = (p: Payment) => {
    const v = p.total ?? 0;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : 0;
  };

  const openEdit = (p: Payment) => {
    setEditPayment(p);
    const d = normalizeDecision(p.admin_decision, p.payment_state, p.state);
    setDecision(d === "declined" ? "decline" : "approve");
    setNote(String(p.decision_note || ""));
  };

  const saveDecision = async () => {
    if (!editPayment) return;
    setSavingId(editPayment.id);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentId: editPayment.id,
          decision,
          note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update payment");
      await load();
      setEditPayment(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update payment");
    } finally {
      setSavingId(null);
    }
  };

  const handleRefresh = async () => {
    setSearch("");
    setStateFilter("all");
    setCategoryFilter("all");
    setMonthFilter("all");
    setYearFilter("all");
    setPage(1);
    await load();
  };

  const exportFilteredToExcel = () => {
    const headers = [
      "Payment ID",
      "Order",
      "User",
      "Method",
      "Category",
      "Payment Status",
      "Amount",
      "Paid at",
      "Decision Note",
      "Account ID",
      "Payment ID Ref",
      "Payment APV",
    ];

    const rows = filtered.map((p) => {
      const paymentStatus = normalizeDecision(p.admin_decision, p.payment_state, p.state);
      const paymentLabel =
        paymentStatus === "approved"
          ? "Approve payment"
          : paymentStatus === "declined"
            ? "Decline payment"
            : "Waiting payment";
      return [
        `#${p.id}`,
        p.order_number ? `#${p.order_number}` : "-",
        p.user_email || "-",
        p.method || "-",
        p.categories || "-",
        paymentLabel,
        getTotal(p).toFixed(2),
        p.paid_at || "-",
        p.decision_note || "-",
        p.account_id || "-",
        p.payment_id || "-",
        p.payment_apv || "-",
      ];
    });

    const filterSummary = [
      `State: ${stateFilter}`,
      `Category: ${categoryFilter}`,
      `Month: ${monthFilter}`,
      `Year: ${yearFilter}`,
      `Search: ${search.trim() || "-"}`,
    ].join(" | ");
    const monthPart = monthFilter !== "all" ? `_${monthFilter}` : "";
    const yearPart = yearFilter !== "all" ? `_${yearFilter}` : "";
    exportHtmlTableAsExcel({
      title: "Payments Report",
      headers,
      rows,
      centeredColumns: [0, 1, 6, 7],
      filterSummary,
      minWidth: "1600px",
      columnWidths: ["95px", "135px", "220px", "120px", "120px", "150px", "95px", "145px", "360px", "145px", "130px", "130px"],
      fileName: `payments${monthPart}${yearPart}.xls`,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-700">
            Filtered: <span className="font-semibold">{totalFiltered}</span>
            <span className="mx-1 text-gray-400">/</span>
            Total Payment: <span className="font-semibold">{payments.length}</span>
            <span className="mx-2 text-gray-300">|</span>
            Sum: <span className="font-semibold">${filteredAmount.toFixed(2)}</span>
          </div>
          <button
            onClick={() => void handleRefresh()}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={exportFilteredToExcel}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
            disabled={filtered.length === 0}
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="space-y-3 py-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order number / gmail"
          className="border rounded-lg px-3 py-2 w-full"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All payment</option>
            <option value="waiting">Waiting payment</option>
            <option value="approved">Approve payment</option>
            <option value="declined">Decline payment</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 capitalize"
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
            className="border rounded-lg px-3 py-2"
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
            className="border rounded-lg px-3 py-2"
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

      {loading && <div>Loading...</div>}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow">
          <div className="hidden md:block overflow-x-auto">
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="text-left">
                    <th className="p-3">Payment ID</th>
                    <th className="p-3">Order</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Paid at</th>
                    <th className="p-3">Note</th>
                    <th className="p-3">Account</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {pagedPayments.map((p) => (
                    <tr key={p.id} className="border-t">
                      {(() => {
                        const paymentStatus = normalizeDecision(p.admin_decision, p.payment_state, p.state);
                        const paymentLabel =
                          paymentStatus === "approved"
                            ? "Approve payment"
                            : paymentStatus === "declined"
                              ? "Decline payment"
                              : "Waiting payment";
                        return (
                          <>
                      <td className="p-3 font-medium">#{p.id}</td>
                      <td className="p-3">{p.order_number ? `#${p.order_number}` : "-"}</td>
                      <td className="p-3">{p.user_email || "-"}</td>
                      <td className="p-3">{p.method || "-"}</td>
                      <td className="p-3 capitalize">{p.categories || "-"}</td>
                      <td className="p-3">
                        <span className={paymentBadgeClass(paymentStatus)}>{paymentLabel}</span>
                      </td>
                      <td className="p-3">${getTotal(p).toFixed(2)}</td>
                      <td className="p-3">{p.paid_at || "-"}</td>
                      <td className="p-3">
                        <div
                          className="max-w-[280px] whitespace-pre-line break-words text-xs text-gray-600 leading-5"
                          title={String(p.decision_note || "")}
                        >
                          {compactNoteLines(p.decision_note).join("\n")}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs leading-5 text-gray-700">
                          <div>
                            <span className="font-semibold">Account ID:</span> {p.account_id || "-"}
                          </div>
                          <div>
                            <span className="font-semibold">Payment ID:</span> {p.payment_id || "-"}
                          </div>
                          <div>
                            <span className="font-semibold">Payment APV:</span> {p.payment_apv || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>
                      </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td className="p-6 text-center text-gray-500" colSpan={11}>
                        No payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-3 p-3 md:hidden">
            {pagedPayments.map((p) => {
              const paymentStatus = normalizeDecision(p.admin_decision, p.payment_state, p.state);
              const paymentLabel =
                paymentStatus === "approved"
                  ? "Approve payment"
                  : paymentStatus === "declined"
                    ? "Decline payment"
                    : "Waiting payment";

              return (
                <div key={p.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">Payment #{p.id}</div>
                      <div className="text-xs text-gray-500">
                        Order: {p.order_number ? `#${p.order_number}` : "-"}
                      </div>
                      <div className="text-xs text-gray-500 break-all">{p.user_email || "-"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${getTotal(p).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{p.paid_at || "-"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Method</div>
                      <div className="mt-1 font-medium text-gray-900">{p.method || "-"}</div>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Category</div>
                      <div className="mt-1 font-medium capitalize text-gray-900">{p.categories || "-"}</div>
                    </div>
                  </div>

                  <div>
                    <span className={paymentBadgeClass(paymentStatus)}>{paymentLabel}</span>
                  </div>

                  <div className="text-xs leading-5 text-gray-700 space-y-1">
                    <div>
                      <span className="font-semibold">Account ID:</span> {p.account_id || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Payment ID:</span> {p.payment_id || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Payment APV:</span> {p.payment_apv || "-"}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-gray-50 p-3 text-xs text-gray-600 whitespace-pre-line break-words leading-5">
                    {compactNoteLines(p.decision_note).join("\n") || "-"}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-gray-500">
                No payments found.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > PAGE_SIZE && (
        <PaginationNext
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={totalFiltered}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          enableKeyboardShortcuts
        />
      )}

      {editPayment && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold">Edit Payment #{editPayment.id}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Order #{editPayment.order_number || "-"} • {editPayment.user_email || "-"}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-gray-600">Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as Decision)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="approve">Approve payment</option>
                  <option value="decline">Decline payment</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 min-h-[90px]"
                  placeholder="Reason or note"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditPayment(null)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
                disabled={savingId === editPayment.id}
              >
                Cancel
              </button>
              <button
                onClick={() => void saveDecision()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={savingId === editPayment.id}
              >
                {savingId === editPayment.id ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
