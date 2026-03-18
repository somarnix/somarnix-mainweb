"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, RefreshCw, MessageCircle } from "lucide-react";
import { Pagination } from "@/app/components/Pagination";
import { ScrollableChipTabs } from "@/app/components/ScrollableChipTabs";
import { Button } from "@/app/components/ui/button";
import type { OrderStatus } from "@/lib/order-status";
import { ORDER_STATUS_TABS, getStatusLabel } from "@/app/pages/order-page/orderStatusConfig";

type SellerOrder = {
  id: number;
  order_number?: string | null;
  state: OrderStatus;
  total?: number | string | null;
  created_at?: string | null;
  user_email?: string | null;
  delivery_title?: string | null;
  delivery_message?: string | null;
  delivered_at?: string | null;
};

interface AdminOrdersSellerPageProps {
  onOpenChat: (orderId: number) => void;
  onOpenAdminOrders: () => void;
}

const ITEMS_PER_PAGE = 5;

function formatDate(value?: string | null): string {
  if (!value) return "No record";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toNumber(value?: number | string | null): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function stateBadgeClass(state: OrderStatus): string {
  if (state === "completed") {
    return "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700";
  }
  if (state === "approved" || state === "delivering") {
    return "inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700";
  }
  if (state === "cancelled" || state === "resolution") {
    return "inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700";
  }
  return "inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700";
}

export default function AdminOrdersSellerPage({
  onOpenChat,
  onOpenAdminOrders,
}: AdminOrdersSellerPageProps) {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus>("pending");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setOrders([]);
        setError(data?.error || "Failed to load orders");
        return;
      }
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch {
      setOrders([]);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const statusCounts = useMemo(() => {
    const base: Record<OrderStatus, number> = {
      pending: 0,
      approved: 0,
      delivering: 0,
      completed: 0,
      cancelled: 0,
      resolution: 0,
    };
    for (const order of orders) {
      base[order.state] = (base[order.state] ?? 0) + 1;
    }
    return base;
  }, [orders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => order.state === activeTab),
    [orders, activeTab]
  );
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, orders.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">Orders Seller</h1>
            </div>
            <p className="text-gray-600">Track all system orders and open chat in any status.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => void loadOrders()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button className="w-full sm:w-auto" variant="outline" onClick={onOpenAdminOrders}>
              Manage table
            </Button>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-xl bg-white p-3 shadow-sm sm:mb-8 sm:p-4">
          <ScrollableChipTabs
            items={ORDER_STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return {
                key: tab.key,
                label: tab.labelEn,
                count: statusCounts[tab.key] ?? 0,
                active: isActive,
                onClick: () => setActiveTab(tab.key),
                className: `flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                  isActive
                    ? "border-blue-600 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-400"
                }`,
                countClassName: `rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isActive ? "border border-white/30 bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                }`,
              };
            })}
          />
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-8 text-gray-600 shadow-sm">Loading...</div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 shadow-sm">{error}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-gray-600 shadow-sm">No orders in this status.</div>
        ) : (
          <div className="space-y-4">
            {pagedOrders.map((order) => (
              <div key={order.id} className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-sm text-gray-500">
                      Order #<span className="font-semibold text-gray-900">{order.order_number || order.id}</span>
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(order.created_at)}</div>
                    <div className="mt-2 text-xs text-gray-500">Buyer: {order.user_email || "-"}</div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Delivery info</p>
                    {order.delivery_message ? (
                      <div className="mt-1">
                        <div className="font-semibold text-gray-900">{order.delivery_title || "Information"}</div>
                        <p className="whitespace-pre-line text-sm text-gray-700">{order.delivery_message}</p>
                        {order.delivered_at ? (
                          <p className="mt-1 text-xs text-gray-500">Delivered: {formatDate(order.delivered_at)}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No delivery notice yet</p>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <span className={stateBadgeClass(order.state)}>{getStatusLabel(order.state, "en")}</span>
                    <div className="text-2xl font-bold text-blue-600">${toNumber(order.total).toFixed(2)}</div>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 sm:w-auto"
                      onClick={() => onOpenChat(order.id)}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Open chat
                    </Button>
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
        )}
      </div>
    </div>
  );
}
