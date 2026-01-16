import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
  subtotal: number;
  tax_amount: number;
  total: number;
  created_at: string;
};

type Item = {
  id: number;
  title: string;
  image_url: string | null;
  qty: number;
  unit_price: number;
  duration_label: string | null;
  device_label: string | null;
};

type Payment = {
  payment_id: string;
  purchase_id: string;
  paid_at: string;
  method: string;
} | null;

export function OrderDetailPage({
  orderId,
  onBack,
}: {
  orderId: number;
  onBack: () => void;
}) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [payment, setPayment] = useState<Payment>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();

        if (!res.ok) {
          setOrder(null);
          setItems([]);
          setPayment(null);
          return;
        }

        setOrder(data.order);
        setItems(data.items ?? []);
        setPayment(data.payment ?? null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-gray-600 dark:text-gray-400">
            {language === "km" ? "កំពុងផ្ទុក..." : "Loading..."}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === "km" ? "ត្រឡប់ក្រោយ" : "Back"}
            </Button>
            <div className="mt-4 text-gray-600 dark:text-gray-400">
              {language === "km" ? "រកមិនឃើញការបញ្ជាទិញ" : "Order not found"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === "km" ? "ត្រឡប់ក្រោយ" : "Back"}
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {language === "km" ? "ការបញ្ជាទិញ" : "Order"} #{order.order_number}
          </div>

          <div className="mt-2 text-gray-600 dark:text-gray-400">
            {language === "km" ? "ស្ថានភាព" : "Status"}:{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{order.status}</span>
          </div>

          <div className="mt-6 space-y-4">
            {items.map((it) => (
              <div key={it.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <img
                  src={it.image_url ?? "/placeholder.png"}
                  alt={it.title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white">{it.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {language === "km" ? "បរិមាណ" : "Qty"}: {it.qty}
                    {it.duration_label ? ` • ${it.duration_label}` : ""}
                    {it.device_label ? ` • ${it.device_label}` : ""}
                  </div>
                  <div className="mt-2 font-bold text-blue-600 dark:text-blue-400">
                    {formatPrice(it.unit_price * it.qty)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{language === "km" ? "សរុបរង" : "Subtotal"}</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{language === "km" ? "ពន្ធ" : "Tax"}</span>
              <span>{formatPrice(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
              <span>{language === "km" ? "សរុប" : "Total"}</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {language === "km" ? "ព័ត៌មានការទូទាត់" : "Payment Info"}
            </div>

            {payment ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <div>payment_id: <b>{payment.payment_id}</b></div>
                <div>purchase_id: <b>{payment.purchase_id}</b></div>
                <div>paid_at: <b>{payment.paid_at}</b></div>
                <div>method: <b>{payment.method}</b></div>
              </div>
            ) : (
              <div className="text-gray-600 dark:text-gray-400">
                {language === "km" ? "មិនទាន់មានការទូទាត់" : "No payment submitted yet"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
