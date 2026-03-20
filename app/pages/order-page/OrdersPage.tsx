import { useEffect, useMemo, useState } from "react";
import { Package, RefreshCw } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Pagination } from "../../components/Pagination";
import { ScrollableChipTabs } from "../../components/ScrollableChipTabs";
import type { OrderStatus } from "@/lib/order-status";
import { ORDER_STATUS_TABS, getStatusLabel } from "./orderStatusConfig";

type Order = {
  id: number;
  order_number: string;
  status: OrderStatus;
  has_payment_submission?: boolean;
  total: number;
  created_at: string;
  delivery_title?: string | null;
  delivery_message?: string | null;
  delivered_at?: string | null;
  reviewed_at?: string | null;
};

function getOrderStatusText(order: Order, language: "km" | "en"): string {
  if (order.status === "pending" && !order.has_payment_submission) {
    return language === "km" ? "រង់ចាំបញ្ជាក់ការទូទាត់" : "Awaiting Payment Confirmation";
  }
  return getStatusLabel(order.status, language);
}

function formatDate(value?: string | null, lang: "km" | "en" = "en"): string {
  if (!value) return lang === "km" ? "មិនមាន" : "No record";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(lang === "km" ? "km-KH" : undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OrdersPageProps {
  onNavigate: (page: string) => void;
  onOpenOrderDetail: (orderId: number | string) => void;
}

const ITEMS_PER_PAGE = 5;

export function OrdersPage({ onNavigate, onOpenOrderDetail }: OrdersPageProps) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user, loading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus>("pending");
  const [currentPage, setCurrentPage] = useState(1);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      onNavigate("login");
    }
  }, [user, loading, onNavigate]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/orders", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();

      if (res.status === 401) {
        onNavigate("login");
        return;
      }

      if (!res.ok) {
        setOrders([]);
        return;
      }

      setOrders((data.orders ?? []) as Order[]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
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

    orders.forEach((order) => {
      base[order.status] = (base[order.status] ?? 0) + 1;
    });

    return base;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => order.status === activeTab);
  }, [orders, activeTab]);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, orders.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {language === "km" ? "ការបញ្ជាទិញរបស់ខ្ញុំ" : "My Orders"}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {language === "km"
                ? "តាមដានការបញ្ជាទិញ និងការទូទាត់របស់អ្នក"
                : "Track your orders and payments"}
            </p>
          </div>

          <Button variant="outline" onClick={loadOrders} className="dark:border-gray-600 dark:text-gray-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === "km" ? "ធ្វើឡើងវិញ" : "Refresh"}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-8">
          <ScrollableChipTabs
            items={ORDER_STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return {
                key: tab.key,
                label: language === "km" ? tab.labelKm : tab.labelEn,
                count: statusCounts[tab.key] ?? 0,
                active: isActive,
                onClick: () => setActiveTab(tab.key),
                className: `flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-600 shadow"
                    : "bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-300 border-gray-200 hover:border-blue-400"
                }`,
                countClassName: `text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isActive
                    ? "bg-white/20 text-white border border-white/30"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                }`,
              };
            })}
          />
        </div>

        {loadingOrders ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-gray-600 dark:text-gray-400">
            {language === "km" ? "កំពុងផ្ទុក..." : "Loading..."}
          </div>
        ) : (
          <>
            {orders.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-gray-600 dark:text-gray-400">
                {language === "km" ? "មិនទាន់មានការបញ្ជាទិញ" : "No orders yet"}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-gray-600 dark:text-gray-400">
                {language === "km"
                  ? "មិនមានការបញ្ជាទិញនៅក្នុងស្ថានភាពនេះ"
                  : "No orders in this status yet"}
              </div>
            ) : (
              <div className="space-y-4">
                {pagedOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {language === "km" ? "លេខបញ្ជាទិញ" : "Order #"}{" "}
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {o.order_number}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(o.created_at, language === "km" ? "km" : "en")}
                        </div>
                      </div>

                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                        {getOrderStatusText(o, language === "km" ? "km" : "en")}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-gray-600 dark:text-gray-400">
                        <p className="text-sm">{language === "km" ? "សរុប" : "Total"}</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {formatPrice(o.total)}
                        </p>
                      </div>

                      <div className="text-gray-600 dark:text-gray-400">
                        <p className="text-sm">
                          {language === "km" ? "ការដឹកជញ្ជូន / ផ្ដល់" : "Delivery info"}
                        </p>
                        {o.delivery_message ? (
                          <div className="mt-1 text-gray-800 dark:text-gray-200">
                            <div className="font-semibold">
                              {o.delivery_title ||
                                (language === "km" ? "ព័ត៌មាន" : "Information")}
                            </div>
                            <p className="text-sm whitespace-pre-line">{o.delivery_message}</p>
                            {o.delivered_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                {language === "km" ? "បានផ្ញើ" : "Delivered"}:{" "}
                                {formatDate(o.delivered_at, language === "km" ? "km" : "en")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">
                            {language === "km"
                              ? "មិនទាន់មានព័ត៌មានដឹកជញ្ជូន"
                              : "No delivery notice yet"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-end md:justify-end">
                        <Button
                          onClick={() => onOpenOrderDetail(o.id)}
                          className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          {language === "km" ? "មើលលម្អិត" : "View detail"}
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
          </>
        )}

        <div className="mt-8">
          <Button variant="outline" onClick={() => onNavigate("courses")} className="dark:border-gray-600 dark:text-gray-300">
            {language === "km" ? "ត្រឡប់ទៅទិញបន្ថែម" : "Back to shopping"}
          </Button>
        </div>
      </div>
    </div>
  );
}
