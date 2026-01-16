import { useEffect, useState } from "react";
import { Package, RefreshCw } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { Button } from "../../components/ui/button";

type OrderStatus =
  | "pending"
  | "waiting_admin"
  | "approved"
  | "delivered"
  | "done"
  | "cancelled";

type Order = {
  id: number;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
};

function statusText(status: OrderStatus, language: "km" | "en") {
  const km: Record<OrderStatus, string> = {
    pending: "កំពុងរង់ចាំការទូទាត់",
    waiting_admin: "កំពុងរង់ចាំ Admin អនុម័ត",
    approved: "បានអនុម័ត",
    delivered: "បានផ្ញើរួច",
    done: "បានបញ្ចប់",
    cancelled: "បានបោះបង់",
  };
  const en: Record<OrderStatus, string> = {
    pending: "Pending payment",
    waiting_admin: "Waiting admin approval",
    approved: "Approved",
    delivered: "Delivered",
    done: "Done",
    cancelled: "Cancelled",
  };
  return language === "km" ? km[status] : en[status];
}

interface OrdersPageProps {
  onNavigate: (page: string) => void;

  // ✅ add this (so you can open detail)
  onOpenOrderDetail: (orderId: number) => void;
}

export function OrdersPage({ onNavigate, onOpenOrderDetail }: OrdersPageProps) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();

      if (!res.ok) {
        setOrders([]);
        return;
      }

      setOrders((data.orders ?? []) as Order[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

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

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-gray-600 dark:text-gray-400">
            {language === "km" ? "កំពុងផ្ទុក..." : "Loading..."}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-gray-600 dark:text-gray-400">
            {language === "km" ? "មិនមានការបញ្ជាទិញ" : "No orders yet"}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {language === "km" ? "លេខបញ្ជាទិញ" : "Order #"}:{" "}
                    <span className="font-medium text-gray-900 dark:text-white">{o.order_number}</span>
                  </div>

                  <div className="mt-2 text-gray-600 dark:text-gray-400">
                    {language === "km" ? "ស្ថានភាព" : "Status"}:{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {statusText(o.status, language === "km" ? "km" : "en")}
                    </span>
                  </div>

                  <div className="mt-2 text-gray-600 dark:text-gray-400">
                    {language === "km" ? "សរុប" : "Total"}:{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">{formatPrice(o.total)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => onOpenOrderDetail(o.id)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {language === "km" ? "មើលលម្អិត" : "View Detail"}
                </Button>
              </div>
            ))}
          </div>
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
